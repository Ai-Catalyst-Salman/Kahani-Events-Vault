export interface UploadProgressInfo {
  percent: number;
  loaded: number;
  total: number;
  speedBytesPerSec: number;
  formattedLoaded: string;
  formattedTotal: string;
  formattedSpeed: string;
  estimatedSecondsRemaining: number | null;
}

export interface R2UploadResult {
  success: boolean;
  fileKey?: string;
  publicUrl?: string;
  error?: string;
}

/**
 * Resolves the precise MIME type from file or extension to prevent browser
 * fallback to generic application/octet-stream which triggers forced download.
 */
export function getExactMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream" && file.type.length > 3) {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    default:
      return file.type || "application/octet-stream";
  }
}

/** Formats byte counts into readable strings (e.g. 14.8 MB) */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

/** Formats upload speed into human-readable rate (e.g. 3.2 MB/s) */
export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "Estimating...";
  const mbps = bytesPerSec / (1024 * 1024);
  if (mbps >= 1) return `${mbps.toFixed(1)} MB/s`;
  const kbps = bytesPerSec / 1024;
  return `${Math.round(kbps)} KB/s`;
}

/**
 * Uploads large files (35MB+) asynchronously to Cloudflare R2 using pre-signed S3 URLs.
 * Tracks granular upload speed, exact MBs transferred, and smoothly falls back
 * to server proxy if browser CORS restricts direct PUT.
 */
export async function uploadFileToR2(
  file: File,
  folder: "presentations" | "thumbnails" = "presentations",
  onProgress?: (progress: UploadProgressInfo) => void
): Promise<R2UploadResult> {
  const exactMimeType = getExactMimeType(file);

  // 1. Request presigned URL from backend route
  let presignRes: Response;
  try {
    presignRes = await fetch("/api/r2-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: exactMimeType,
        folder,
      }),
    });
  } catch (err: any) {
    throw new Error(err?.message || "Failed to connect to the upload service.");
  }

  if (!presignRes.ok) {
    const errorData = await presignRes.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload authorization failed with HTTP ${presignRes.status}`);
  }

  const { uploadUrl, fileKey, publicUrl } = await presignRes.json();
  if (!uploadUrl) {
    throw new Error("Cloudflare R2 pre-signed upload URL was not returned.");
  }

  // 2. Direct asynchronous binary PUT upload to Cloudflare R2
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", exactMimeType);
      xhr.setRequestHeader("Content-Disposition", "inline");

      let lastTime = performance.now();
      let lastLoaded = 0;
      let smoothedSpeed = 0;

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          const now = performance.now();
          const timeDiff = (now - lastTime) / 1000; // seconds

          if (timeDiff >= 0.25) {
            const loadedDiff = evt.loaded - lastLoaded;
            const instantSpeed = loadedDiff / timeDiff;
            smoothedSpeed = smoothedSpeed === 0 ? instantSpeed : smoothedSpeed * 0.7 + instantSpeed * 0.3;
            lastTime = now;
            lastLoaded = evt.loaded;
          }

          const percent = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
          const remainingBytes = Math.max(0, evt.total - evt.loaded);
          const estSec = smoothedSpeed > 0 ? Math.ceil(remainingBytes / smoothedSpeed) : null;

          onProgress?.({
            percent,
            loaded: evt.loaded,
            total: evt.total,
            speedBytesPerSec: smoothedSpeed,
            formattedLoaded: formatFileSize(evt.loaded),
            formattedTotal: formatFileSize(evt.total),
            formattedSpeed: formatSpeed(smoothedSpeed),
            estimatedSecondsRemaining: estSec,
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.({
            percent: 100,
            loaded: file.size,
            total: file.size,
            speedBytesPerSec: 0,
            formattedLoaded: formatFileSize(file.size),
            formattedTotal: formatFileSize(file.size),
            formattedSpeed: "Complete",
            estimatedSecondsRemaining: 0,
          });
          resolve();
        } else {
          reject(
            new Error(
              `Cloudflare R2 returned HTTP ${xhr.status}. Verify bucket permissions.`
            )
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error("CORS_OR_NETWORK_ERROR"));
      };

      xhr.send(file);
    });

    const finalPublicUrl = publicUrl || uploadUrl.split("?")[0];
    return {
      success: true,
      fileKey,
      publicUrl: finalPublicUrl,
    };
  } catch (directErr: any) {
    // If CORS or direct upload error occurs, transparently fall back to server-side streaming proxy
    if (directErr.message === "CORS_OR_NETWORK_ERROR" || directErr.message.includes("CORS")) {
      onProgress?.({
        percent: 50,
        loaded: Math.floor(file.size * 0.5),
        total: file.size,
        speedBytesPerSec: 0,
        formattedLoaded: formatFileSize(Math.floor(file.size * 0.5)),
        formattedTotal: formatFileSize(file.size),
        formattedSpeed: "Routing via server proxy...",
        estimatedSecondsRemaining: null,
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const serverRes = await fetch("/api/r2-upload", {
        method: "PUT",
        body: formData,
      });

      if (!serverRes.ok) {
        const errJson = await serverRes.json().catch(() => ({}));
        throw new Error(
          errJson.error || "Upload failed through server proxy. Please verify Cloudflare R2 credentials."
        );
      }

      const serverData = await serverRes.json();
      onProgress?.({
        percent: 100,
        loaded: file.size,
        total: file.size,
        speedBytesPerSec: 0,
        formattedLoaded: formatFileSize(file.size),
        formattedTotal: formatFileSize(file.size),
        formattedSpeed: "Complete",
        estimatedSecondsRemaining: 0,
      });

      return {
        success: true,
        fileKey: serverData.fileKey,
        publicUrl: serverData.publicUrl,
      };
    }
    throw directErr;
  }
}

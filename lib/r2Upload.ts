import {
  PRESENTATION_MAX_BYTES,
  extensionForUpload,
  maxBytesForFolder,
  mimeFromExtension,
  normalizeDeclaredMime,
  type UploadFolder,
} from "@/lib/security/uploadPolicy";

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
export function getExactMimeType(file: File): string | null {
  const fromName = mimeFromExtension(file.name);
  const declared = normalizeDeclaredMime(file.type);
  if (declared && declared !== "application/octet-stream") {
    if (!fromName || fromName === declared) return extensionForUpload("presentations", declared) || extensionForUpload("thumbnails", declared) ? declared : null;
    return null;
  }
  return fromName;
}

function clientMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return fallback;
  if (/secret|credential|stack trace|access key|service_role|BEGIN |eyJ/i.test(value)) return fallback;
  return value;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parent?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (parent?.aborted) controller.abort();
  else parent?.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (parent?.aborted) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("UPLOAD_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onAbort);
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
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
  folder: UploadFolder = "presentations",
  onProgress?: (progress: UploadProgressInfo) => void,
  options?: { signal?: AbortSignal }
): Promise<R2UploadResult> {
  const signal = options?.signal;
  const exactMimeType = getExactMimeType(file);
  if (!exactMimeType || !extensionForUpload(folder, exactMimeType)) {
    throw new Error("This file type is not allowed.");
  }
  if (file.size <= 0 || file.size > maxBytesForFolder(folder)) {
    throw new Error(
      folder === "thumbnails"
        ? "Cover images must be 8 MB or smaller."
        : "Presentations must be 80 MB or smaller."
    );
  }

  let presignRes: Response;
  try {
    presignRes = await fetchWithTimeout(
      "/api/r2-upload",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: exactMimeType,
          fileSize: file.size,
          folder,
        }),
      },
      20_000,
      signal
    );
  } catch (err) {
    if (isAbortError(err)) throw err;
    if (err instanceof Error && err.message === "UPLOAD_TIMEOUT") throw err;
    throw new Error("Failed to connect to the upload service.");
  }

  if (!presignRes.ok) {
    const errorData = await presignRes.json().catch(() => ({}));
    throw new Error(clientMessage(errorData.error, "Upload was rejected."));
  }

  const presignBody = await presignRes.json().catch(() => ({}));
  const uploadUrl = typeof presignBody.uploadUrl === "string" ? presignBody.uploadUrl : "";
  const fileKey = typeof presignBody.fileKey === "string" ? presignBody.fileKey : "";
  const uploadToken = typeof presignBody.uploadToken === "string" ? presignBody.uploadToken : "";
  if (!uploadUrl.startsWith("https://") || !fileKey || !uploadToken) {
    throw new Error("Upload could not be prepared.");
  }

  // 2. Direct asynchronous binary PUT upload to Cloudflare R2
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.timeout = folder === "thumbnails" ? 90_000 : 600_000;
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.setRequestHeader("Content-Disposition", "attachment");
      if (signal) {
        signal.addEventListener("abort", () => xhr.abort(), { once: true });
      }

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
          reject(new Error("DIRECT_UPLOAD_FAILED"));
        }
      };

      xhr.onerror = () => {
        reject(new Error("CORS_OR_NETWORK_ERROR"));
      };
      xhr.ontimeout = () => {
        reject(new Error("UPLOAD_TIMEOUT"));
      };
      xhr.onabort = () => {
        reject(new DOMException("Aborted", "AbortError"));
      };

      xhr.send(file);
    });

    const verifyRes = await fetchWithTimeout(
      "/api/r2-upload",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, uploadToken }),
      },
      30_000,
      signal
    );
    const verifyBody = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || typeof verifyBody.publicUrl !== "string") {
      throw new Error(clientMessage(verifyBody.error, "Uploaded file was rejected."));
    }

    return {
      success: true,
      fileKey,
      publicUrl: verifyBody.publicUrl,
    };
  } catch (directErr) {
    if (isAbortError(directErr)) throw directErr;
    const message = directErr instanceof Error ? directErr.message : "";
    if (message === "UPLOAD_TIMEOUT") {
      throw new Error("Upload timed out because the connection stalled. Please try again.");
    }
    if (message !== "CORS_OR_NETWORK_ERROR" && message !== "DIRECT_UPLOAD_FAILED") {
      throw new Error(clientMessage(message, "Upload failed. Please try again."));
    }
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

      const serverRes = await fetchWithTimeout(
        "/api/r2-upload",
        {
          method: "PUT",
          body: formData,
        },
        folder === "thumbnails" ? 90_000 : 600_000,
        signal
      );

      if (!serverRes.ok) {
        const errJson = await serverRes.json().catch(() => ({}));
        throw new Error(clientMessage(errJson.error, "Upload failed. Please try again."));
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

      if (typeof serverData.publicUrl !== "string") {
        throw new Error("Upload failed. Please try again.");
      }
      return {
        success: true,
        fileKey: serverData.fileKey,
        publicUrl: serverData.publicUrl,
      };
  }
}

export async function saveRemoteFile(url: string, filename: string, signal: AbortSignal): Promise<void> {
  const response = await fetch(url, { signal, referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error("Fetch failed");
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > PRESENTATION_MAX_BYTES) throw new Error("too_large");

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Fetch failed");
  const chunks: BlobPart[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > PRESENTATION_MAX_BYTES) {
      await reader.cancel();
      throw new Error("too_large");
    }
    chunks.push(value);
  }

  const blobUrl = URL.createObjectURL(new Blob(chunks));
  const anchor = document.createElement("a");
  const safeName = filename.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "presentation";
  anchor.href = blobUrl;
  anchor.download = safeName;
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

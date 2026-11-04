export const PRESENTATION_MAX_BYTES = 80 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PRESIGN_TTL_SECONDS = 600;

export type UploadFolder = "presentations" | "thumbnails";

const PRESENTATION_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function normalizeDeclaredMime(mime: unknown): string | null {
  if (typeof mime !== "string") return null;
  const lower = mime.toLowerCase().split(";")[0].trim();
  if (lower === "image/jpg") return "image/jpeg";
  return lower || null;
}

export function extensionForUpload(folder: UploadFolder, mime: string): string | null {
  const table = folder === "thumbnails" ? IMAGE_TYPES : PRESENTATION_TYPES;
  return table[mime] ?? null;
}

export function maxBytesForFolder(folder: UploadFolder): number {
  return folder === "thumbnails" ? IMAGE_MAX_BYTES : PRESENTATION_MAX_BYTES;
}

export const FILE_KEY_PATTERN =
  /^(presentations|thumbnails)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|ppt|pptx|png|jpe?g|webp|gif)$/i;

export const PENDING_KEY_PATTERN =
  /^pending\/(presentations|thumbnails)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.bin$/i;

export function mimeFromExtension(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
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
    case "gif":
      return "image/gif";
    default:
      return null;
  }
}

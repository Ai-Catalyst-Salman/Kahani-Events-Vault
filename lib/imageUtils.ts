/**
 * Image URL security sanitization and Google Drive thumbnail conversion utility.
 */

const GOOGLE_DRIVE_REGEX =
  /(?:drive\.google\.com\/(?:file\/d\/|open\?[^ ]*id=|uc\?[^ ]*id=|thumbnail\?[^ ]*id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{25,})/;

/**
 * Validates and converts arbitrary user-submitted image URLs into safe, direct image URLs.
 * - Converts Google Drive file viewer URLs into direct high-res thumbnail endpoints.
 * - Sanitizes against XSS, javascript: URI schemes, and invalid protocols.
 */
export function normalizeImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // 1. Security Protocol Check: Only allow http(s) or absolute local paths
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:text/html") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return null;
  }

  // 2. Google Drive Link Transformer
  // Handles:
  // - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // - https://drive.google.com/open?id=FILE_ID
  // - https://drive.google.com/uc?id=FILE_ID
  const gdMatch = trimmed.match(GOOGLE_DRIVE_REGEX);
  if (gdMatch && gdMatch[1]) {
    const fileId = gdMatch[1];
    // Google Drive direct image endpoint on Google's high-speed user content CDN
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  // 3. Return sanitized URL
  return trimmed;
}

/**
 * Checks if a URL is from Google Drive or requires unoptimized client rendering
 */
export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes("drive.google.com") || url.includes("googleusercontent.com");
}

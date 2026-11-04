import { safeImageUrl } from "@/lib/security/urls";

export function normalizeImageUrl(rawUrl?: string | null): string | null {
  return safeImageUrl(rawUrl);
}

/**
 * Checks if a URL is from Google Drive or requires unoptimized client rendering
 */
export function isGoogleDriveUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.includes("drive.google.com") || url.includes("googleusercontent.com");
}

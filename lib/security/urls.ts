const DANGEROUS_SCHEME =
  /^[\s\u0000-\u001F]*(javascript|data|vbscript|file|blob):/i;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const BLOCKED_IMAGE_EXT = /\.(svg|svgz|html|htm|xhtml|js|mjs|xml|php)(?:$|[?#])/i;

const DRIVE_FILE_ID =
  /(?:drive\.google\.com\/(?:file\/d\/|open\?[^ ]*id=|uc\?[^ ]*id=|thumbnail\?[^ ]*id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]{25,})/;

export const LIMITS = {
  themeName: 160,
  category: 80,
  keywords: 500,
  notes: 4000,
  url: 2000,
  persona: 160,
  venue: 160,
  eventValue: 80,
  color: 40,
  tag: 40,
  colors: 24,
  tags: 30,
  email: 254,
  passwordMin: 10,
  passwordMax: 72,
  categoryName: 80,
} as const;

export function safeInternalPath(value: string | null | undefined): string {
  if (!value) return "/";
  let path = value.trim();
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded.trim();
    } catch {
      return "/";
    }
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return "/";
  if (/[\u0000-\u001F\u007F\\:@]/.test(path) || path.includes("://")) return "/";
  return path;
}

export function passwordIssue(password: string): string | null {
  if (password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax) {
    return "Password must be between 10 and 72 characters.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include a letter and a number.";
  }
  return null;
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isNumericHost(host: string): boolean {
  if (host.includes(":")) return true;
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return true;
  const labels = host.split(".");
  return (
    labels.length === 4 &&
    labels.every((label) => /^\d+$/.test(label) || /^0x[0-9a-f]+$/i.test(label))
  );
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host || !host.includes(".") || host.includes("%") || isNumericHost(host)) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  return false;
}

const ASSET_HOST_SUFFIXES = ["r2.dev", "r2.cloudflarestorage.com", "drive.google.com", "docs.google.com"];

export function trustedAssetHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (ASSET_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) return true;
  const configured = (process.env.NEXT_PUBLIC_ASSET_HOST || "").toLowerCase();
  return Boolean(configured) && host === configured;
}

export function safeHttpsUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LIMITS.url) return null;
  if (DANGEROUS_SCHEME.test(trimmed) || CONTROL_CHARS.test(trimmed)) return null;
  if (!/^https:\/\//i.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname || isBlockedHost(url.hostname)) return null;
  return url.toString();
}

export function safeImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LIMITS.url) return null;
  if (DANGEROUS_SCHEME.test(trimmed)) return null;

  const drive = trimmed.match(DRIVE_FILE_ID);
  if (drive?.[1]) {
    return `https://lh3.googleusercontent.com/d/${drive[1]}`;
  }

  const https = safeHttpsUrl(trimmed);
  if (!https) return null;
  if (BLOCKED_IMAGE_EXT.test(https)) return null;
  return https;
}

export function safePresentationEmbed(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > LIMITS.url || DANGEROUS_SCHEME.test(trimmed)) return null;

  const drive = trimmed.match(
    /drive\.google\.com\/(?:file\/d\/|open\?[^ ]*id=)([a-zA-Z0-9_-]{25,})/
  );
  if (drive?.[1]) {
    return `https://drive.google.com/file/d/${drive[1]}/preview`;
  }

  const https = safeHttpsUrl(trimmed);
  if (!https) return null;

  let url: URL;
  try {
    url = new URL(https);
  } catch {
    return null;
  }

  const path = url.pathname.toLowerCase();
  if (path.endsWith(".pdf")) {
    return trustedAssetHost(url.hostname) ? url.toString() : null;
  }
  if ((path.endsWith(".ppt") || path.endsWith(".pptx")) && trustedAssetHost(url.hostname)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url.toString())}`;
  }
  return null;
}

type TextResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

export function readText(
  value: unknown,
  max: number,
  field: string,
  required = false
): TextResult {
  if (value == null || value === "") {
    return required
      ? { ok: false, error: `${field} is required.` }
      : { ok: true, value: null };
  }
  if (typeof value !== "string") return { ok: false, error: `${field} is invalid.` };

  const cleaned = value.replace(CONTROL_CHARS, "").trim();
  if (!cleaned) {
    return required
      ? { ok: false, error: `${field} is required.` }
      : { ok: true, value: null };
  }
  if (cleaned.length > max) return { ok: false, error: `${field} is too long.` };
  return { ok: true, value: cleaned };
}

export function readStringList(
  value: unknown,
  itemMax: number,
  listMax: number,
  field: string
): { ok: true; value: string[] } | { ok: false; error: string } {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  if (!Array.isArray(value) && typeof value !== "string" && value != null) {
    return { ok: false, error: `${field} is invalid.` };
  }

  const items: string[] = [];
  for (const entry of source) {
    if (typeof entry !== "string") return { ok: false, error: `${field} is invalid.` };
    const cleaned = entry.replace(CONTROL_CHARS, "").trim();
    if (!cleaned) continue;
    if (cleaned.length > itemMax) return { ok: false, error: `${field} is too long.` };
    if (!items.includes(cleaned)) items.push(cleaned);
    if (items.length > listMax) return { ok: false, error: `${field} has too many entries.` };
  }
  return { ok: true, value: items };
}

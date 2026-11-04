import { createHmac, timingSafeEqual } from "crypto";
import { PRESIGN_TTL_SECONDS, type UploadFolder } from "@/lib/security/uploadPolicy";

export type UploadGrant = {
  key: string;
  uid: string;
  mime: string;
  folder: UploadFolder;
  size: number;
  exp: number;
};

function secret(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (value.length < 20) throw new Error("Upload signing is not configured.");
  return value;
}

export function signUploadGrant(grant: Omit<UploadGrant, "exp">): string {
  const payload: UploadGrant = {
    ...grant,
    exp: Date.now() + PRESIGN_TTL_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function readUploadGrant(token: unknown): { grant: UploadGrant; expired: boolean } | null {
  if (typeof token !== "string" || token.length < 20 || token.length > 4000) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/.test(sig)) return null;

  let expected: string;
  try {
    expected = createHmac("sha256", secret()).update(body).digest("hex");
  } catch {
    return null;
  }
  const actual = Buffer.from(sig);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UploadGrant;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.key !== "string" || typeof parsed.uid !== "string" || typeof parsed.mime !== "string") return null;
    if (typeof parsed.size !== "number" || typeof parsed.exp !== "number") return null;
    if (parsed.folder !== "thumbnails" && parsed.folder !== "presentations") return null;
    return { grant: parsed, expired: parsed.exp < Date.now() };
  } catch {
    return null;
  }
}

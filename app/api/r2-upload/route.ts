import { apiError, apiJson, readJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin } from "@/lib/auth/requireAdmin";
import { allowRequest } from "@/lib/security/rateLimit";
import { sniffUpload } from "@/lib/security/sniff";
import { readUploadGrant, signUploadGrant } from "@/lib/security/uploadToken";
import {
  PENDING_KEY_PATTERN,
  PRESIGN_TTL_SECONDS,
  extensionForUpload,
  maxBytesForFolder,
  normalizeDeclaredMime,
  type UploadFolder,
} from "@/lib/security/uploadPolicy";
import { safeHttpsUrl } from "@/lib/security/urls";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getR2Endpoint(): string {
  const raw = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  if (!raw) return "https://auto.r2.cloudflarestorage.com";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      return `https://${url.hostname}`;
    } catch {
      // Fall through to the account-id form.
    }
  }
  const cleanId = raw.replace(/^https?:\/\//, "").split(".")[0].replace(/[^a-zA-Z0-9-]/g, "");
  return `https://${cleanId}.r2.cloudflarestorage.com`;
}

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

const R2_BUCKET = process.env.R2_BUCKET_NAME || "kahani-vault";

function publicObjectUrl(fileKey: string): string | null {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!base) return null;
  return safeHttpsUrl(`${base}/${fileKey}`);
}

function folderFrom(value: unknown): UploadFolder | null {
  if (value === "thumbnails" || value === "presentations") return value;
  return null;
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  const stream = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof stream.transformToByteArray === "function") {
    return Buffer.from(await stream.transformToByteArray());
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`upload:presign:${auth.userId}`, 30, 60_000)) {
      return apiError("Too many upload requests. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 16_384);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid" || !body || typeof body !== "object") return apiError("Invalid request.", 400);

    const record = body as Record<string, unknown>;
    const folder = folderFrom(record.folder ?? "presentations");
    const mime = normalizeDeclaredMime(record.fileType);
    const fileSize = record.fileSize;
    const fileName = record.fileName;

    if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 240) {
      return apiError("A valid file name is required.", 400);
    }
    if (fileName.includes("\0") || fileName.includes("/") || fileName.includes("\\")) {
      return apiError("File name is not allowed.", 400);
    }
    if (!folder || !mime) return apiError("This file type is not allowed.", 400);

    const extension = extensionForUpload(folder, mime);
    if (!extension) return apiError("This file type is not allowed.", 400);
    if (typeof fileSize !== "number" || !Number.isInteger(fileSize) || fileSize <= 0) {
      return apiError("File size is required.", 400);
    }
    if (fileSize > maxBytesForFolder(folder)) {
      return apiError(
        folder === "thumbnails"
          ? "Cover images must be 8 MB or smaller."
          : "Presentations must be 80 MB or smaller.",
        413
      );
    }

    const publicBase = publicObjectUrl("presentations/placeholder.pdf");
    if (!publicBase) return apiError("File storage is not configured.", 500);

    const fileKey = `pending/${folder}/${randomUUID()}.bin`;
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      ContentType: "application/octet-stream",
      ContentLength: fileSize,
      ContentDisposition: "attachment",
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: PRESIGN_TTL_SECONDS });
    const uploadToken = signUploadGrant({
      key: fileKey,
      uid: auth.userId,
      mime,
      folder,
      size: fileSize,
    });
    return apiJson({ success: true, uploadUrl, fileKey, uploadToken });
  } catch (err) {
    console.error("[api/r2-upload POST]", err instanceof Error ? err.name : "Error");
    return apiError("Could not prepare the upload.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`upload:verify:${auth.userId}`, 30, 60_000)) {
      return apiError("Too many upload requests. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 16_384);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid" || !body || typeof body !== "object") return apiError("Invalid request.", 400);
    const record = body as { fileKey?: unknown; uploadToken?: unknown };
    const fileKey = record.fileKey;
    if (typeof fileKey !== "string" || !PENDING_KEY_PATTERN.test(fileKey)) {
      return apiError("Invalid file reference.", 400);
    }

    const parsed = readUploadGrant(record.uploadToken);
    if (!parsed || parsed.grant.uid !== auth.userId || parsed.grant.key !== fileKey) {
      return apiError("Invalid file reference.", 400);
    }
    if (parsed.expired || parsed.grant.size > maxBytesForFolder(parsed.grant.folder)) {
      await deleteObject(fileKey);
      return apiError("Upload expired. Please try again.", 400);
    }

    const folder = parsed.grant.folder;
    const expectedExt = extensionForUpload(folder, parsed.grant.mime);
    if (!expectedExt || !fileKey.startsWith(`pending/${folder}/`)) {
      await deleteObject(fileKey);
      return apiError("This file type is not allowed.", 400);
    }

    const head = await getR2Client().send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: fileKey })
    );
    const declared = head.ContentLength;
    if (declared == null || declared !== parsed.grant.size || declared > maxBytesForFolder(folder)) {
      await deleteObject(fileKey);
      return apiError("Uploaded file could not be verified.", 400);
    }

    const object = await getR2Client().send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        Range: "bytes=0-262143",
      })
    );

    const sample = await bodyToBuffer(object.Body);
    const sniffed = sniffUpload(folder, sample);
    if (!sniffed || sniffed.ext !== expectedExt || sniffed.mime !== parsed.grant.mime) {
      await deleteObject(fileKey);
      return apiError("Uploaded file content does not match an allowed type.", 400);
    }

    const finalKey = `${folder}/${randomUUID()}.${sniffed.ext}`;
    const publicUrl = publicObjectUrl(finalKey);
    if (!publicUrl) {
      await deleteObject(fileKey);
      return apiError("File storage is not configured.", 500);
    }

    await getR2Client().send(
      new CopyObjectCommand({
        Bucket: R2_BUCKET,
        CopySource: `${R2_BUCKET}/${fileKey}`,
        Key: finalKey,
        ContentType: sniffed.mime,
        ContentDisposition: "inline",
        MetadataDirective: "REPLACE",
      })
    );
    try {
      await deleteObject(fileKey);
    } catch {
      // The published object is already stored with the verified type.
    }

    return apiJson({ success: true, fileKey: finalKey, publicUrl });
  } catch (err) {
    console.error("[api/r2-upload PATCH]", err instanceof Error ? err.name : "Error");
    return apiError("Could not verify the uploaded file.", 400);
  }
}

async function deleteObject(fileKey: string) {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: fileKey }));
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`upload:proxy:${auth.userId}`, 10, 60_000)) {
      return apiError("Too many upload requests. Wait a moment and try again.", 429);
    }

    const declaredLength = request.headers.get("content-length");
    const length = Number(declaredLength || 0);
    if (!declaredLength || !Number.isFinite(length) || length <= 0 || length > PRESENTATION_PROXY_CEILING) {
      return apiError("File exceeds the size limit.", 413);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = folderFrom(formData.get("folder") || "presentations");
    if (!(file instanceof File) || !folder) return apiError("No file provided.", 400);
    if (file.size <= 0 || file.size > maxBytesForFolder(folder)) {
      return apiError("File exceeds the size limit.", 413);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffUpload(folder, bytes);
    if (!sniffed) return apiError("This file type is not allowed.", 400);

    const fileKey = `${folder}/${randomUUID()}.${sniffed.ext}`;
    const publicUrl = publicObjectUrl(fileKey);
    if (!publicUrl) return apiError("File storage is not configured.", 500);

    await getR2Client().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        Body: bytes,
        ContentType: sniffed.mime,
        ContentLength: bytes.byteLength,
        ContentDisposition: "inline",
      })
    );

    return apiJson({ success: true, fileKey, publicUrl });
  } catch (err) {
    console.error("[api/r2-upload PUT]", err instanceof Error ? err.name : "Error");
    return apiError("Could not upload the file.", 500);
  }
}

const PRESENTATION_PROXY_CEILING = 86 * 1024 * 1024;

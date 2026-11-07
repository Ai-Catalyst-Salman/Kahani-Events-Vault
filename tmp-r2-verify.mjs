import { readFileSync } from "fs";
import { crc32 } from "zlib";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  env[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const raw = (env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const endpoint = "https://" + raw.replace(/[^a-zA-Z0-9-]/g, "") + ".r2.cloudflarestorage.com";
const bucket = env.R2_BUCKET_NAME || "kahani-vault";

function clientWith(extra) {
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
    },
    ...extra,
  });
}

function crc32b64(buf) {
  const value = crc32(buf) >>> 0;
  const bytes = Buffer.alloc(4);
  bytes.writeUInt32BE(value);
  return bytes.toString("base64");
}

const big = Buffer.alloc(300 * 1024, 0x61);
big.write("%PDF-1.7\n", 0);
const key = "pending/presentations/diag-big-" + Date.now() + ".bin";

const defaultClient = clientWith({});
const command = new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  ContentType: "application/octet-stream",
  ContentLength: big.length,
  ContentDisposition: "attachment",
});
const url = await getSignedUrl(defaultClient, command, { expiresIn: 120 });
const parsed = new URL(url);
const checksumParam = parsed.searchParams.get("x-amz-checksum-crc32");
console.log(
  JSON.stringify({
    checksumMatchesEmpty: checksumParam === crc32b64(Buffer.alloc(0)),
    checksumMatchesBody: checksumParam === crc32b64(big),
    bodyBytes: big.length,
  })
);

const put = await fetch(url, {
  method: "PUT",
  headers: {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": "attachment",
  },
  body: big,
});
console.log(JSON.stringify({ putStatus: put.status, cors: put.headers.get("access-control-allow-origin") }));
if (!put.ok) {
  const text = await put.text();
  const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1] || "";
  console.log(JSON.stringify({ code }));
  process.exit(0);
}

try {
  const head = await defaultClient.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  console.log(JSON.stringify({ headLength: head.ContentLength }));
} catch (err) {
  console.log(JSON.stringify({ headError: err.name, headMsg: String(err.message || "").slice(0, 160) }));
}

try {
  const object = await defaultClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-262143" })
  );
  const bytes = await object.Body.transformToByteArray();
  console.log(JSON.stringify({ rangeBytes: bytes.byteLength, rangeStatus: object.$metadata.httpStatusCode }));
} catch (err) {
  console.log(JSON.stringify({ rangeError: err.name, rangeMsg: String(err.message || "").slice(0, 240) }));
}

const safeClient = clientWith({
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
try {
  const object = await safeClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-262143" })
  );
  const bytes = await object.Body.transformToByteArray();
  console.log(JSON.stringify({ safeRangeBytes: bytes.byteLength }));
} catch (err) {
  console.log(JSON.stringify({ safeRangeError: err.name, safeRangeMsg: String(err.message || "").slice(0, 240) }));
}

try {
  await defaultClient.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: key + ".copy",
      ContentType: "application/pdf",
      ContentDisposition: "inline",
      MetadataDirective: "REPLACE",
    })
  );
  console.log(JSON.stringify({ copy: "ok" }));
  await defaultClient.send(new DeleteObjectCommand({ Bucket: bucket, Key: key + ".copy" }));
} catch (err) {
  console.log(JSON.stringify({ copyError: err.name, copyMsg: String(err.message || "").slice(0, 240) }));
}

await defaultClient.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
console.log("cleaned");

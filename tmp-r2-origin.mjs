import { readFileSync } from "fs";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
const client = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
  },
});

const body = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const key = "pending/presentations/diag-origin-" + Date.now() + ".bin";
const command = new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  ContentType: "application/octet-stream",
  ContentLength: body.length,
});
const url = await getSignedUrl(client, command, { expiresIn: 120 });
const parsed = new URL(url);
console.log(
  JSON.stringify({
    host: parsed.host,
    pathStyle: parsed.pathname.includes("/" + bucket + "/"),
    signedHeaders: parsed.searchParams.get("X-Amz-SignedHeaders"),
    hasChecksum: [...parsed.searchParams.keys()].some((name) => name.toLowerCase().includes("checksum")),
  })
);

for (const origin of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Origin: origin,
      "Content-Type": "application/octet-stream",
    },
    body,
  });
  console.log(
    JSON.stringify({
      origin,
      status: res.status,
      allowOrigin: res.headers.get("access-control-allow-origin"),
      allowHeaders: res.headers.get("access-control-allow-headers"),
    })
  );
  if (!res.ok) {
    const text = await res.text();
    console.log(JSON.stringify({ code: text.match(/<Code>([^<]+)<\/Code>/)?.[1] || text.slice(0, 120) }));
  }
}

await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});
console.log("cleaned");

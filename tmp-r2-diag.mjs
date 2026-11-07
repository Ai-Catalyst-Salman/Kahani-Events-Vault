import { readFileSync } from "fs";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const raw = (env.CLOUDFLARE_ACCOUNT_ID || "").trim();
let endpoint = "https://auto.r2.cloudflarestorage.com";
if (raw.startsWith("http")) endpoint = "https://" + new URL(raw).hostname;
else if (raw) endpoint = "https://" + raw.replace(/[^a-zA-Z0-9-]/g, "") + ".r2.cloudflarestorage.com";

const bucket = env.R2_BUCKET_NAME || "kahani-vault";
const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
  },
});

const body = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const key = "pending/presentations/diag-" + Date.now() + ".bin";
const command = new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  ContentType: "application/octet-stream",
  ContentLength: body.length,
  ContentDisposition: "attachment",
});
const url = await getSignedUrl(client, command, { expiresIn: 120 });
const u = new URL(url);
const queryNames = [...u.searchParams.keys()].filter((name) => !/signature|credential|security-token/i.test(name));
console.log(
  JSON.stringify(
    {
      endpointHost: new URL(endpoint).host,
      urlHost: u.host,
      urlLength: url.length,
      signedHeaders: u.searchParams.get("X-Amz-SignedHeaders"),
      queryNames,
      bucketSet: Boolean(bucket),
      keyIdSet: Boolean(env.R2_ACCESS_KEY_ID),
      publicHost: (() => {
        try {
          return new URL(env.R2_PUBLIC_URL).host;
        } catch {
          return "invalid";
        }
      })(),
    },
    null,
    2
  )
);

const res = await fetch(url, {
  method: "PUT",
  headers: {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": "attachment",
  },
  body,
});
const text = await res.text();
const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1] || "";
const msg = text.match(/<Message>([^<]+)<\/Message>/)?.[1] || "";
console.log(JSON.stringify({ putStatus: res.status, code, msg: msg.slice(0, 220) }));

if (res.ok) {
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  console.log(JSON.stringify({ contentLength: head.ContentLength, contentType: head.ContentType }));
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("cleaned");
}

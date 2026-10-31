import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Resolve Cloudflare R2 endpoint safely even if user stored a full URL in CLOUDFLARE_ACCOUNT_ID
function getR2Endpoint(): string {
  const raw = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  if (!raw) return "https://auto.r2.cloudflarestorage.com";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const url = new URL(raw);
      return `https://${url.hostname}`;
    } catch {
      // Fallback below
    }
  }
  const cleanId = raw.replace(/^https?:\/\//, "").split(".")[0];
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
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

/**
 * Helper to authenticate user and verify admin role via AdminClient (bypassing RLS recursion)
 */
async function verifyAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "Unauthorized: Please sign in.", status: 401, user: null, adminSupabase: null };
  }

  // Use service role admin client to avoid RLS recursion / query blocking on profiles table
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profile as any)?.role !== "admin") {
    return { authorized: false, error: "Forbidden: Admin privileges required.", status: 403, user: null, adminSupabase: null };
  }

  return { authorized: true, user, adminSupabase, status: 200, error: null };
}

/**
 * POST /api/r2-upload: Generates a presigned PUT URL for direct browser-to-R2 upload
 */
export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized || !auth.adminSupabase) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const {
      fileName,
      fileType,
      folder = "presentations",
      title,
      category,
      tags,
      createRecord = false,
    } = body as {
      fileName: string;
      fileType: string;
      folder?: string;
      title?: string;
      category?: string;
      tags?: string[];
      createRecord?: boolean;
    };

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are mandatory." },
        { status: 400 }
      );
    }

    const cleanFolder = folder === "thumbnails" ? "thumbnails" : "presentations";
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "bin";
    const fileKey = `${cleanFolder}/${randomUUID()}.${fileExtension}`;

    const r2Client = getR2Client();
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileKey,
      ContentType: fileType,
      ContentDisposition: "inline",
      ...( { ResponseContentDisposition: "inline" } as any ),
    });

    const uploadUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: 900 });
    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${fileKey}` : null;

    let themeId: string | null = null;
    if (createRecord && title && category) {
      const { data: theme, error: dbError } = await auth.adminSupabase
        .from("event_themes")
        .insert({
          title,
          category,
          tags: Array.isArray(tags) ? tags : [],
          r2_file_key: fileKey,
          thumbnail_url: publicUrl,
        })
        .select()
        .single();

      if (dbError) {
        console.error("[api/r2-upload] Supabase insertion error:", dbError);
        return NextResponse.json(
          { error: `Database error: ${dbError.message}` },
          { status: 500 }
        );
      }
      themeId = theme?.id || null;
    }

    return NextResponse.json({
      success: true,
      uploadUrl,
      fileKey,
      publicUrl,
      themeId,
    });
  } catch (err: any) {
    console.error("[api/r2-upload POST] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error occurred while preparing Cloudflare R2 upload." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/r2-upload: Direct server-side upload fallback (bypasses browser CORS if R2 bucket lacks CORS headers)
 */
export async function PUT(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "presentations";

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data." }, { status: 400 });
    }

    const cleanFolder = folder === "thumbnails" ? "thumbnails" : "presentations";
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const fileKey = `${cleanFolder}/${randomUUID()}.${fileExtension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const r2Client = getR2Client();

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        ContentDisposition: "inline",
        ...( { ResponseContentDisposition: "inline" } as any ),
      })
    );

    const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${fileKey}` : null;

    return NextResponse.json({
      success: true,
      fileKey,
      publicUrl,
    });
  } catch (err: any) {
    console.error("[api/r2-upload PUT] Server upload fallback error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload file to Cloudflare R2." },
      { status: 500 }
    );
  }
}

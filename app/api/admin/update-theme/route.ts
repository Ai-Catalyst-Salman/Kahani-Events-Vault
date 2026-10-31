import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeImageUrl } from "@/lib/imageUtils";

export async function PATCH(request: Request) {
  try {
    // 1. Verify admin session
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if ((profile as any)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // 2. Parse payload
    const body = await request.json();
    const {
      id,
      theme_name,
      category,
      keywords,
      theme_link,
      executed_ppts_link,
      client_persona,
      color_palette,
      total_event_value,
      ideal_venue,
      launch_status,
      material_download_link,
      additional_notes,
      thumbnail_url,
      tags,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Theme ID is required." }, { status: 400 });
    }
    if (!theme_name || !category) {
      return NextResponse.json(
        { error: "Theme Name and Category are required." },
        { status: 400 }
      );
    }

    // 3. Update using Admin client
    const { data: theme, error: dbError } = await adminSupabase
      .from("event_themes")
      .update({
        theme_name,
        title: theme_name,
        category,
        keywords: keywords || null,
        theme_link: theme_link || null,
        executed_ppts_link: executed_ppts_link || null,
        client_persona: client_persona || null,
        color_palette: Array.isArray(color_palette)
          ? color_palette
          : color_palette
          ? color_palette.split(",").map((c: string) => c.trim()).filter(Boolean)
          : [],
        total_event_value: total_event_value || null,
        ideal_venue: ideal_venue || null,
        launch_status: launch_status || null,
        material_download_link: material_download_link || null,
        additional_notes: additional_notes || null,
        thumbnail_url: normalizeImageUrl(thumbnail_url) || null,
        tags: Array.isArray(tags)
          ? tags
          : tags
          ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [],
      })
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, theme });
  } catch (err: any) {
    console.error("[api/admin/update-theme] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

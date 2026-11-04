import { apiError, apiJson, readJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin } from "@/lib/auth/requireAdmin";
import { allowRequest } from "@/lib/security/rateLimit";
import { fieldError, parseThemeWrite, resolveThemeCategory } from "@/lib/security/themeInput";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`theme:update:${auth.userId}`, 30, 60_000)) {
      return apiError("Too many theme updates. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 100_000);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid") return apiError("Invalid request.", 400);

    const parsed = parseThemeWrite(body, true);
    if (!parsed.ok) return apiError(fieldError(parsed), 400);
    if (!parsed.id) return apiError("A valid theme id is required.", 400);

    const { data: existing } = await auth.adminSupabase
      .from("event_themes")
      .select("id")
      .eq("id", parsed.id)
      .maybeSingle();
    if (!existing) return apiError("Theme not found.", 404);

    const categoryId = await resolveThemeCategory(auth.adminSupabase, parsed.value.category);
    if (!categoryId) return apiError("Category is not recognized.", 400);

    const { data: theme, error } = await auth.adminSupabase
      .from("event_themes")
      .update({
        theme_name: parsed.value.theme_name,
        title: parsed.value.theme_name,
        category: parsed.value.category,
        category_id: categoryId,
        keywords: parsed.value.keywords,
        theme_link: parsed.value.theme_link,
        executed_ppts_link: parsed.value.executed_ppts_link,
        client_persona: parsed.value.client_persona,
        color_palette: parsed.value.color_palette,
        total_event_value: parsed.value.total_event_value,
        ideal_venue: parsed.value.ideal_venue,
        launch_status: parsed.value.launch_status,
        material_download_link: parsed.value.material_download_link,
        additional_notes: parsed.value.additional_notes,
        thumbnail_url: parsed.value.thumbnail_url,
        tags: parsed.value.tags,
      })
      .eq("id", parsed.id)
      .select()
      .maybeSingle();

    if (error || !theme) {
      console.error("[api/admin/update-theme]", error?.code || "update_failed");
      return apiError("Could not update the theme.", 500);
    }

    return apiJson({ success: true, theme });
  } catch (err) {
    console.error("[api/admin/update-theme]", err instanceof Error ? err.name : "Error");
    return apiError("Could not update the theme.", 500);
  }
}

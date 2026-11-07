import { apiError, apiJson, readJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin } from "@/lib/auth/requireAdmin";
import { allowRequest } from "@/lib/security/rateLimit";
import { isUuid } from "@/lib/security/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`theme:delete:${auth.userId}`, 30, 60_000)) {
      return apiError("Too many delete requests. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 8_192);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid") return apiError("Invalid request.", 400);
    const rawId = body && typeof body === "object" ? (body as { id?: unknown }).id : null;
    const id = typeof rawId === "string" ? rawId.trim() : rawId;
    if (!isUuid(id)) return apiError("A valid theme id is required.", 400);

    const { data: removed, error } = await auth.adminSupabase
      .from("event_themes")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      console.error("[api/admin/delete-theme]", error.code);
      return apiError("Could not delete the theme.", 500);
    }
    if (!removed || removed.length === 0) return apiError("Theme not found.", 404);

    return apiJson({ success: true });
  } catch (err) {
    console.error("[api/admin/delete-theme]", err instanceof Error ? err.name : "Error");
    return apiError("Could not delete the theme.", 500);
  }
}

export async function DELETE(request: Request) {
  return POST(request);
}

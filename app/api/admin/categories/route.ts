import { apiError, apiJson, readJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin, requireUserId } from "@/lib/auth/requireAdmin";
import { allowRequest } from "@/lib/security/rateLimit";
import { LIMITS, isUuid, readText } from "@/lib/security/urls";
import { fieldError } from "@/lib/security/themeInput";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireUserId();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("theme_categories")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("[api/admin/categories GET]", error.code);
      return apiError("Could not load categories.", 500);
    }

    return apiJson({ categories: data ?? [] });
  } catch (err) {
    console.error("[api/admin/categories GET]", err instanceof Error ? err.name : "Error");
    return apiError("Could not load categories.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`category:create:${auth.userId}`, 20, 60_000)) {
      return apiError("Too many category updates. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 8_192);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid") return apiError("Invalid request.", 400);
    const name = readText(
      body && typeof body === "object" ? (body as { name?: unknown }).name : null,
      LIMITS.categoryName,
      "Category name",
      true
    );
    if (!name.ok || !name.value) return apiError(fieldError(name), 400);

    const { data, error } = await auth.adminSupabase
      .from("theme_categories")
      .insert({ name: name.value })
      .select("id, name, created_at")
      .maybeSingle();

    if (error || !data) {
      console.error("[api/admin/categories POST]", error?.code || "insert_failed");
      return apiError(error?.code === "23505" ? "That category already exists." : "Could not save the category.", 400);
    }

    return apiJson({ success: true, category: data });
  } catch (err) {
    console.error("[api/admin/categories POST]", err instanceof Error ? err.name : "Error");
    return apiError("Could not save the category.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`category:delete:${auth.userId}`, 20, 60_000)) {
      return apiError("Too many category updates. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 8_192);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid") return apiError("Invalid request.", 400);
    const id = body && typeof body === "object" ? (body as { id?: unknown }).id : null;
    if (!isUuid(id)) return apiError("A valid category id is required.", 400);

    const { data: existing } = await auth.adminSupabase
      .from("theme_categories")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return apiError("Category not found.", 404);

    const { error } = await auth.adminSupabase.from("theme_categories").delete().eq("id", id);
    if (error) {
      console.error("[api/admin/categories DELETE]", error.code);
      return apiError("Could not delete the category.", 500);
    }

    return apiJson({ success: true });
  } catch (err) {
    console.error("[api/admin/categories DELETE]", err instanceof Error ? err.name : "Error");
    return apiError("Could not delete the category.", 500);
  }
}

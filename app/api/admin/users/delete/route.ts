import { apiError, apiJson, readJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin } from "@/lib/auth/requireAdmin";
import { guardTeamChange } from "@/lib/auth/teamMembers";
import { allowRequest } from "@/lib/security/rateLimit";
import { isUuid } from "@/lib/security/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`user:delete:${auth.userId}`, 10, 60_000)) {
      return apiError("Too many removals. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 4_096);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid" || !body || typeof body !== "object") return apiError("Invalid request.", 400);
    const record = body as Record<string, unknown>;

    const id = record.id;
    if (!isUuid(id)) return apiError("A valid member is required.", 400);

    const blocked = await guardTeamChange(auth.adminSupabase, auth.userId, id, "delete");
    if (blocked) return apiError(blocked, 400);

    const { error: authError } = await auth.adminSupabase.auth.admin.deleteUser(id);
    if (authError && !/not found/i.test(authError.message || "")) {
      console.error("[api/admin/users/delete]", authError.status || "delete_failed");
      return apiError("Could not remove this member.", 400);
    }

    const { error: profileError } = await auth.adminSupabase.from("profiles").delete().eq("id", id);
    if (profileError) {
      console.error("[api/admin/users/delete]", profileError.code);
      return apiError("Could not remove this member.", 500);
    }

    return apiJson({ success: true });
  } catch (err) {
    console.error("[api/admin/users/delete]", err instanceof Error ? err.name : "Error");
    return apiError("Could not remove this member.", 500);
  }
}

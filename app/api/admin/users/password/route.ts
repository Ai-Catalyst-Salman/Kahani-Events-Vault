import { apiError, apiJson, readJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin } from "@/lib/auth/requireAdmin";
import { allowRequest } from "@/lib/security/rateLimit";
import { isUuid, passwordIssue } from "@/lib/security/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`user:password:${auth.userId}`, 8, 60_000)) {
      return apiError("Too many password updates. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 8_192);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid" || !body || typeof body !== "object") return apiError("Invalid request.", 400);
    const record = body as Record<string, unknown>;

    const id = record.id;
    const password = typeof record.password === "string" ? record.password : "";
    if (!isUuid(id)) return apiError("A valid member is required.", 400);
    const passwordProblem = passwordIssue(password);
    if (passwordProblem) return apiError(passwordProblem, 400);

    const { data: existing, error: lookupError } = await auth.adminSupabase.auth.admin.getUserById(id);
    if (lookupError || !existing.user) return apiError("That member no longer exists.", 404);

    const { error } = await auth.adminSupabase.auth.admin.updateUserById(id, { password });
    if (error) {
      console.error("[api/admin/users/password]", error.status || "update_failed");
      return apiError("Could not update the password.", 400);
    }

    return apiJson({ success: true });
  } catch (err) {
    console.error("[api/admin/users/password]", err instanceof Error ? err.name : "Error");
    return apiError("Could not update the password.", 500);
  }
}

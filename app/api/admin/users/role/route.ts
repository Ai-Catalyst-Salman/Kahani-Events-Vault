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
    if (!allowRequest(`user:role:${auth.userId}`, 20, 60_000)) {
      return apiError("Too many access updates. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 4_096);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid" || !body || typeof body !== "object") return apiError("Invalid request.", 400);
    const record = body as Record<string, unknown>;

    const id = record.id;
    const role = record.role;
    if (!isUuid(id)) return apiError("A valid member is required.", 400);
    if (role !== "admin" && role !== "user") return apiError("Invalid role specified.", 400);

    if (role === "user") {
      const blocked = await guardTeamChange(auth.adminSupabase, auth.userId, id, "demote");
      if (blocked) return apiError(blocked, 400);
    } else if (id === auth.userId) {
      return apiJson({ success: true, user: { id, role } });
    }

    const { data: existing, error: readError } = await auth.adminSupabase
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      console.error("[api/admin/users/role]", readError.code);
      return apiError("Could not update access.", 500);
    }

    if (existing) {
      const { error } = await auth.adminSupabase.from("profiles").update({ role }).eq("id", id);
      if (error) {
        console.error("[api/admin/users/role]", error.code);
        return apiError("Could not update access.", 500);
      }
    } else {
      const { data: authUser, error: userError } = await auth.adminSupabase.auth.admin.getUserById(id);
      const email = authUser?.user?.email;
      if (userError || !email) return apiError("That member no longer exists.", 404);
      const { error } = await auth.adminSupabase.from("profiles").upsert({ id, email, role });
      if (error) {
        console.error("[api/admin/users/role]", error.code);
        return apiError("Could not update access.", 500);
      }
    }

    return apiJson({ success: true, user: { id, role } });
  } catch (err) {
    console.error("[api/admin/users/role]", err instanceof Error ? err.name : "Error");
    return apiError("Could not update access.", 500);
  }
}

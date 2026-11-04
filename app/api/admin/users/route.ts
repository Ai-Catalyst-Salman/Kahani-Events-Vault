import { apiError, apiJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin } from "@/lib/auth/requireAdmin";
import { listTeamMembers } from "@/lib/auth/teamMembers";
import { allowRequest } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`user:list:${auth.userId}`, 60, 60_000)) {
      return apiError("Too many requests. Wait a moment and try again.", 429);
    }

    const listed = await listTeamMembers(auth.adminSupabase);
    if (!listed.ok) {
      console.error("[api/admin/users GET]", "list_failed");
      return apiError("Could not load team members.", 500);
    }

    return apiJson({ users: listed.members });
  } catch (err) {
    console.error("[api/admin/users GET]", err instanceof Error ? err.name : "Error");
    return apiError("Could not load team members.", 500);
  }
}

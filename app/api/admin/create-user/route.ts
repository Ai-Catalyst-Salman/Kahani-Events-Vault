import { apiError, apiJson, readJson } from "@/lib/api/respond";
import { rejectAuth, requireAdmin } from "@/lib/auth/requireAdmin";
import { allowRequest } from "@/lib/security/rateLimit";
import { LIMITS, passwordIssue } from "@/lib/security/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return rejectAuth(auth) ?? apiError("Unauthorized", 401);
    if (!allowRequest(`user:create:${auth.userId}`, 5, 60_000)) {
      return apiError("Too many account requests. Wait a moment and try again.", 429);
    }

    const body = await readJson(request, 8_192);
    if (body === "too_large") return apiError("Payload too large.", 413);
    if (body === "invalid" || !body || typeof body !== "object") return apiError("Invalid request.", 400);
    const record = body as Record<string, unknown>;

    const email = typeof record.email === "string" ? record.email.trim().toLowerCase() : "";
    const password = typeof record.password === "string" ? record.password : "";
    const role = record.role;

    if (!EMAIL_PATTERN.test(email) || email.length > LIMITS.email) {
      return apiError("A valid email is required.", 400);
    }
    const passwordProblem = passwordIssue(password);
    if (passwordProblem) return apiError(passwordProblem, 400);
    if (role !== "admin" && role !== "user") return apiError("Invalid role specified.", 400);

    const { data: created, error: createError } = await auth.adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      const duplicate = (createError?.message || "").toLowerCase().includes("already");
      console.error("[api/admin/create-user]", createError?.status || "create_failed");
      return apiError(
        duplicate ? "An account with that email already exists." : "Could not create the account.",
        400
      );
    }

    const { error: profileError } = await auth.adminSupabase.from("profiles").upsert({
      id: created.user.id,
      email: created.user.email!,
      role,
    });

    if (profileError) {
      await auth.adminSupabase.auth.admin.deleteUser(created.user.id);
      console.error("[api/admin/create-user]", profileError.code);
      return apiError("Could not create the account.", 500);
    }

    return apiJson({
      success: true,
      user: { id: created.user.id, email: created.user.email, role },
    });
  } catch (err) {
    console.error("[api/admin/create-user]", err instanceof Error ? err.name : "Error");
    return apiError("Could not create the account.", 500);
  }
}

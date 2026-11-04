import { apiError } from "@/lib/api/respond";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export function rejectAuth(auth: { ok: boolean; error?: string; status?: number }): NextResponse | null {
  if (auth.ok) return null;
  const status = auth.status === 401 ? 401 : 403;
  return apiError(auth.error || (status === 401 ? "Unauthorized" : "Forbidden"), status);
}

type AdminContext = {
  ok: true;
  userId: string;
  adminSupabase: ReturnType<typeof createAdminClient>;
};

type AdminFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export async function requireAdmin(): Promise<AdminContext | AdminFailure> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin") return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, userId: user.id, adminSupabase };
}

export async function requireUserId(): Promise<{ ok: true; userId: string } | AdminFailure> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, error: "Unauthorized" };
  return { ok: true, userId: user.id };
}

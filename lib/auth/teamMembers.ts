import type { SupabaseClient } from "@supabase/supabase-js";

export type TeamMember = {
  id: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  last_sign_in_at: string | null;
};

function asRole(value: unknown): "admin" | "user" {
  return value === "admin" ? "admin" : "user";
}

export async function listTeamMembers(
  admin: SupabaseClient
): Promise<{ ok: true; members: TeamMember[] } | { ok: false }> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false });

  if (error) return { ok: false };

  const authById = new Map<string, { email: string; created_at: string; last_sign_in_at: string | null }>();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listError) break;
    const batch = data?.users ?? [];
    for (const user of batch) {
      authById.set(user.id, {
        email: typeof user.email === "string" ? user.email : "",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
      });
    }
    if (batch.length < 200) break;
  }

  const seen = new Set<string>();
  const members: TeamMember[] = [];

  for (const profile of profiles ?? []) {
    const row = profile as { id: string; email: string | null; role: string; created_at: string };
    seen.add(row.id);
    const authUser = authById.get(row.id);
    members.push({
      id: row.id,
      email: row.email || authUser?.email || "",
      role: asRole(row.role),
      created_at: row.created_at,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    });
  }

  for (const [id, authUser] of authById) {
    if (seen.has(id) || !authUser.email) continue;
    members.push({
      id,
      email: authUser.email,
      role: "user",
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
    });
  }

  members.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  return { ok: true, members };
}

async function adminCount(admin: SupabaseClient): Promise<number | null> {
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) return null;
  return count ?? 0;
}

/** Blocks self-lockout and removal of the last administrator. */
export async function guardTeamChange(
  admin: SupabaseClient,
  actorId: string,
  targetId: string,
  action: "delete" | "demote"
): Promise<string | null> {
  if (actorId === targetId) {
    return action === "delete"
      ? "You can't remove your own account."
      : "You can't change your own access level.";
  }

  const { data, error } = await admin.from("profiles").select("role").eq("id", targetId).maybeSingle();
  if (error) return "Could not update this member.";

  const role = (data as { role?: string } | null)?.role;
  if (role !== "admin") return null;

  const remaining = await adminCount(admin);
  if (remaining === null) return "Could not update this member.";
  if (remaining <= 1) return "At least one administrator must remain.";
  return null;
}

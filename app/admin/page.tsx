import { createAdminClient } from "@/lib/supabase/admin";
import { readVerifiedUser } from "@/lib/auth/requestUser";
import { redirect } from "next/navigation";
import { AdminClient } from "@/components/AdminClient";
import type { TeamMember } from "@/lib/auth/teamMembers";

export default async function AdminPage() {
  const user = await readVerifiedUser();
  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();
  const [
    { data: profile },
    { data: accessLogs },
    { data: themes },
    { data: categories },
    { data: profiles },
  ] = await Promise.all([
    adminSupabase.from("profiles").select("role, email").eq("id", user.id).single(),
    adminSupabase.from("access_logs").select("*").order("timestamp", { ascending: false }).limit(50),
    adminSupabase.from("event_themes").select("*").order("created_at", { ascending: false }),
    adminSupabase.from("theme_categories").select("*").order("name", { ascending: true }),
    adminSupabase.from("profiles").select("id, email, role, created_at").order("created_at", { ascending: false }),
  ]);

  if ((profile as { role?: string } | null)?.role !== "admin") {
    redirect("/");
  }

  const initialMembers: TeamMember[] = ((profiles ?? []) as Array<{
    id: string;
    email: string | null;
    role: string;
    created_at: string;
  }>).map((profile) => ({
    id: profile.id,
    email: profile.email ?? "",
    role: profile.role === "admin" ? "admin" : "user",
    created_at: profile.created_at,
    last_sign_in_at: null,
  }));

  return (
    <AdminClient
      accessLogs={accessLogs ?? []}
      initialThemes={themes ?? []}
      initialCategories={categories ?? []}
      initialMembers={initialMembers}
      adminEmail={user.email ?? ""}
      adminUserId={user.id}
    />
  );
}

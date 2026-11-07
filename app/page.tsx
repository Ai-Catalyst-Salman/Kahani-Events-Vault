import { createAdminClient } from "@/lib/supabase/admin";
import { readVerifiedUser } from "@/lib/auth/requestUser";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { Navbar } from "@/components/Navbar";

export default async function DashboardPage() {
  const user = await readVerifiedUser();

  if (!user) {
    redirect("/login");
  }

  const adminSupabase = createAdminClient();
  const [{ data: profile }, { data: themes }, { data: categories }] = await Promise.all([
    adminSupabase.from("profiles").select("role, email").eq("id", user.id).single(),
    adminSupabase.from("event_themes").select("*").order("created_at", { ascending: false }),
    adminSupabase.from("theme_categories").select("name").order("name", { ascending: true }),
  ]);

  const categoryNames = categories ? categories.map((c) => c.name) : [];
  const userRole = (profile as any)?.role ?? "user";
  const publicThemes = (themes ?? []).map((theme) => ({
    ...theme,
    additional_notes: null,
  }));

  return (
    <div className="min-h-screen bg-cream">
      <Navbar
        email={user.email ?? ""}
        role={userRole}
      />
      <DashboardClient
        themes={publicThemes}
        userEmail={user.email ?? ""}
        categoriesList={categoryNames}
      />
    </div>
  );
}

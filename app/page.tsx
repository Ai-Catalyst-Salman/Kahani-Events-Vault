import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { Navbar } from "@/components/Navbar";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile using Admin Client to bypass any RLS recursion
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  // Fetch all event themes
  const { data: themes } = await adminSupabase
    .from("event_themes")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch dynamic categories
  const { data: categories } = await adminSupabase
    .from("theme_categories")
    .select("name")
    .order("name", { ascending: true });

  const categoryNames = categories ? categories.map((c) => c.name) : [];
  const userRole = (profile as any)?.role ?? "user";

  return (
    <div className="min-h-screen bg-cream">
      <Navbar
        email={user.email ?? ""}
        role={userRole}
      />
      <DashboardClient
        themes={themes ?? []}
        userEmail={user.email ?? ""}
        categoriesList={categoryNames}
      />
    </div>
  );
}

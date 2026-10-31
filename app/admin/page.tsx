import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminClient } from "@/components/AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check admin role using service role client to bypass any RLS recursion
  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if ((profile as any)?.role !== "admin") {
    redirect("/");
  }

  // Fetch recent access logs (last 50)
  const { data: accessLogs } = await adminSupabase
    .from("access_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(50);

  // Fetch all themes
  const { data: themes } = await adminSupabase
    .from("event_themes")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch dynamic categories
  const { data: categories } = await adminSupabase
    .from("theme_categories")
    .select("*")
    .order("name", { ascending: true });

  return (
    <AdminClient
      accessLogs={accessLogs ?? []}
      initialThemes={themes ?? []}
      initialCategories={categories ?? []}
      adminEmail={user.email ?? ""}
    />
  );
}

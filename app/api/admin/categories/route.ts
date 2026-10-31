import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Helper: verify session + admin role — bypasses RLS using service role key
async function verifyAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, adminSupabase: null, error: "Unauthorized" };

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profile as any)?.role !== "admin") {
    return { user: null, adminSupabase: null, error: "Forbidden: Admins only" };
  }

  return { user, adminSupabase, error: null };
}

// GET: Fetch all theme categories (authenticated users only)
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: categories, error } = await adminSupabase
      .from("theme_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories: categories ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Add new theme category (Admin only)
export async function POST(request: Request) {
  try {
    const { adminSupabase, error: authError } = await verifyAdmin();
    if (authError || !adminSupabase) {
      return NextResponse.json({ error: authError }, { status: authError === "Unauthorized" ? 401 : 403 });
    }

    const body = await request.json();
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const { data: category, error: insertError } = await adminSupabase
      .from("theme_categories")
      .insert({ name })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, category });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE: Delete a category (Admin only)
export async function DELETE(request: Request) {
  try {
    const { adminSupabase, error: authError } = await verifyAdmin();
    if (authError || !adminSupabase) {
      return NextResponse.json({ error: authError }, { status: authError === "Unauthorized" ? 401 : 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const { error: deleteError } = await adminSupabase
      .from("theme_categories")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

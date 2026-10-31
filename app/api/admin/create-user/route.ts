import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // 1. Verify the requesting user is authenticated via cookie session
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please sign in." }, { status: 401 });
    }

    // 2. Verify admin role using Admin Client to bypass RLS recursion
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
    }

    // 3. Parse request payload
    const body = await request.json();
    const { email, password, role } = body as {
      email: string;
      password: string;
      role: "admin" | "user";
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (!["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    // 4. Create user using Admin client — does not affect the current admin session
    const { data: newUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!newUser?.user) {
      return NextResponse.json({ error: "Failed to generate user record." }, { status: 500 });
    }

    // 5. Upsert role into profiles table
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: newUser.user.email!,
        role,
      });

    if (profileError) {
      // Rollback: delete auth user if profile upsert fails
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: `Profile provisioning failed: ${profileError.message}. User creation rolled back.` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        role,
      },
    });
  } catch (err: any) {
    console.error("[api/admin/create-user] Error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

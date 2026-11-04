import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const pageViewAt = new Map<string, number>();

function clientIp(request: NextRequest): string {
  if (request.ip) return request.ip.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last.slice(0, 64);
  }
  return (request.headers.get("x-real-ip") || "unknown").slice(0, 64);
}

function shouldLogPageView(userId: string): boolean {
  const now = Date.now();
  const previous = pageViewAt.get(userId) || 0;
  if (now - previous < 10 * 60 * 1000) return false;
  if (pageViewAt.size > 2000) {
    for (const [id, at] of pageViewAt) {
      if (now - at > 10 * 60 * 1000) pageViewAt.delete(id);
    }
  }
  pageViewAt.set(userId, now);
  return true;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // Pages that exist. Anything else falls through to the root 404.
  // Add new pages here, or signed-out and signed-in visitors will both see not-found.
  const isKnownPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/api/auth"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated API calls with a JSON 401. Page routes go to login.
  if (!user && isApiRoute) {
    const unauthorized = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    unauthorized.headers.set("Cache-Control", "no-store");
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      unauthorized.cookies.set(cookie);
    });
    return unauthorized;
  }

  // Unknown addresses render the vault 404, including for signed-out visitors.
  if (!isApiRoute && !isKnownPage) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login
  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  // Fire-and-forget access log — never blocks the request
  if (user && isKnownPage && !isPublicRoute && shouldLogPageView(user.id)) {
    const city = (request.headers.get("x-vercel-ip-city") || "").slice(0, 80);
    const country = (request.headers.get("x-vercel-ip-country") || "").slice(0, 8);
    const location = [city, country].filter(Boolean).join(", ").slice(0, 120) || "Unknown";
    const userAgent = (request.headers.get("user-agent") || "").slice(0, 300);

    Promise.resolve(
      supabase.rpc("log_access", {
        p_user_id: user.id,
        p_email: user.email ?? null,
        p_ip_address: clientIp(request),
        p_location: location,
        p_user_agent: userAgent,
        p_event_type: "PAGE_VIEW",
      })
    ).catch(() => {
      // Silently fail — never block the user
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

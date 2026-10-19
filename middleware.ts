import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();
  const loginUrl = new URL("/login", request.url);
  if (!user) return NextResponse.redirect(loginUrl);

  const { data: membership } = await supabase
    .from("household_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("membership_status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) return NextResponse.redirect(new URL("/login?error=membership", request.url));
  if (request.nextUrl.pathname.startsWith("/admin") && membership.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (request.nextUrl.pathname.startsWith("/dashboard") && membership.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL(membership.role === "admin" ? "/admin" : "/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login"]
};

import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

const publicPaths = ["/login"];

function isPublicPath(pathname: string) {
  return publicPaths.some((path) => pathname.startsWith(path));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Allow API routes and public paths
  if (isPublicPath(pathname) || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Check for missing or placeholder values
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === "your-project-url-here" ||
    supabaseAnonKey === "your-anon-key-here" ||
    supabaseUrl.includes("your-project") ||
    supabaseAnonKey.includes("your-")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Validate URL format
  try {
    const urlObj = new URL(supabaseUrl);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
  } catch {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  // Refresh the session first to ensure cookies are read
  const { data: sessionData } = await supabase.auth.getSession();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();


  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/candidate")) {
    // Use service role to bypass RLS for role check
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let role: string | null = null;
    
    if (serviceKey) {
      // Use service role client to bypass RLS
      const { createClient } = await import("@supabase/supabase-js");
      const adminClient = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      
      const { data } = await adminClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      
      role = data?.role ?? null;
    } else {
      // Fallback to regular client
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      
      role = data?.role ?? null;
    }

    if (!role) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/admin") && role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/candidate") && role !== "candidate") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

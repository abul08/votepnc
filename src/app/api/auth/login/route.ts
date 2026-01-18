import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Convert username to the placeholder email format used for auth
    const email = `${username}@voter.local`;

    // Create response first so we can set cookies on it
    const response = NextResponse.json({ success: true });
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
              httpOnly: options?.httpOnly ?? true,
              secure: process.env.NODE_ENV === "production",
              sameSite: options?.sameSite ?? "lax",
              path: options?.path ?? "/",
            });
          });
        },
      },
    });

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data?.user) {
      return NextResponse.json(
        { error: "Login failed" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS for user creation
    // This ensures the user record can always be created
    if (supabaseServiceKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check if user exists
      const { data: existingUser } = await adminClient
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!existingUser) {
        const extractedUsername = data.user.email?.split("@")[0] || `user_${data.user.id.slice(0, 8)}`;
        await adminClient.from("users").insert({
          id: data.user.id,
          username: extractedUsername,
          email: null,
          role: "candidate",
        });
      }

      // Log activity
      try {
        await adminClient.from("activity_log").insert({
          user_id: data.user.id,
          action: "login",
          metadata: {},
        });
      } catch {
        // Ignore activity log errors
      }
    }

    // Refresh session to ensure cookies are properly set
    await supabase.auth.getSession();
    
    // Return the refresh token so client can register the device
    // Note: The refresh token is returned ONLY for device registration
    // and should NOT be stored anywhere on the client except for this one-time use
    return NextResponse.json({ 
      success: true,
      refresh_token: data.session?.refresh_token 
    }, {
      headers: response.headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/hash";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create response to clear cookies
    const response = NextResponse.json({ success: true });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
              httpOnly: (options?.httpOnly as boolean) ?? true,
              secure: process.env.NODE_ENV === "production",
              sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
              path: (options?.path as string) ?? "/",
            });
          });
        },
      },
    });

    // Get the current user before signing out
    const { data: { user } } = await supabase.auth.getUser();

    // Try to revoke the device if refresh_token is provided
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (body.refresh_token && user) {
      try {
        const tokenHash = await hashToken(body.refresh_token);
        const adminClient = createSupabaseAdminClient();
        
        // Delete the device record matching this token hash
        await adminClient
          .from("user_devices")
          .delete()
          .eq("user_id", user.id)
          .eq("refresh_token_hash", tokenHash);
      } catch (error) {
        console.error("Failed to revoke device:", error);
        // Continue with logout even if device revocation fails
      }
    }

    // Sign out from Supabase (this will clear the session)
    await supabase.auth.signOut();

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

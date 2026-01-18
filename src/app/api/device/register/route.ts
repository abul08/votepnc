import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/hash";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { refresh_token, device_name } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Hash the refresh token - NEVER store raw token
    const tokenHash = await hashToken(refresh_token);

    // Extract device info from request
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || 
                      request.headers.get("x-real-ip") || 
                      "Unknown";

    // Generate device name if not provided
    const finalDeviceName = device_name || parseUserAgent(userAgent);

    // Use admin client to insert (bypasses RLS for insert)
    const adminClient = createSupabaseAdminClient();

    // Check if this token hash already exists for the user
    const { data: existing } = await adminClient
      .from("user_devices")
      .select("id")
      .eq("user_id", user.id)
      .eq("refresh_token_hash", tokenHash)
      .maybeSingle();

    if (existing) {
      // Device already registered, update timestamp
      await adminClient
        .from("user_devices")
        .update({ created_at: new Date().toISOString() })
        .eq("id", existing.id);
      
      return NextResponse.json({ 
        success: true, 
        message: "Device already registered",
        device_id: existing.id 
      });
    }

    // Insert new device record
    const { data: device, error } = await adminClient
      .from("user_devices")
      .insert({
        user_id: user.id,
        refresh_token_hash: tokenHash,
        device_name: finalDeviceName,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to register device:", error);
      return NextResponse.json(
        { error: "Failed to register device" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      device_id: device.id 
    });
  } catch (error) {
    console.error("Device registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Parse user agent string to get a friendly device name
 */
function parseUserAgent(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  // Detect browser
  let browser = "Unknown Browser";
  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

  // Detect OS
  let os = "Unknown OS";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return `${browser} on ${os}`;
}

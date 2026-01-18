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
    const { device_id, refresh_token } = body;

    if (!device_id && !refresh_token) {
      return NextResponse.json(
        { error: "Either device_id or refresh_token is required" },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();
    let targetDeviceId = device_id;

    // If refresh_token is provided, find the device by hash
    if (refresh_token && !device_id) {
      const tokenHash = await hashToken(refresh_token);
      
      const { data: device } = await adminClient
        .from("user_devices")
        .select("id")
        .eq("user_id", user.id)
        .eq("refresh_token_hash", tokenHash)
        .maybeSingle();

      if (!device) {
        return NextResponse.json(
          { error: "Device not found" },
          { status: 404 }
        );
      }

      targetDeviceId = device.id;
    }

    // Verify the device belongs to the user before deleting
    const { data: deviceToDelete } = await adminClient
      .from("user_devices")
      .select("id, user_id")
      .eq("id", targetDeviceId)
      .single();

    if (!deviceToDelete) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    if (deviceToDelete.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Delete the device record
    const { error: deleteError } = await adminClient
      .from("user_devices")
      .delete()
      .eq("id", targetDeviceId);

    if (deleteError) {
      console.error("Failed to revoke device:", deleteError);
      return NextResponse.json(
        { error: "Failed to revoke device" },
        { status: 500 }
      );
    }

    // If we have the refresh token, also invalidate it in Supabase Auth
    // This uses the admin API to revoke the specific session
    if (refresh_token) {
      try {
        // Note: Supabase doesn't have a direct deleteTokens method in the current API
        // We can sign out all sessions for the user if needed, but that would log out everywhere
        // For now, we just delete the device record - the token will expire naturally
        // or be invalid on next refresh attempt
        
        // If you need to invalidate specific tokens, you would need to implement
        // a custom solution or use supabase.auth.admin.signOut() for all sessions
        console.log("Device revoked, token hash removed from tracking");
      } catch (authError) {
        console.error("Failed to invalidate token in auth:", authError);
        // Continue - device record is already deleted
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Device revoked successfully" 
    });
  } catch (error) {
    console.error("Device revoke error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

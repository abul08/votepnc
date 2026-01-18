import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();

    // Check user role
    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userData?.role !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get candidate info
    const { data: candidate } = await adminClient
      .from("candidates")
      .select("name, candidate_number, position")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get all voters with only the needed fields
    const { data: voters } = await adminClient
      .from("voters")
      .select("id, name, phone, present_location")
      .order("name", { ascending: true });

    return NextResponse.json({
      voters: voters ?? [],
      candidate: candidate ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

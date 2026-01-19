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
    
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all voters
    const { data: voters } = await adminClient
      .from("voters")
      .select("*")
      .order("created_at", { ascending: false });

    // Get all candidates
    const { data: candidates } = await adminClient
      .from("candidates")
      .select("id, name, candidate_number, position")
      .order("name", { ascending: true });

    // Get all voting preferences
    const { data: preferences } = await adminClient
      .from("voter_voting_preferences")
      .select("candidate_id, voter_id, will_vote");

    // Create a map: voter_id -> candidate_id -> will_vote
    const preferencesMap = new Map<string, Map<string, boolean>>();
    preferences?.forEach((pref) => {
      if (!preferencesMap.has(pref.voter_id)) {
        preferencesMap.set(pref.voter_id, new Map());
      }
      preferencesMap.get(pref.voter_id)!.set(pref.candidate_id, pref.will_vote);
    });

    return NextResponse.json({
      voters: voters ?? [],
      candidates: candidates ?? [],
      preferences: preferences ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

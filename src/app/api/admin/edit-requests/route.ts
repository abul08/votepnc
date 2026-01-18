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

    // Verify user is admin
    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all pending edit requests with voter and candidate info
    const { data: requests } = await adminClient
      .from("voter_edit_requests")
      .select(`
        id,
        voter_id,
        candidate_id,
        field_name,
        old_value,
        new_value,
        status,
        created_at,
        reviewed_at,
        reviewed_by
      `)
      .order("created_at", { ascending: false });

    // Get voter names
    const voterIds = [...new Set((requests ?? []).map(r => r.voter_id))];
    const { data: voters } = await adminClient
      .from("voters")
      .select("id, name")
      .in("id", voterIds);

    const voterMap = new Map(
      (voters ?? []).map(v => [v.id, v.name])
    );

    // Get candidate names
    const candidateIds = [...new Set((requests ?? []).map(r => r.candidate_id))];
    const { data: candidates } = await adminClient
      .from("candidates")
      .select("id, name")
      .in("id", candidateIds);

    const candidateMap = new Map(
      (candidates ?? []).map(c => [c.id, c.name])
    );

    // Enrich requests with names
    const enrichedRequests = (requests ?? []).map(r => ({
      ...r,
      voter_name: voterMap.get(r.voter_id) ?? "Unknown",
      candidate_name: candidateMap.get(r.candidate_id) ?? "Unknown",
    }));

    return NextResponse.json({ requests: enrichedRequests });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const { id: voterId } = await params;
    const body = await request.json();
    const { will_vote } = body;

    if (typeof will_vote !== "boolean") {
      return NextResponse.json(
        { error: "will_vote must be a boolean" },
        { status: 400 }
      );
    }

    // Upsert voting preference
    const { error } = await adminClient
      .from("voter_voting_preferences")
      .upsert(
        {
          candidate_id: candidate.id,
          voter_id: voterId,
          will_vote,
        },
        {
          onConflict: "candidate_id,voter_id",
        }
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

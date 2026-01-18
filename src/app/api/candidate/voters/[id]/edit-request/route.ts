import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voterId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();

    // Verify user is a candidate
    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userData?.role !== "candidate") {
      return NextResponse.json({ error: "Only candidates can submit edit requests" }, { status: 403 });
    }

    // Get the candidate record
    let { data: candidate } = await adminClient
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // If no candidate record exists, create one
    if (!candidate) {
      // Get user info to create candidate record
      const { data: userInfo } = await adminClient
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();

      const { data: newCandidate, error: createError } = await adminClient
        .from("candidates")
        .insert({
          user_id: user.id,
          name: userInfo?.username || "Unknown",
          phone: null,
          position: null,
        })
        .select("id")
        .single();

      if (createError || !newCandidate) {
        console.error("Failed to create candidate record:", createError);
        return NextResponse.json({ error: "Failed to initialize candidate profile" }, { status: 500 });
      }
      
      candidate = newCandidate;
    }

    const body = await request.json();
    const { field_name, new_value } = body;

    // Validate field name
    if (!["phone", "present_location"].includes(field_name)) {
      return NextResponse.json(
        { error: "Invalid field. Only phone and present_location can be edited." },
        { status: 400 }
      );
    }

    if (new_value === undefined || new_value === null) {
      return NextResponse.json(
        { error: "New value is required" },
        { status: 400 }
      );
    }

    // Get current value of the voter field
    const { data: voter } = await adminClient
      .from("voters")
      .select("phone, present_location")
      .eq("id", voterId)
      .single();

    if (!voter) {
      return NextResponse.json({ error: "Voter not found" }, { status: 404 });
    }

    const oldValue = voter[field_name as keyof typeof voter] ?? null;

    // Check if there's already a pending request for this voter and field
    const { data: existingRequest } = await adminClient
      .from("voter_edit_requests")
      .select("id")
      .eq("voter_id", voterId)
      .eq("candidate_id", candidate.id)
      .eq("field_name", field_name)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      // Update existing pending request
      const { error: updateError } = await adminClient
        .from("voter_edit_requests")
        .update({
          old_value: oldValue,
          new_value: new_value,
          created_at: new Date().toISOString(),
        })
        .eq("id", existingRequest.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Edit request updated",
        request_id: existingRequest.id 
      });
    }

    // Create new edit request
    const { data: newRequest, error: insertError } = await adminClient
      .from("voter_edit_requests")
      .insert({
        voter_id: voterId,
        candidate_id: candidate.id,
        field_name,
        old_value: oldValue,
        new_value: new_value,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Log activity
    await adminClient.from("activity_log").insert({
      user_id: user.id,
      action: "edit_request_submitted",
      metadata: { 
        voter_id: voterId, 
        field: field_name,
        request_id: newRequest.id 
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Edit request submitted for approval",
      request_id: newRequest.id 
    });
  } catch (error) {
    console.error("Edit request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

// Get pending edit requests for a voter (for candidates to see their requests)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voterId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();

    // Get the candidate record
    const { data: candidate } = await adminClient
      .from("candidates")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // If no candidate record, return empty (they haven't made any requests yet)
    if (!candidate) {
      return NextResponse.json({ requests: [] });
    }

    // Get pending requests for this voter by this candidate
    const { data: requests } = await adminClient
      .from("voter_edit_requests")
      .select("id, field_name, old_value, new_value, status, created_at")
      .eq("voter_id", voterId)
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ requests: requests ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

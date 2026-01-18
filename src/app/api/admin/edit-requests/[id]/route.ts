import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function getAuthenticatedAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const adminClient = createSupabaseAdminClient();
  
  const { data: userData } = await adminClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  
  if (userData?.role !== "admin") {
    return { error: "Forbidden", status: 403 };
  }

  return { user, adminClient };
}

// Approve an edit request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const auth = await getAuthenticatedAdmin();
    
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user, adminClient } = auth;

    // Get the edit request
    const { data: editRequest } = await adminClient
      .from("voter_edit_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!editRequest) {
      return NextResponse.json({ error: "Edit request not found" }, { status: 404 });
    }

    if (editRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    // Apply the edit to the voter
    const updateData: Record<string, string> = {};
    updateData[editRequest.field_name] = editRequest.new_value;

    const { error: voterError } = await adminClient
      .from("voters")
      .update(updateData)
      .eq("id", editRequest.voter_id);

    if (voterError) {
      return NextResponse.json({ error: voterError.message }, { status: 400 });
    }

    // Update the request status
    const { error: requestError } = await adminClient
      .from("voter_edit_requests")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", requestId);

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 400 });
    }

    // Log activity
    await adminClient.from("activity_log").insert({
      user_id: user.id,
      action: "edit_request_approved",
      metadata: { 
        request_id: requestId,
        voter_id: editRequest.voter_id,
        field: editRequest.field_name,
        new_value: editRequest.new_value,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Edit request approved and applied" 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

// Reject an edit request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const auth = await getAuthenticatedAdmin();
    
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { user, adminClient } = auth;

    // Get the edit request
    const { data: editRequest } = await adminClient
      .from("voter_edit_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (!editRequest) {
      return NextResponse.json({ error: "Edit request not found" }, { status: 404 });
    }

    if (editRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    // Update the request status to rejected
    const { error: requestError } = await adminClient
      .from("voter_edit_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", requestId);

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 400 });
    }

    // Log activity
    await adminClient.from("activity_log").insert({
      user_id: user.id,
      action: "edit_request_rejected",
      metadata: { 
        request_id: requestId,
        voter_id: editRequest.voter_id,
        field: editRequest.field_name,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Edit request rejected" 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

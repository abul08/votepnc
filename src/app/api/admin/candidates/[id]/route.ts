import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthenticatedAdmin(request: NextRequest) {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedAdmin(request);
    
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { adminClient } = auth;
    const body = await request.json();
    const { username, name, candidate_number, phone, position } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!candidate_number) {
      return NextResponse.json({ error: "Candidate number is required" }, { status: 400 });
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Get the candidate to find the user_id
    const { data: candidate } = await adminClient
      .from("candidates")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Check if username is taken by another user
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", candidate.user_id)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }

    // Update the username in users table
    const { error: userError } = await adminClient
      .from("users")
      .update({ username })
      .eq("id", candidate.user_id);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // Update the auth email (placeholder email based on username)
    const placeholderEmail = `${username}@voter.local`;
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      candidate.user_id,
      { email: placeholderEmail }
    );

    if (authError) {
      console.error("Failed to update auth email:", authError);
      // Continue anyway, username in users table is updated
    }

    // Update the candidate record
    const { error } = await adminClient
      .from("candidates")
      .update({
        name,
        candidate_number,
        phone: phone || null,
        position: position || null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedAdmin(request);
    
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { adminClient } = auth;

    const { error } = await adminClient
      .from("candidates")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

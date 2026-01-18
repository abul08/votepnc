import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();
    
    // Check if user is admin
    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [candidates, users, permissions] = await Promise.all([
      adminClient.from("candidates").select("*").order("created_at", { ascending: false }),
      adminClient.from("users").select("id, username, email").eq("role", "candidate"),
      adminClient.from("candidate_permissions").select("candidate_id, allowed_fields"),
    ]);

    return NextResponse.json({
      candidates: candidates.data ?? [],
      users: users.data ?? [],
      permissions: permissions.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();
    
    // Check if user is admin
    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, name, phone, position, candidate_number } = body;

    // Validate required fields
    if (!username || !password || !name || !candidate_number) {
      return NextResponse.json(
        { error: "Username, password, name, and candidate number are required" },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Generate a placeholder email for Supabase auth (required by auth system)
    const placeholderEmail = `${username}@voter.local`;

    // Step 1: Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: placeholderEmail,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create user account" },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    // Step 2: Create user record in public.users
    const { error: userError } = await adminClient.from("users").insert({
      id: newUserId,
      username: username,
      email: null,
      role: "candidate",
    });

    if (userError) {
      // Rollback - delete auth user
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // Step 3: Create candidate record
    const { error: candidateError } = await adminClient.from("candidates").insert({
      user_id: newUserId,
      name,
      candidate_number,
      phone: phone || null,
      position: position || null,
    });

    if (candidateError) {
      // Rollback - delete user records
      await adminClient.from("users").delete().eq("id", newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: candidateError.message }, { status: 400 });
    }

    // Log activity
    await adminClient.from("activity_log").insert({
      user_id: user.id,
      action: "candidate_created",
      metadata: { candidate_name: name, candidate_username: username },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

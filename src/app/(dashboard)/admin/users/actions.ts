"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

export async function createUserAction(formData: FormData) {
  try {
    await requireRole("admin");
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "admin");

    if (!username || !password) {
      return { error: "Username and password are required." };
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { error: "Username can only contain letters, numbers, and underscores." };
    }

    if (password.length < 6) {
      return { error: "Password must be at least 6 characters." };
    }

    const adminClient = createSupabaseAdminClient();

    // Check if username already exists
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return { error: "Username already taken." };
    }

    // Generate placeholder email for Supabase auth
    const placeholderEmail = `${username}@voter.local`;

    const { data, error } = await adminClient.auth.admin.createUser({
      email: placeholderEmail,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      return { error: error?.message ?? "Failed to create user." };
    }

    // Create user record
    const { error: insertError } = await adminClient.from("users").insert({
      id: data.user.id,
      username: username,
      email: null,
      role,
    });

    if (insertError) {
      // Rollback - delete the auth user
      await adminClient.auth.admin.deleteUser(data.user.id);
      return { error: insertError.message };
    }

    await adminClient.from("activity_log").insert({
      user_id: data.user.id,
      action: "user_created",
      metadata: { role, username },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An error occurred." };
  }
}

export async function deleteUserAction(formData: FormData) {
  try {
    await requireRole("admin");
    const userId = String(formData.get("userId") ?? "");

    if (!userId) {
      return { error: "User ID is required." };
    }

    const adminClient = createSupabaseAdminClient();
    
    // Delete from users table first
    await adminClient.from("users").delete().eq("id", userId);
    
    // Delete from auth
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    
    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An error occurred." };
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    await requireRole("admin");
    const userId = String(formData.get("userId") ?? "");
    const username = String(formData.get("username") ?? "").trim();
    const role = String(formData.get("role") ?? "");

    if (!userId) {
      return { error: "User ID is required." };
    }

    if (!username) {
      return { error: "Username is required." };
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { error: "Username can only contain letters, numbers, and underscores." };
    }

    const adminClient = createSupabaseAdminClient();

    // Check if username is taken by another user
    const { data: existingUser } = await adminClient
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", userId)
      .maybeSingle();

    if (existingUser) {
      return { error: "Username already taken." };
    }

    // Update user record
    const { error } = await adminClient
      .from("users")
      .update({ username, role })
      .eq("id", userId);

    if (error) {
      return { error: error.message };
    }

    // Update auth email to match new username
    const placeholderEmail = `${username}@voter.local`;
    await adminClient.auth.admin.updateUserById(userId, {
      email: placeholderEmail,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An error occurred." };
  }
}

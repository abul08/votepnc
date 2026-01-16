"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function createUserAction(formData: FormData) {
  await requireRole("admin");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "candidate");

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Failed to create user." };
  }

  const supabase = createSupabaseServerClient();
  await supabase.from("users").insert({
    id: data.user.id,
    username: email,
    role,
  });

  await supabase.from("activity_log").insert({
    user_id: data.user.id,
    action: "user_created",
    metadata: { role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUserAction(formData: FormData) {
  await requireRole("admin");
  const userId = String(formData.get("userId") ?? "");
  const adminClient = createSupabaseAdminClient();
  await adminClient.auth.admin.deleteUser(userId);

  const supabase = createSupabaseServerClient();
  await supabase.from("users").delete().eq("id", userId);

  revalidatePath("/admin/users");
  return { success: true };
}

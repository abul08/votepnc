"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function updateCandidateVoterAction(formData: FormData) {
  await requireRole("candidate");
  const voterId = String(formData.get("voterId") ?? "");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No active session." };
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: permissions } = await supabase
    .from("candidate_permissions")
    .select("allowed_fields")
    .eq("candidate_id", candidate?.id ?? "")
    .maybeSingle();

  const allowedFields = new Set<string>(permissions?.allowed_fields ?? []);
  const updates: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "voterId") continue;
    // If no permissions set, allow basic fields
    if (allowedFields.size === 0 || allowedFields.has(key)) {
      updates[key] = String(value);
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No permitted fields to update." };
  }

  // Direct update if user created this voter
  const { error } = await supabase
    .from("voters")
    .update({
      ...updates,
      updated_by: user.id,
    })
    .eq("id", voterId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("activity_log").insert({
    user_id: user.id,
    action: "voter_updated",
    metadata: { voter_id: voterId, fields: Object.keys(updates) },
  });

  revalidatePath("/candidate/voters");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function updateCandidateVoterAction(formData: FormData) {
  await requireRole("candidate");
  const voterId = String(formData.get("voterId") ?? "");

  const supabase = createSupabaseServerClient();
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
    .select("field")
    .eq("candidate_id", candidate?.id ?? "");

  const allowedFields = new Set((permissions ?? []).map((perm) => perm.field));
  const updates: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "voterId") continue;
    if (allowedFields.has(key)) {
      updates[key] = String(value);
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: "No permitted fields to update." };
  }

  const { error } = await supabase.rpc("update_candidate_voter", {
    p_voter_id: voterId,
    p_updates: updates,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/candidate/voters");
  return { success: true };
}

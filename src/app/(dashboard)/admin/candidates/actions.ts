"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function createCandidateAction(formData: FormData) {
  await requireRole("admin");
  const userId = String(formData.get("userId") ?? "");
  const name = String(formData.get("name") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const position = String(formData.get("position") ?? "");

  const supabase = createSupabaseServerClient();
  await supabase.from("candidates").insert({
    user_id: userId,
    name,
    phone,
    position,
  });

  revalidatePath("/admin/candidates");
  return { success: true };
}

export async function deleteCandidateAction(formData: FormData) {
  await requireRole("admin");
  const candidateId = String(formData.get("candidateId") ?? "");

  const supabase = createSupabaseServerClient();
  await supabase.from("candidates").delete().eq("id", candidateId);

  revalidatePath("/admin/candidates");
  return { success: true };
}

export async function updateCandidatePermissionsAction(formData: FormData) {
  await requireRole("admin");
  const candidateId = String(formData.get("candidateId") ?? "");
  const fields = formData.getAll("fields").map((value) => String(value));

  const supabase = createSupabaseServerClient();
  await supabase.from("candidate_permissions").delete().eq("candidate_id", candidateId);

  if (fields.length > 0) {
    await supabase.from("candidate_permissions").insert(
      fields.map((field) => ({
        candidate_id: candidateId,
        field,
        can_edit: true,
      })),
    );
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}

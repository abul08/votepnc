"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function createVoterAction(formData: FormData) {
  await requireRole("admin");
  const payload = {
    sumaaru: String(formData.get("sumaaru") ?? ""),
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    sex: String(formData.get("sex") ?? ""),
    nid: String(formData.get("nid") ?? ""),
    present_location: String(formData.get("present_location") ?? ""),
    registered_box: String(formData.get("registered_box") ?? ""),
    job_in: String(formData.get("job_in") ?? ""),
    job_by: String(formData.get("job_by") ?? ""),
  };

  const supabase = createSupabaseServerClient();
  await supabase.from("voters").insert(payload);
  revalidatePath("/admin/voters");
  return { success: true };
}

export async function deleteVoterAction(formData: FormData) {
  await requireRole("admin");
  const voterId = String(formData.get("voterId") ?? "");
  const supabase = createSupabaseServerClient();
  await supabase.from("voters").delete().eq("id", voterId);
  revalidatePath("/admin/voters");
  return { success: true };
}

export async function assignVoterAction(formData: FormData) {
  await requireRole("admin");
  const voterId = String(formData.get("voterId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  const supabase = createSupabaseServerClient();

  await supabase.from("voter_assignments").upsert({
    voter_id: voterId,
    candidate_id: candidateId,
  });

  revalidatePath("/admin/voters");
  return { success: true };
}

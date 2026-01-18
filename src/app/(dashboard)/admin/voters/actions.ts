"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole, getSessionUser } from "@/lib/auth";

export async function createVoterAction(formData: FormData) {
  try {
    await requireRole("admin");
    const user = await getSessionUser();
    
    const sumaaru = String(formData.get("sumaaru") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();

    if (!sumaaru || !name) {
      return { error: "Sumaaru and name are required." };
    }

    const payload = {
      sumaaru,
      name,
      address: String(formData.get("address") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      sex: String(formData.get("sex") ?? "") || null,
      nid: String(formData.get("nid") ?? "") || null,
      present_location: String(formData.get("present_location") ?? "") || null,
      registered_box: String(formData.get("registered_box") ?? "") || null,
      job_in: String(formData.get("job_in") ?? "") || null,
      job_by: String(formData.get("job_by") ?? "") || null,
      created_by: user?.id,
    };

    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.from("voters").insert(payload);
    
    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/voters");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An error occurred." };
  }
}

export async function deleteVoterAction(formData: FormData) {
  try {
    await requireRole("admin");
    const voterId = String(formData.get("voterId") ?? "");

    if (!voterId) {
      return { error: "Voter ID is required." };
    }

    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient.from("voters").delete().eq("id", voterId);
    
    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/voters");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An error occurred." };
  }
}

export async function updateVoterAction(formData: FormData) {
  try {
    await requireRole("admin");
    const user = await getSessionUser();
    const voterId = String(formData.get("voterId") ?? "");

    if (!voterId) {
      return { error: "Voter ID is required." };
    }

    const sumaaru = String(formData.get("sumaaru") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();

    if (!sumaaru || !name) {
      return { error: "Sumaaru and name are required." };
    }

    const payload = {
      sumaaru,
      name,
      address: String(formData.get("address") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      sex: String(formData.get("sex") ?? "") || null,
      nid: String(formData.get("nid") ?? "") || null,
      present_location: String(formData.get("present_location") ?? "") || null,
      registered_box: String(formData.get("registered_box") ?? "") || null,
      job_in: String(formData.get("job_in") ?? "") || null,
      job_by: String(formData.get("job_by") ?? "") || null,
      updated_by: user?.id,
    };

    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient
      .from("voters")
      .update(payload)
      .eq("id", voterId);
    
    if (error) {
      return { error: error.message };
    }

    // Log activity
    if (user) {
      await adminClient.from("activity_log").insert({
        user_id: user.id,
        action: "voter_updated",
        metadata: { voter_id: voterId },
      });
    }

    revalidatePath("/admin/voters");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "An error occurred." };
  }
}

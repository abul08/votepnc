"use server";

import Papa from "papaparse";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

type ImportState = {
  success?: boolean;
  message?: string;
  inserted?: number;
  failed?: number;
};

export async function importVotersAction(
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireRole("admin");
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return { success: false, message: "Please upload a CSV file." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const csvText = buffer.toString("utf-8");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return { success: false, message: parsed.errors[0]?.message ?? "Parse error." };
  }

  const rows = parsed.data.map((row) => ({
    sumaaru: row.sumaaru ?? row.Sumaaru ?? "",
    name: row.name ?? row.Name ?? "",
    address: row.address ?? row.Address ?? "",
    phone: row.phone ?? row.Phone ?? "",
    sex: row.sex ?? row.Sex ?? "",
    nid: row.nid ?? row.NID ?? row.Nid ?? "",
    present_location: row.present_location ?? row["present location"] ?? "",
    registered_box: row.registered_box ?? row["registered box"] ?? "",
    job_in: row.job_in ?? row["job in"] ?? "",
    job_by: row.job_by ?? row["job by"] ?? "",
  }));

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("voters").insert(rows);

  if (error) {
    return { success: false, message: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "csv_import",
      metadata: { inserted: rows.length },
    });
  }

  return {
    success: true,
    inserted: rows.length,
    failed: 0,
    message: "CSV import completed.",
  };
}

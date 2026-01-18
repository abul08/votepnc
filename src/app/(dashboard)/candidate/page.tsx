import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function CandidateDashboard() {
  await requireRole("candidate");
  
  // Redirect candidates directly to the voters list
  redirect("/candidate/voters");
}

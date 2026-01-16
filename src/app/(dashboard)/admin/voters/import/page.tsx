import { requireRole } from "@/lib/auth";

import { ImportForm } from "./import-form";

export default async function VoterImportPage() {
  await requireRole("admin");
  return (
    <div className="space-y-6">
      <ImportForm />
    </div>
  );
}

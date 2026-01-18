import { requireRole } from "@/lib/auth";

import { ImportForm } from "./import-form";

export default async function VoterImportPage() {
  await requireRole("admin");
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">CSV Import</h1>
        <p className="text-sm text-muted-foreground">Bulk import voters from a CSV file.</p>
      </div>
      
      <ImportForm />
    </div>
  );
}

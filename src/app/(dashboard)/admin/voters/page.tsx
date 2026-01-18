import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

import { createVoterAction, deleteVoterAction, updateVoterAction } from "./actions";
import { CreateVoterForm } from "@/components/forms/create-voter-form";
import { VotersList } from "./voters-list";

type VotersPageProps = {
  searchParams?: Promise<{ search?: string }>;
};

export default async function VotersPage({ searchParams }: VotersPageProps) {
  await requireRole("admin");
  const supabase = createSupabaseAdminClient();
  const params = await searchParams;
  const search = params?.search?.trim();

  let query = supabase
    .from("voters")
    .select("id, sumaaru, name, phone, address, sex, nid, present_location, registered_box, job_in, job_by, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,nid.ilike.%${search}%,sumaaru.ilike.%${search}%`,
    );
  }

  const { data: voters } = await query;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Voters</h1>
        <p className="text-sm text-muted-foreground">Manage voter records.</p>
      </div>

      <CreateVoterForm action={createVoterAction} />

      <VotersList
        initialVoters={voters ?? []}
        search={search}
        deleteAction={deleteVoterAction}
        updateAction={updateVoterAction}
      />
    </div>
  );
}

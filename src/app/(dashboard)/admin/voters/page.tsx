import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

import { assignVoterAction, createVoterAction, deleteVoterAction } from "./actions";

type VotersPageProps = {
  searchParams?: { search?: string };
};

export default async function VotersPage({ searchParams }: VotersPageProps) {
  await requireRole("admin");
  const supabase = createSupabaseServerClient();
  const search = searchParams?.search?.trim();

  let query = supabase
    .from("voters")
    .select("id, sumaaru, name, phone, address, created_at")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,nid.ilike.%${search}%,sumaaru.ilike.%${search}%`,
    );
  }

  const { data: voters } = await query;
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Add voter</h2>
        </CardHeader>
        <CardContent>
          <form action={createVoterAction} className="grid gap-3 md:grid-cols-3">
            <Input name="sumaaru" placeholder="Sumaaru" required />
            <Input name="name" placeholder="Full name" required />
            <Input name="phone" placeholder="Phone" />
            <Input name="address" placeholder="Address" />
            <Input name="sex" placeholder="Sex" />
            <Input name="nid" placeholder="NID" />
            <Input name="present_location" placeholder="Present location" />
            <Input name="registered_box" placeholder="Registered box" />
            <Input name="job_in" placeholder="Job in" />
            <Input name="job_by" placeholder="Job by" />
            <Button type="submit" className="md:col-span-3">
              Save voter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">Voters</h2>
            <form className="flex gap-2" method="get">
              <Input name="search" placeholder="Search name, NID, Sumaaru" />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Sumaaru</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Address</TableHeaderCell>
                <TableHeaderCell>Assign</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(voters ?? []).map((voter) => (
                <TableRow key={voter.id}>
                  <TableCell>{voter.sumaaru}</TableCell>
                  <TableCell>{voter.name}</TableCell>
                  <TableCell>{voter.phone || "—"}</TableCell>
                  <TableCell>{voter.address || "—"}</TableCell>
                  <TableCell>
                    <form action={assignVoterAction} className="flex gap-2">
                      <input type="hidden" name="voterId" value={voter.id} />
                      <select
                        name="candidateId"
                        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                        required
                      >
                        <option value="">Select</option>
                        {(candidates ?? []).map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline">
                        Assign
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <form action={deleteVoterAction}>
                      <input type="hidden" name="voterId" value={voter.id} />
                      <Button type="submit" variant="ghost">
                        Delete
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

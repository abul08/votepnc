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
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateCandidateVoterAction } from "./actions";

export default async function CandidateVotersPage() {
  await requireRole("candidate");
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const { data: permissions } = await supabase
    .from("candidate_permissions")
    .select("field")
    .eq("candidate_id", candidate?.id ?? "");

  const allowedFields = (permissions ?? []).map((perm) => perm.field);
  const { data: voters } = await supabase.rpc("get_candidate_voters");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Assigned voters</h2>
          <p className="text-sm text-slate-600">
            You can update fields assigned by the admin.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Sumaaru</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                {allowedFields.map((field) => (
                  <TableHeaderCell key={field}>
                    {field.replaceAll("_", " ")}
                  </TableHeaderCell>
                ))}
                <TableHeaderCell></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(voters ?? []).map((row) => {
                const voter = row.voter ?? row;
                return (
                  <TableRow key={voter.id}>
                    <TableCell>{voter.sumaaru}</TableCell>
                    <TableCell>{voter.name}</TableCell>
                    <TableCell colSpan={allowedFields.length + 1}>
                      <form
                        action={updateCandidateVoterAction}
                        className="grid gap-2 md:grid-cols-4"
                      >
                        <input type="hidden" name="voterId" value={voter.id} />
                        {allowedFields.map((field) => (
                          <Input
                            key={field}
                            name={field}
                            defaultValue={voter[field] ?? ""}
                            placeholder={field.replaceAll("_", " ")}
                          />
                        ))}
                        <Button type="submit" variant="outline">
                          Save
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

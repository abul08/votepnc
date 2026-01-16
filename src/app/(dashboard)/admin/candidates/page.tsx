import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

import {
  createCandidateAction,
  deleteCandidateAction,
  updateCandidatePermissionsAction,
} from "./actions";

const voterFields = [
  "address",
  "phone",
  "sex",
  "nid",
  "present_location",
  "registered_box",
  "job_in",
  "job_by",
];

export default async function CandidatesPage() {
  await requireRole("admin");
  const supabase = createSupabaseServerClient();
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, phone, position, user_id, created_at")
    .order("created_at", { ascending: false });

  const { data: users } = await supabase
    .from("users")
    .select("id, username")
    .eq("role", "candidate")
    .order("created_at", { ascending: false });

  const { data: permissions } = await supabase
    .from("candidate_permissions")
    .select("candidate_id, field");

  const permissionMap = new Map<string, Set<string>>();
  (permissions ?? []).forEach((perm) => {
    const set = permissionMap.get(perm.candidate_id) ?? new Set<string>();
    set.add(perm.field);
    permissionMap.set(perm.candidate_id, set);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Add candidate</h2>
        </CardHeader>
        <CardContent>
          <form action={createCandidateAction} className="grid gap-4 md:grid-cols-4">
            <select
              name="userId"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              required
            >
              <option value="">Select candidate user</option>
              {(users ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
            <Input name="name" placeholder="Full name" required />
            <Input name="phone" placeholder="Phone" />
            <Input name="position" placeholder="Position" />
            <Button type="submit" className="md:col-span-4">
              Save candidate
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {(candidates ?? []).map((candidate) => (
          <Card key={candidate.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">{candidate.name}</h3>
                  <p className="text-xs text-slate-500">{candidate.position}</p>
                </div>
                <form action={deleteCandidateAction}>
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <Button variant="ghost" type="submit">
                    Remove
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-600">Phone: {candidate.phone || "—"}</p>
              <form action={updateCandidatePermissionsAction} className="space-y-3">
                <input type="hidden" name="candidateId" value={candidate.id} />
                <div className="grid gap-2 md:grid-cols-2">
                  {voterFields.map((field) => (
                    <label key={field} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        name="fields"
                        value={field}
                        defaultChecked={permissionMap.get(candidate.id)?.has(field)}
                      />
                      {field.replaceAll("_", " ")}
                    </label>
                  ))}
                </div>
                <Button type="submit" variant="outline">
                  Update permissions
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

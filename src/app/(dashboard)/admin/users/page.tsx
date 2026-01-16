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

import { createUserAction, deleteUserAction } from "./actions";

export default async function UsersPage() {
  await requireRole("admin");
  const supabase = createSupabaseServerClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Create user</h2>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-4 md:grid-cols-4">
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Temp password" required />
            <select
              name="role"
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              defaultValue="candidate"
            >
              <option value="admin">Admin</option>
              <option value="candidate">Candidate</option>
            </select>
            <Button type="submit">Add user</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Users</h2>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Created</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(users ?? []).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell className="capitalize">{user.role}</TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <form action={deleteUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <Button variant="ghost" type="submit">
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

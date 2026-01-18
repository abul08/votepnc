import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

import { createUserAction, deleteUserAction, updateUserAction } from "./actions";
import { CreateUserForm } from "@/components/forms/create-user-form";
import { UsersList } from "./users-list";

export default async function UsersPage() {
  await requireRole("admin");
  const supabase = createSupabaseAdminClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">Manage user accounts.</p>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Add Admin User</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            To add candidates, use the Candidates page.
          </p>
        </CardHeader>
        <CardContent>
          <CreateUserForm action={createUserAction} />
        </CardContent>
      </Card>

      <UsersList 
        initialUsers={users ?? []}
        deleteAction={deleteUserAction}
        updateAction={updateUserAction}
      />
    </div>
  );
}

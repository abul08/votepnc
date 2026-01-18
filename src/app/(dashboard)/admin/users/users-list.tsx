"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { DeleteButton } from "@/components/forms/delete-button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  username: string | null;
  role: string;
  created_at: string;
}

interface UsersListProps {
  initialUsers: User[];
  deleteAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  updateAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}

export function UsersList({ initialUsers, deleteAction, updateAction }: UsersListProps) {
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpdate(formData: FormData) {
    if (!editingUser) return;
    
    formData.append("userId", editingUser.id);
    
    startTransition(async () => {
      const result = await updateAction(formData);
      
      if (result?.error) {
        toast.error("Failed to update user", { description: result.error });
      } else {
        toast.success("User updated successfully");
        // Update local state
        const updatedUser: User = {
          ...editingUser,
          username: formData.get("username") as string,
          role: formData.get("role") as string,
        };
        setUsers(prev => prev.map(u => u.id === editingUser.id ? updatedUser : u));
        setEditingUser(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">All Users</CardTitle>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {/* Edit Modal */}
        <AlertDialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit User</AlertDialogTitle>
            </AlertDialogHeader>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdate(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Username</label>
                  <Input 
                    name="username" 
                    defaultValue={editingUser?.username ?? ""} 
                    pattern="^[a-zA-Z0-9_]+$"
                    title="Only letters, numbers, and underscores"
                    required 
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Role</label>
                  <select
                    name="role"
                    defaultValue={editingUser?.role ?? "candidate"}
                    disabled={isPending}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  >
                    <option value="admin">Admin</option>
                    <option value="candidate">Candidate</option>
                  </select>
                </div>
              </div>
              <AlertDialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <><Spinner size="sm" /> Saving...</> : "Save Changes"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3 px-4">
          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No users found.</p>
          )}
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="font-medium truncate">{user.username}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {user.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("en-GB")}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                  Edit
                </Button>
                <DeleteButton action={deleteAction} itemId={user.id} itemName="user" inputName="userId" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                        Edit
                      </Button>
                      <DeleteButton action={deleteAction} itemId={user.id} itemName="user" inputName="userId" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Candidate {
  id: string;
  name: string;
  phone: string | null;
  position: string | null;
  candidate_number: string | null;
  user_id: string;
  username?: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/candidates");
      const data = await res.json();
      
      // Merge candidates with user data to get usernames
      const users = data.users ?? [];
      const userMap = new Map<string, string>();
      users.forEach((u: { id: string; username: string }) => {
        userMap.set(u.id, u.username);
      });
      
      const candidatesWithUsernames = (data.candidates ?? []).map((c: Candidate) => ({
        ...c,
        username: userMap.get(c.user_id) || "",
      }));
      
      setCandidates(candidatesWithUsernames);
    } catch {
      toast.error("Failed to load candidates");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/candidates", {
          method: "POST",
          body: JSON.stringify({
            username: formData.get("username"),
            password: formData.get("password"),
            name: formData.get("name"),
            phone: formData.get("phone"),
            position: formData.get("position"),
            candidate_number: formData.get("candidate_number"),
          }),
          headers: { "Content-Type": "application/json" },
        });
        
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to create candidate");
          return;
        }
        
        toast.success("Candidate account created successfully");
        form.reset();
        fetchData();
      } catch {
        toast.error("Failed to create candidate");
      }
    });
  }

  async function handleDelete(candidateId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/candidates/${candidateId}`, {
          method: "DELETE",
        });
        
        if (!res.ok) {
          toast.error("Failed to remove candidate");
          return;
        }
        
        toast.success("Candidate removed");
        fetchData();
      } catch {
        toast.error("Failed to remove candidate");
      } finally {
        setDeleteId(null);
      }
    });
  }

  async function handleEdit(formData: FormData) {
    if (!editingCandidate) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/candidates/${editingCandidate.id}`, {
          method: "PUT",
          body: JSON.stringify({
            username: formData.get("username"),
            name: formData.get("name"),
            candidate_number: formData.get("candidate_number"),
            phone: formData.get("phone"),
            position: formData.get("position"),
          }),
          headers: { "Content-Type": "application/json" },
        });
        
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to update candidate");
          return;
        }
        
        toast.success("Candidate updated");
        setEditingCandidate(null);
        fetchData();
      } catch {
        toast.error("Failed to update candidate");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Candidates</h1>
        <p className="text-sm text-muted-foreground">Manage candidates and permissions.</p>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Add New Candidate</CardTitle>
          <CardDescription>
            Create a new candidate account with login credentials and profile information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Username *</label>
                <Input 
                  name="username" 
                  type="text" 
                  placeholder="e.g. john_doe" 
                  pattern="^[a-zA-Z0-9_]+$"
                  title="Only letters, numbers, and underscores"
                  required 
                  disabled={isPending} 
                  className="h-11 sm:h-9" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Password *</label>
                <Input 
                  name="password" 
                  type="password" 
                  placeholder="Minimum 6 characters" 
                  required 
                  minLength={6}
                  disabled={isPending} 
                  className="h-11 sm:h-9" 
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Full Name *</label>
                <Input 
                  name="name" 
                  placeholder="John Doe" 
                  required 
                  disabled={isPending} 
                  className="h-11 sm:h-9" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Candidate Number *</label>
                <Input 
                  name="candidate_number" 
                  placeholder="e.g. 001" 
                  required
                  disabled={isPending} 
                  className="h-11 sm:h-9" 
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <Input 
                  name="phone" 
                  placeholder="+1234567890" 
                  disabled={isPending} 
                  className="h-11 sm:h-9" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-muted-foreground">Position</label>
                <select
                  name="position"
                  disabled={isPending}
                  className="h-11 sm:h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select position</option>
                  <option value="President">President</option>
                  <option value="Member">Member</option>
                  <option value="W Member">W Member</option>
                  <option value="WDC Member">WDC Member</option>
                </select>
              </div>
            </div>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto h-11 sm:h-9">
              {isPending ? <><Spinner size="sm" /> Creating Account...</> : "Create Candidate Account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No candidates yet. Add one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg truncate">{candidate.name}</CardTitle>
                    <CardDescription className="truncate">{candidate.position || "No position"}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditingCandidate(candidate)}
                      disabled={isPending}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDeleteId(candidate.id)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Number: <span className="font-bold text-foreground">{candidate.candidate_number || "—"}</span></p>
                  <p>Username: <span className="font-mono">{candidate.username || "—"}</span></p>
                  <p>Phone: {candidate.phone || "—"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AlertDialog open={!!editingCandidate} onOpenChange={(open) => !open && setEditingCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Candidate</AlertDialogTitle>
          </AlertDialogHeader>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleEdit(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Username *</label>
                <Input 
                  name="username" 
                  defaultValue={editingCandidate?.username ?? ""} 
                  pattern="^[a-zA-Z0-9_]+$"
                  title="Only letters, numbers, and underscores"
                  required 
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name *</label>
                <Input 
                  name="name" 
                  defaultValue={editingCandidate?.name ?? ""} 
                  required 
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Candidate Number *</label>
                <Input 
                  name="candidate_number" 
                  defaultValue={editingCandidate?.candidate_number ?? ""} 
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone</label>
                <Input 
                  name="phone" 
                  defaultValue={editingCandidate?.phone ?? ""} 
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Position</label>
                <select
                  name="position"
                  defaultValue={editingCandidate?.position ?? ""}
                  disabled={isPending}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value="">Select position</option>
                  <option value="President">President</option>
                  <option value="Member">Member</option>
                  <option value="W Member">W Member</option>
                </select>
              </div>
            </div>
            <AlertDialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingCandidate(null)}
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this candidate? This will delete their account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)} disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDelete(deleteId)} 
              disabled={isPending}
            >
              {isPending ? <><Spinner size="sm" /> Removing...</> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

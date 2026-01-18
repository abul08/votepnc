"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Voter {
  id: string;
  name: string;
  phone: string | null;
  present_location: string | null;
}

interface PendingEdit {
  field_name: string;
  new_value: string;
  status: string;
}

interface CandidateInfo {
  name: string;
  candidate_number: string | null;
  position: string | null;
}

// Icons
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

export default function CandidateVotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([]);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Map<string, PendingEdit[]>>(new Map());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredVoters(voters);
    } else {
      const term = search.toLowerCase();
      setFilteredVoters(
        voters.filter(
          (v) =>
            v.name.toLowerCase().includes(term) ||
            v.phone?.toLowerCase().includes(term) ||
            v.present_location?.toLowerCase().includes(term)
        )
      );
    }
  }, [search, voters]);

  async function fetchData() {
    try {
      const res = await fetch("/api/candidate/voters");
      const data = await res.json();
      setVoters(data.voters ?? []);
      setFilteredVoters(data.voters ?? []);
      if (data.candidate) {
        setCandidateInfo(data.candidate);
      }
    } catch {
      toast.error("Failed to load voters");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchPendingEdits(voterId: string) {
    try {
      const res = await fetch(`/api/candidate/voters/${voterId}/edit-request`);
      const data = await res.json();
      const pending = (data.requests ?? []).filter((r: PendingEdit) => r.status === "pending");
      setPendingEdits(prev => new Map(prev).set(voterId, pending));
    } catch {
      // Ignore errors
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingVoter) return;

    const formData = new FormData(e.currentTarget);
    const newPhone = formData.get("phone") as string;
    const newLocation = formData.get("present_location") as string;

    startTransition(async () => {
      try {
        let submitted = false;

        // Submit phone edit if changed
        if (newPhone !== (editingVoter.phone ?? "")) {
          const res = await fetch(`/api/candidate/voters/${editingVoter.id}/edit-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field_name: "phone", new_value: newPhone }),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "Failed to submit phone edit");
            return;
          }
          submitted = true;
        }

        // Submit location edit if changed
        if (newLocation !== (editingVoter.present_location ?? "")) {
          const res = await fetch(`/api/candidate/voters/${editingVoter.id}/edit-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field_name: "present_location", new_value: newLocation }),
          });
          if (!res.ok) {
            const data = await res.json();
            toast.error(data.error || "Failed to submit location edit");
            return;
          }
          submitted = true;
        }

        if (submitted) {
          toast.success("Edit request submitted", {
            description: "Your changes will be applied after admin approval.",
          });
          fetchPendingEdits(editingVoter.id);
        } else {
          toast.info("No changes detected");
        }

        setEditingVoter(null);
      } catch {
        toast.error("Failed to submit edit request");
      }
    });
  }

  function openEditModal(voter: Voter) {
    setEditingVoter(voter);
    fetchPendingEdits(voter.id);
  }

  function getPendingValue(voterId: string, field: string): string | null {
    const edits = pendingEdits.get(voterId);
    const pending = edits?.find(e => e.field_name === field && e.status === "pending");
    return pending?.new_value ?? null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Candidate Header */}
      {candidateInfo && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
            {candidateInfo.candidate_number || "?"}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{candidateInfo.name}</h1>
            <p className="text-sm text-muted-foreground">
              {candidateInfo.position || "Candidate"}
            </p>
          </div>
        </div>
      )}
      
      {!candidateInfo && (
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Voters</h1>
          <p className="text-sm text-muted-foreground">
            View and edit voter contact information. Total: {voters.length} voters
          </p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">Voter List</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, phone, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3 px-4">
            {filteredVoters.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {voters.length === 0 ? "No voters available." : "No voters match your search."}
              </p>
            )}
            {filteredVoters.map((voter) => (
              <div key={voter.id} className="p-4 rounded-lg border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{voter.name}</p>
                  <button
                    onClick={() => openEditModal(voter)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Edit"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    📍 {voter.present_location || "—"}
                  </p>
                  
                  {voter.phone ? (
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 border">
                      <span className="font-mono text-sm">{voter.phone}</span>
                      <div className="flex gap-0.5 border-l pl-2 ml-1">
                        <a
                          href={`tel:${voter.phone}`}
                          className="inline-flex items-center justify-center h-6 w-6 rounded text-green-600 hover:text-green-700 hover:bg-green-100 transition-colors"
                          title="Call"
                        >
                          <PhoneIcon className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`sms:${voter.phone}`}
                          className="inline-flex items-center justify-center h-6 w-6 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-colors"
                          title="Send SMS"
                        >
                          <MessageIcon className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No phone</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Present Location</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-[80px]">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVoters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {voters.length === 0 ? "No voters available." : "No voters match your search."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredVoters.map((voter) => (
                  <TableRow key={voter.id}>
                    <TableCell className="font-medium">{voter.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {voter.present_location || "—"}
                    </TableCell>
                    <TableCell>
                      {voter.phone ? (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 border">
                          <span className="font-mono text-sm">{voter.phone}</span>
                          <div className="flex gap-0.5 border-l pl-2 ml-1">
                            <a 
                              href={`tel:${voter.phone}`} 
                              title="Call"
                              className="inline-flex items-center justify-center h-6 w-6 rounded text-green-600 hover:text-green-700 hover:bg-green-100 transition-colors"
                            >
                              <PhoneIcon className="h-3.5 w-3.5" />
                            </a>
                            <a 
                              href={`sms:${voter.phone}`} 
                              title="Send SMS"
                              className="inline-flex items-center justify-center h-6 w-6 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition-colors"
                            >
                              <MessageIcon className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openEditModal(voter)}
                        className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <AlertDialog open={!!editingVoter} onOpenChange={(open) => !open && setEditingVoter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Voter: {editingVoter?.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your changes will be submitted for admin approval before being applied.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  name="phone" 
                  defaultValue={editingVoter?.phone ?? ""} 
                  placeholder="Enter phone number"
                  disabled={isPending}
                />
                {editingVoter && getPendingValue(editingVoter.id, "phone") && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                    <span className="text-muted-foreground">
                      Requested: {getPendingValue(editingVoter.id, "phone")}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Present Location</label>
                <Input 
                  name="present_location" 
                  defaultValue={editingVoter?.present_location ?? ""} 
                  placeholder="Enter present location"
                  disabled={isPending}
                />
                {editingVoter && getPendingValue(editingVoter.id, "present_location") && (
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                    <span className="text-muted-foreground">
                      Requested: {getPendingValue(editingVoter.id, "present_location")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <AlertDialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingVoter(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <><Spinner size="sm" /> Submitting...</> : "Submit for Approval"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

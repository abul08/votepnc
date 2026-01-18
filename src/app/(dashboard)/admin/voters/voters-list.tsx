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
import { Spinner } from "@/components/ui/spinner";
import { DeleteButton } from "@/components/forms/delete-button";

interface Voter {
  id: string;
  sumaaru: string;
  name: string;
  phone: string | null;
  address: string | null;
  sex: string | null;
  nid: string | null;
  present_location: string | null;
  registered_box: string | null;
  job_in: string | null;
  job_by: string | null;
}

interface VotersListProps {
  initialVoters: Voter[];
  search?: string;
  deleteAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  updateAction: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
}

export function VotersList({ 
  initialVoters, 
  search,
  deleteAction,
  updateAction,
}: VotersListProps) {
  const [voters, setVoters] = useState(initialVoters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleUpdate(voterId: string, formData: FormData) {
    formData.append("voterId", voterId);
    
    startTransition(async () => {
      const result = await updateAction(formData);
      
      if (result?.error) {
        toast.error("Failed to update voter", { description: result.error });
      } else {
        toast.success("Voter updated successfully");
        setEditingId(null);
        // Update local state
        const updatedVoter: Voter = {
          id: voterId,
          sumaaru: formData.get("sumaaru") as string,
          name: formData.get("name") as string,
          phone: formData.get("phone") as string || null,
          address: formData.get("address") as string || null,
          sex: formData.get("sex") as string || null,
          nid: formData.get("nid") as string || null,
          present_location: formData.get("present_location") as string || null,
          registered_box: formData.get("registered_box") as string || null,
          job_in: formData.get("job_in") as string || null,
          job_by: formData.get("job_by") as string || null,
        };
        setVoters(prev => prev.map(v => v.id === voterId ? updatedVoter : v));
      }
    });
  }

  const editingVoter = voters.find(v => v.id === editingId);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg">Voter List</CardTitle>
          <form className="flex gap-2" method="get">
            <Input
              name="search"
              placeholder="Search..."
              defaultValue={search}
              className="h-9 w-full sm:w-48"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {/* Edit Modal */}
        {editingVoter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold">Edit Voter</h3>
                <p className="text-sm text-muted-foreground">Update voter information</p>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdate(editingVoter.id, new FormData(e.currentTarget));
                }}
                className="p-4 space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Sumaaru *</label>
                    <Input 
                      name="sumaaru" 
                      defaultValue={editingVoter.sumaaru} 
                      required 
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Name *</label>
                    <Input 
                      name="name" 
                      defaultValue={editingVoter.name} 
                      required 
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      name="phone" 
                      defaultValue={editingVoter.phone ?? ""} 
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Address</label>
                    <Input 
                      name="address" 
                      defaultValue={editingVoter.address ?? ""} 
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Sex</label>
                    <select
                      name="sex"
                      defaultValue={editingVoter.sex ?? ""}
                      disabled={isPending}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Select</option>
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">NID</label>
                    <Input 
                      name="nid" 
                      defaultValue={editingVoter.nid ?? ""} 
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Present Location</label>
                    <Input 
                      name="present_location" 
                      defaultValue={editingVoter.present_location ?? ""} 
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Registered Box</label>
                    <select
                      name="registered_box"
                      defaultValue={editingVoter.registered_box ?? ""}
                      disabled={isPending}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Select</option>
                      <option value="C14.1">C14.1</option>
                      <option value="C14.2">C14.2</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Job In</label>
                    <Input 
                      name="job_in" 
                      defaultValue={editingVoter.job_in ?? ""} 
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Job By</label>
                    <Input 
                      name="job_by" 
                      defaultValue={editingVoter.job_by ?? ""} 
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending ? <><Spinner size="sm" /> Saving...</> : "Save Changes"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingId(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3 px-4">
          {voters.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No voters found.</p>
          )}
          {voters.map((voter) => (
            <div key={voter.id} className="p-3 rounded-lg border space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-medium">{voter.name}</p>
                  <p className="text-xs text-muted-foreground">Sumaaru: {voter.sumaaru}</p>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingId(voter.id)}
                  >
                    Edit
                  </Button>
                  <DeleteButton action={deleteAction} itemId={voter.id} itemName="voter" inputName="voterId" />
                </div>
              </div>
              {voter.phone && (
                <p className="text-sm text-muted-foreground">📞 {voter.phone}</p>
              )}
              {voter.address && (
                <p className="text-sm text-muted-foreground truncate">📍 {voter.address}</p>
              )}
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumaaru</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No voters found.
                  </TableCell>
                </TableRow>
              )}
              {voters.map((voter) => (
                <TableRow key={voter.id}>
                  <TableCell className="font-medium font-mono text-xs">{voter.sumaaru}</TableCell>
                  <TableCell>{voter.name}</TableCell>
                  <TableCell className="text-muted-foreground">{voter.phone || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{voter.address || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingId(voter.id)}
                      >
                        Edit
                      </Button>
                      <DeleteButton action={deleteAction} itemId={voter.id} itemName="voter" inputName="voterId" />
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

"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EditRequest {
  id: string;
  voter_id: string;
  candidate_id: string;
  voter_name: string;
  candidate_name: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
}

export default function EditRequestsPage() {
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [actionRequest, setActionRequest] = useState<{ request: EditRequest; action: "approve" | "reject" } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/edit-requests");
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      toast.error("Failed to load edit requests");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction(requestId: string, action: "approve" | "reject") {
    startTransition(async () => {
      try {
        const method = action === "approve" ? "POST" : "DELETE";
        const res = await fetch(`/api/admin/edit-requests/${requestId}`, {
          method,
        });
        
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || `Failed to ${action} request`);
          return;
        }

        toast.success(action === "approve" ? "Edit approved and applied" : "Edit request rejected");
        fetchData();
      } catch {
        toast.error(`Failed to ${action} request`);
      } finally {
        setActionRequest(null);
      }
    });
  }

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Requests</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve voter edit requests from candidates.
        </p>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            Pending Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            These requests need your review before changes are applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3 px-4">
            {pendingRequests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No pending requests.
              </p>
            )}
            {pendingRequests.map((request) => (
              <div key={request.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{request.voter_name}</p>
                    <p className="text-xs text-muted-foreground">
                      by {request.candidate_name}
                    </p>
                  </div>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {request.field_name.replace("_", " ")}
                  </Badge>
                </div>
                
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">From:</span> {request.old_value || "—"}</p>
                  <p><span className="text-muted-foreground">To:</span> <span className="font-medium">{request.new_value}</span></p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => setActionRequest({ request, action: "approve" })}
                    disabled={isPending}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setActionRequest({ request, action: "reject" })}
                    disabled={isPending}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voter</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Current Value</TableHead>
                  <TableHead>New Value</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No pending requests.
                    </TableCell>
                  </TableRow>
                )}
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.voter_name}</TableCell>
                    <TableCell>{request.candidate_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {request.field_name.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[150px] truncate">
                      {request.old_value || "—"}
                    </TableCell>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {request.new_value}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(request.created_at).toLocaleDateString("en-GB")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="sm" 
                          onClick={() => setActionRequest({ request, action: "approve" })}
                          disabled={isPending}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setActionRequest({ request, action: "reject" })}
                          disabled={isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Recent History</CardTitle>
            <CardDescription>
              Previously processed edit requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voter</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.slice(0, 20).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.voter_name}</TableCell>
                      <TableCell>{request.candidate_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {request.field_name.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground">{request.old_value || "—"}</span>
                        <span className="mx-1">→</span>
                        <span>{request.new_value}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={request.status === "approved" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {request.reviewed_at 
                          ? new Date(request.reviewed_at).toLocaleDateString("en-GB")
                          : "—"
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile view for history */}
            <div className="block sm:hidden space-y-3 px-4">
              {processedRequests.slice(0, 10).map((request) => (
                <div key={request.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{request.voter_name}</span>
                    <Badge 
                      variant={request.status === "approved" ? "default" : "destructive"}
                      className="capitalize text-xs"
                    >
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {request.field_name.replace("_", " ")}: {request.old_value || "—"} → {request.new_value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionRequest} onOpenChange={(open) => !open && setActionRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionRequest?.action === "approve" ? "Approve Edit Request" : "Reject Edit Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionRequest?.action === "approve" ? (
                <>
                  This will update <strong>{actionRequest.request.voter_name}</strong>&apos;s {actionRequest.request.field_name.replace("_", " ")} to <strong>{actionRequest.request.new_value}</strong>.
                </>
              ) : (
                <>
                  This will reject the edit request. The voter&apos;s information will remain unchanged.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => actionRequest && handleAction(actionRequest.request.id, actionRequest.action)}
              disabled={isPending}
            >
              {isPending ? <Spinner size="sm" /> : actionRequest?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

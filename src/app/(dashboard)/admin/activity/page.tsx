import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

export default async function ActivityPage() {
  await requireRole("admin");
  const supabase = createSupabaseAdminClient();
  
  // Get activity logs with user info
  const { data: logs } = await supabase
    .from("activity_log")
    .select("id, action, timestamp, metadata, user_id")
    .order("timestamp", { ascending: false })
    .limit(100);

  // Get all user devices
  const { data: devices } = await supabase
    .from("user_devices")
    .select("id, user_id, device_name, ip_address, user_agent, created_at")
    .order("created_at", { ascending: false });

  // Get user details for all user_ids (from logs and devices)
  const logUserIds = (logs ?? []).map(log => log.user_id);
  const deviceUserIds = (devices ?? []).map(device => device.user_id);
  const userIds = [...new Set([...logUserIds, ...deviceUserIds])];
  const { data: users } = await supabase
    .from("users")
    .select("id, username, role")
    .in("id", userIds);

  const userMap = new Map(
    (users ?? []).map(user => [user.id, { username: user.username, role: user.role }])
  );

  function formatMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata || Object.keys(metadata).length === 0) return "—";
    
    const parts: string[] = [];
    if (metadata.fields && Array.isArray(metadata.fields)) {
      parts.push(`Fields: ${(metadata.fields as string[]).join(", ")}`);
    }
    if (metadata.voter_id) {
      parts.push(`Voter: ${String(metadata.voter_id).slice(0, 8)}...`);
    }
    if (metadata.candidate_name) {
      parts.push(`Candidate: ${metadata.candidate_name}`);
    }
    if (metadata.username) {
      parts.push(`User: ${metadata.username}`);
    }
    
    return parts.length > 0 ? parts.join(" | ") : JSON.stringify(metadata);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">All user activities and logged-in devices.</p>
      </div>

      {/* User Devices Section */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Logged-in Devices</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3 px-4">
            {(devices ?? []).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No devices registered.</p>
            )}
            {(devices ?? []).map((device) => {
              const user = userMap.get(device.user_id);
              return (
                <div key={device.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{device.device_name}</span>
                    <Badge variant={user?.role === "admin" ? "default" : "outline"} className="text-xs capitalize">
                      {user?.role ?? "—"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>User: {user?.username ?? "Unknown"}</p>
                    <p>IP: {device.ip_address ?? "Unknown"}</p>
                    <p>Logged in: {new Date(device.created_at).toLocaleString("en-GB")}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Logged In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(devices ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No devices registered.
                    </TableCell>
                  </TableRow>
                )}
                {(devices ?? []).map((device) => {
                  const user = userMap.get(device.user_id);
                  return (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        {user?.username ?? "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user?.role === "admin" ? "default" : "outline"} className="capitalize">
                          {user?.role ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{device.device_name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.ip_address ?? "Unknown"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(device.created_at).toLocaleString("en-GB")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3 px-4">
            {(logs ?? []).length === 0 && (
              <p className="text-center text-muted-foreground py-4">No activity yet.</p>
            )}
            {(logs ?? []).map((log) => {
              const user = userMap.get(log.user_id);
              return (
                <div key={log.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {log.action.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("en-GB")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{user?.username ?? "Unknown"}</span>
                    <Badge variant={user?.role === "admin" ? "default" : "outline"} className="text-xs capitalize">
                      {user?.role ?? "—"}
                    </Badge>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      {formatMetadata(log.metadata)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No activity yet.
                    </TableCell>
                  </TableRow>
                )}
                {(logs ?? []).map((log) => {
                  const user = userMap.get(log.user_id);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(log.timestamp).toLocaleString("en-GB")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {user?.username ?? "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user?.role === "admin" ? "default" : "outline"} className="capitalize">
                          {user?.role ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                        {formatMetadata(log.metadata)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

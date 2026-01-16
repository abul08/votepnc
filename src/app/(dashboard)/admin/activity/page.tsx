import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export default async function ActivityPage() {
  await requireRole("admin");
  const supabase = createSupabaseServerClient();
  const { data: logs } = await supabase
    .from("activity_log")
    .select("id, action, timestamp, metadata, user_id")
    .order("timestamp", { ascending: false })
    .limit(50);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Activity log</h2>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Time</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell>Meta</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(logs ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {new Date(log.timestamp).toLocaleString("en-GB")}
                </TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.user_id}</TableCell>
                <TableCell className="text-xs text-slate-500">
                  {JSON.stringify(log.metadata)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export default async function AdminDashboard() {
  await requireRole("admin");
  const supabase = createSupabaseServerClient();

  const [
    { count: voterCount },
    { count: candidateCount },
    { data: activity },
    { data: voterCreators },
    { data: lastCsv },
  ] = await Promise.all([
    supabase.from("voters").select("id", { count: "exact", head: true }),
    supabase.from("candidates").select("id", { count: "exact", head: true }),
    supabase
      .from("activity_log")
      .select("id, action, timestamp")
      .order("timestamp", { ascending: false })
      .limit(5),
    supabase.from("voters").select("created_by").limit(500),
    supabase
      .from("activity_log")
      .select("id, timestamp, metadata")
      .eq("action", "csv_import")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const counts = new Map<string, number>();
  (voterCreators ?? []).forEach((row) => {
    if (!row.created_by) return;
    counts.set(row.created_by, (counts.get(row.created_by) ?? 0) + 1);
  });

  const topCreatorIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const { data: creatorUsers } = await supabase
    .from("users")
    .select("id, username")
    .in("id", topCreatorIds);

  const creatorMap = new Map(
    (creatorUsers ?? []).map((user) => [user.id, user.username]),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Total voters</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{voterCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Active candidates</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{candidateCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Recent logins</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              {(activity ?? []).map((item) => (
                <li key={item.id}>
                  {item.action} ·{" "}
                  {new Date(item.timestamp).toLocaleString("en-GB")}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">
              Voters added by candidates
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              {topCreatorIds.length === 0 && <li>No data yet.</li>}
              {topCreatorIds.map((id) => (
                <li key={id}>
                  {creatorMap.get(id) ?? id} · {counts.get(id) ?? 0}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Last CSV import</p>
          </CardHeader>
          <CardContent>
            {lastCsv ? (
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  {new Date(lastCsv.timestamp).toLocaleString("en-GB")}
                </p>
                <p>Inserted: {lastCsv.metadata?.inserted ?? 0}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No imports yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

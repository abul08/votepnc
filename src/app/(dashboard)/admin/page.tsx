import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { Suspense } from "react";

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

async function DashboardStats() {
  const supabase = createSupabaseAdminClient();

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
    <>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Voters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold">{voterCount ?? 0}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold">{candidateCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Last Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastCsv ? (
              <div className="space-y-1">
                <p className="text-lg sm:text-xl font-semibold">
                  {(lastCsv.metadata as { inserted?: number })?.inserted ?? 0} records
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastCsv.timestamp).toLocaleString("en-GB")}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No imports</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 sm:space-y-3">
              {(activity ?? []).length === 0 && (
                <li className="text-muted-foreground text-sm">No recent activity.</li>
              )}
              {(activity ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium capitalize truncate">{item.action.replace("_", " ")}</span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString("en-GB")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>


      </div>
    </>
  );
}

export default async function AdminDashboard() {
  await requireRole("admin");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of the voter database.</p>
      </div>

      <Suspense fallback={
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      }>
        <DashboardStats />
      </Suspense>
    </div>
  );
}

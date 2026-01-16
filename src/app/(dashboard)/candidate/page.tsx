import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export default async function CandidateDashboard() {
  await requireRole("candidate");
  const supabase = createSupabaseServerClient();

  const { count: voterCount } = await supabase
    .from("voter_assignments")
    .select("voter_id", { count: "exact", head: true });

  const { data: activity } = await supabase
    .from("activity_log")
    .select("id, action, timestamp")
    .order("timestamp", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Assigned voters</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{voterCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase text-slate-500">Recent activity</p>
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
      </div>
    </div>
  );
}

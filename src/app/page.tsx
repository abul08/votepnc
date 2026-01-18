import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Spinner } from "@/components/ui/spinner";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use admin client to bypass RLS when fetching user role
  try {
    const adminClient = createSupabaseAdminClient();
    const { data } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (data?.role === "admin") {
      redirect("/admin");
    }

    if (data?.role === "candidate") {
      redirect("/candidate");
    }
  } catch {
    // Fallback to dashboard if admin client fails
    redirect("/dashboard");
  }

  // Fallback if user is authenticated but has no recognized role
  redirect("/dashboard");

  // This return is never reached but makes TypeScript happy
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

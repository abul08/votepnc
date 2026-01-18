import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getUserRole() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Use admin client to bypass RLS
  try {
    const adminClient = createSupabaseAdminClient();
    const { data } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return data?.role ?? null;
  } catch {
    // Fallback to regular client if admin client fails
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    return data?.role ?? null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(role: "admin" | "candidate") {
  const userRole = await getUserRole();
  if (!userRole) {
    redirect("/login");
  }
  if (userRole !== role) {
    redirect("/dashboard");
  }
  return userRole;
}

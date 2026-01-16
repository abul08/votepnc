"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const requestHeaders = headers();
    const userAgent = requestHeaders.get("user-agent") ?? "unknown";
    const ip = requestHeaders.get("x-forwarded-for") ?? "unknown";

    await supabase.from("activity_log").insert({
      user_id: user.id,
      action: "login",
      metadata: { ip, userAgent },
    });
  }

  redirect("/dashboard");
}

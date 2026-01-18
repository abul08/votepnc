import { redirect } from "next/navigation";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default async function DashboardRouter() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Use admin client to bypass RLS and check/create user
  let data: { role: string } | null = null;
  
  try {
    const adminClient = createSupabaseAdminClient();
    
    // Check if user exists in users table (using admin client to bypass RLS)
    const { data: existingUser } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (existingUser) {
      data = existingUser;
    } else {
      // User doesn't exist, create them
      const username = user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`;
      
      const { data: newUser, error } = await adminClient
        .from("users")
        .insert({
          id: user.id,
          username: username,
          email: user.email,
          role: "candidate",
        })
        .select("role")
        .single();

      if (error) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <Card className="w-full max-w-sm sm:max-w-md">
              <CardHeader>
                <CardTitle className="text-destructive text-lg sm:text-xl">Setup Error</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Could not create your account. Please contact an administrator.
                </p>
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                  {error.message}
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Back to Login</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );
      }
      data = newUser;
    }
  } catch {
    // Admin client might not be configured - try regular client
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    
    if (userData) {
      data = userData;
    } else {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="w-full max-w-sm sm:max-w-md">
            <CardHeader>
              <CardTitle className="text-amber-600 text-lg sm:text-xl">Setup Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your account needs to be set up by an administrator.
              </p>
              <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded break-all">
                ID: {user.id}
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">Back to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  if (data?.role === "admin") {
    redirect("/admin");
  }

  if (data?.role === "candidate") {
    redirect("/candidate");
  }

  // Loading / redirecting state
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <Spinner size="lg" className="mx-auto" />
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}

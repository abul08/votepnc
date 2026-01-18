"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createBrowserClient } from "@supabase/ssr";

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    
    try {
      // Get the current session to obtain the refresh token
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { session } } = await supabase.auth.getSession();
      const refreshToken = session?.refresh_token;

      // Call logout API with refresh token to revoke this device
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          refresh_token: refreshToken 
        }),
        credentials: "include",
      });

      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Redirect anyway
      window.location.href = "/login";
    }
  }

  return (
    <Button 
      type="button" 
      variant="ghost" 
      size="sm" 
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? <Spinner size="sm" /> : "Sign out"}
    </Button>
  );
}

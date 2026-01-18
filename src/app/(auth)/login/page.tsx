"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        toast.error("Server error", {
          description: "Invalid response format. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error("Login failed", {
          description: result.error || "Please check your credentials.",
        });
        setIsLoading(false);
      } else {
        // Register this device for tracking
        if (result.refresh_token) {
          try {
            await fetch("/api/device/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                refresh_token: result.refresh_token 
              }),
              credentials: "include",
            });
          } catch {
            // Device registration is non-critical, continue to dashboard
            console.warn("Device registration failed");
          }
        }

        toast.success("Welcome back!", {
          description: "Redirecting to dashboard...",
        });
        // Small delay for toast to show
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      }
    } catch (err) {
      toast.error("Connection error", {
        description: err instanceof Error ? err.message : "Please check your internet connection.",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8 sm:py-12">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="space-y-1 text-center sm:text-left">
          <CardTitle className="text-xl sm:text-2xl font-bold">Sign in</CardTitle>
          {/* <CardDescription>
            Access the voter database
          </CardDescription> */}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                name="username" 
                type="text" 
                placeholder="Enter your username"
                autoComplete="username"
                required 
                disabled={isLoading}
                className="h-11 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="••••••••"
                autoComplete="current-password"
                required 
                disabled={isLoading}
                className="h-11 sm:h-9"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-9" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

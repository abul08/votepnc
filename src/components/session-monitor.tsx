"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const WARNING_TIME_BEFORE_EXPIRY = 2 * 60 * 1000; // Warn 2 minutes before expiry
const ACTIVITY_CHECK_INTERVAL = 30000; // Check every 30 seconds

export function SessionMonitor() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const lastActivityTime = useRef<number>(Date.now());
  const warningShown = useRef<boolean>(false);

  useEffect(() => {
    // Track user activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    function updateActivity() {
      lastActivityTime.current = Date.now();
      warningShown.current = false;
      setShowWarning(false);
      setTimeRemaining(null);
    }

    // Add event listeners for all activity events
    activityEvents.forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    // Check inactivity periodically
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime.current;
      const timeUntilExpiry = INACTIVITY_TIMEOUT - timeSinceLastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        // Session expired due to inactivity
        setIsExpired(true);
        return;
      }

      // Show warning if within warning time and not already shown
      if (
        timeUntilExpiry <= WARNING_TIME_BEFORE_EXPIRY &&
        timeUntilExpiry > 0 &&
        !warningShown.current
      ) {
        setShowWarning(true);
        setTimeRemaining(timeUntilExpiry);
        warningShown.current = true;
      } else if (timeUntilExpiry > WARNING_TIME_BEFORE_EXPIRY) {
        // Reset warning if user becomes active again
        if (warningShown.current) {
          setShowWarning(false);
          setTimeRemaining(null);
          warningShown.current = false;
        }
      }

      // Update remaining time if warning is shown
      if (showWarning && timeUntilExpiry > 0) {
        setTimeRemaining(timeUntilExpiry);
      }
    }, ACTIVITY_CHECK_INTERVAL);

    return () => {
      // Cleanup event listeners
      activityEvents.forEach((event) => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(checkInterval);
    };
  }, [showWarning]);

  async function handleExtendSession() {
    // Reset activity time
    lastActivityTime.current = Date.now();
    warningShown.current = false;
    setShowWarning(false);
    setTimeRemaining(null);
    toast.success("Session extended");
  }

  async function handleLogout() {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { session } } = await supabase.auth.getSession();
      const refreshToken = session?.refresh_token;

      // Call logout API
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: "include",
      });

      // Redirect to login
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  }

  // Handle expired session
  useEffect(() => {
    if (isExpired) {
      toast.error("Your session has expired due to inactivity. Please log in again.");
      handleLogout();
    }
  }, [isExpired]);

  function formatTimeRemaining(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  return (
    <AlertDialog open={showWarning && !isExpired} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Inactivity Warning</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive for {Math.floor((INACTIVITY_TIMEOUT - (timeRemaining || 0)) / 60000)} minutes.
            Your session will expire in {timeRemaining ? formatTimeRemaining(timeRemaining) : "a few moments"} due to inactivity.
            Click "Stay Logged In" to continue your session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button 
            onClick={handleLogout} 
            variant="destructive"
            className="mt-2 sm:mt-0"
          >
            Log Out
          </Button>
          <AlertDialogAction onClick={handleExtendSession}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

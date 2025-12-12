"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

import { getApiBase } from "../lib/apiBase";

const API_BASE = getApiBase();

// Track auth status and reason separately to handle server errors vs auth failures
type AuthState = "loading" | "authenticated" | "unauthenticated" | "server_error";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const checkInProgress = useRef(false);
  const lastCheckTime = useRef<number>(0);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if we're on login page (used in multiple places)
  const isLoginPage = pathname === "/login" || pathname === "/login/";

  // Main auth check effect - ALWAYS called (hooks must be in same order)
  useEffect(() => {
    // Skip protection entirely for login page
    if (isLoginPage) {
      setAuthState("authenticated");
      return;
    }

    // Prevent multiple simultaneous checks and rate limiting
    const now = Date.now();
    if (checkInProgress.current || now - lastCheckTime.current < 2000) {
      return;
    }

    let isMounted = true;
    checkInProgress.current = true;
    lastCheckTime.current = now;

    async function checkAuth() {
      try {
        const res = await fetch(`${API_BASE}/api/user/current`, {
          credentials: "include",
        });

        if (!isMounted) return;

        if (res.ok) {
          setAuthState("authenticated");
        } else if (res.status === 401) {
          // Not authenticated - this is a valid auth failure, redirect to login
          setAuthState("unauthenticated");
        } else if (res.status === 500 || res.status === 503) {
          // Server error (database down, etc.) - DON'T redirect, show error
          console.error(`Server error (${res.status}) - database may be unavailable`);
          setAuthState("server_error");
        } else {
          // Other error codes - treat as server error, don't redirect
          console.error("Auth check failed with status:", res.status);
          setAuthState("server_error");
        }
      } catch (err) {
        console.error("Auth check failed (network error):", err);
        if (!isMounted) return;
        // Network errors - treat as server error, don't redirect
        setAuthState("server_error");
      } finally {
        checkInProgress.current = false;
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router, isLoginPage]);

  // Redirect effect - ALWAYS called (hooks must be in same order)
  useEffect(() => {
    // Clear any existing timer
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    // ONLY redirect on explicit auth failure (401), NOT on server errors
    // This prevents redirect loops when the database is down
    if (authState === "unauthenticated" && !isLoginPage && pathname !== "/login") {
      // Use a delay to prevent rapid redirects
      redirectTimerRef.current = setTimeout(() => {
        if (authState === "unauthenticated" && pathname !== "/login" && pathname !== "/login/") {
          router.replace("/login");
        }
      }, 500);
    }

    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [authState, isLoginPage, router, pathname]);

  // Skip all checks for login page - render children directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading state while checking auth
  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Server error - show error message instead of redirecting
  if (authState === "server_error") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-zinc-900 mb-2">Service Temporarily Unavailable</h1>
          <p className="text-zinc-600 mb-4">
            Unable to connect to the server. Please try again in a moment.
          </p>
          <button
            onClick={() => {
              setAuthState("loading");
              lastCheckTime.current = 0;
            }}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated, show redirecting message
  if (authState === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}




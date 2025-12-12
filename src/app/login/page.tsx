"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { getApiBase } from "../../lib/apiBase";

const API_BASE = getApiBase();

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is already authenticated
  useEffect(() => {
    async function checkIfAuthenticated() {
      try {
        const res = await fetch(`${API_BASE}/api/user/current`, {
          credentials: "include",
        });
        if (res.ok) {
          // Already logged in, redirect to dashboard
          router.replace("/dashboard");
        } else if (res.status === 500 || res.status === 503) {
          // Server/Database error - show login form with warning
          console.error(`Server error (${res.status}) - database may be unavailable`);
          setError("Server connection issues. Login may not work.");
          setCheckingAuth(false);
        } else {
          // Not authenticated (401) - show login form
          setCheckingAuth(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // Network error - show login form with warning
        setError("Unable to connect to server. Please check your connection.");
        setCheckingAuth(false);
      }
    }
    checkIfAuthenticated();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div>
          <p className="mt-4 text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      // Try to parse JSON response
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // If not JSON, read as text
        const text = await res.text();
        console.error("Non-JSON response:", text);
      }

      if (res.ok && data?.success) {
        // Login successful - verify cookie is set before redirecting
        // This prevents redirect loop where ProtectedRoute checks auth before cookie is set
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Double-check authentication before redirecting
        const verifyRes = await fetch(`${API_BASE}/api/user/current`, {
          credentials: "include",
        });
        
        if (verifyRes.ok) {
          router.replace("/dashboard");
        } else {
          // Cookie not set yet, wait a bit more
          await new Promise(resolve => setTimeout(resolve, 300));
          router.replace("/dashboard");
        }
      } else if (res.status === 401 || (data && !data.success)) {
        // Invalid credentials
        setError(data?.message || "Invalid username or password");
      } else if (res.status === 302) {
        // Redirect response (backend login page)
        // Check if we're actually logged in
        const checkRes = await fetch(`${API_BASE}/api/user/current`, {
          credentials: "include",
        });
        if (checkRes.ok) {
          router.replace("/dashboard");
        } else {
          setError("Login failed. Please try again.");
        }
      } else {
        // Other error
        setError(data?.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-zinc-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">
              GaadiMech CRM
            </h1>
            <p className="text-zinc-600">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-4 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-semibold hover:bg-zinc-800 active:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


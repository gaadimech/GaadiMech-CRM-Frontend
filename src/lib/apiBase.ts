// Centralized API base URL configuration
// This ensures all API calls use relative paths in production

export function getApiBase(): string {
  if (typeof window === "undefined") {
    // Server-side rendering - use empty string for relative paths
    return "";
  }

  // Check environment variable first
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (envBase) {
    return envBase;
  }

  // Only use localhost:5000 if we're actually on localhost:3000 (local development)
  const origin = window.location.origin;
  if (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000") {
    return "http://localhost:5000";
  }

  // Production - use relative paths (empty string)
  return "";
}


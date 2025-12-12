/**
 * Date utilities for IST timezone handling
 * Backend stores dates in UTC, we need to display them in IST (UTC+5:30)
 */

/**
 * Get today's date in IST timezone as YYYY-MM-DD string
 * This gets the current date in IST (India Standard Time)
 */
export function getTodayIST(): string {
  // Get current time in IST
  const now = new Date();
  // IST is UTC+5:30
  const istString = now.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = istString.split("/");
  return `${year}-${month}-${day}`;
}

/**
 * Format date string (UTC ISO) to IST date display
 */
export function formatDateIST(dateIso: string): string {
  if (!dateIso) return "—";
  
  const d = new Date(dateIso);
  return d.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format datetime string (UTC ISO) to IST datetime display
 */
export function formatDateTimeIST(dateIso: string): string {
  if (!dateIso) return "—";
  
  const d = new Date(dateIso);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}


import {
  BulkRescheduleRequest,
  BulkStatusRequest,
  Lead,
  QueueResponse,
  WhatsAppSendRequest,
} from "./types";

import { getApiBase } from "./apiBase";

const API_BASE = getApiBase();

async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // rely on Flask session cookies
    cache: "no-store", // Prevent caching to ensure fresh data
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `API ${res.status} ${res.statusText} for ${path}: ${text || "no body"}`
    );
  }

  return res.json() as Promise<T>;
}

export async function fetchQueue(params: {
  date?: string; // YYYY-MM-DD (IST intended)
  overdue_only?: boolean;
  user_id?: number;
}): Promise<QueueResponse> {
  const search = new URLSearchParams();
  if (params.date) search.set("date", params.date);
  if (params.overdue_only) search.set("overdue_only", "1");
  if (params.user_id) search.set("user_id", String(params.user_id));
  return apiFetch<QueueResponse>(`/api/followups/today?${search.toString()}`);
}

export async function bulkUpdateStatus(payload: BulkStatusRequest) {
  return apiFetch<{ success: boolean; message?: string }>(
    "/api/followups/bulk-status",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function bulkReschedule(payload: BulkRescheduleRequest) {
  return apiFetch<{ success: boolean; message?: string }>(
    "/api/followups/bulk-reschedule",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function sendWhatsApp(payload: WhatsAppSendRequest) {
  return apiFetch<{ success: boolean; message?: string }>(
    "/api/whatsapp/send",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

// Dashboard APIs
export async function fetchDashboardMetrics(date?: string) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  return apiFetch<{
    todays_followups: number;
    initial_assignment: number;
    completion_rate: number;
    new_leads_today: number;
    completed_followups: number;
    pending_followups: number;
  }>(`/api/dashboard/metrics?${params.toString()}`);
}

export async function fetchTeamPerformance(date?: string) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  return apiFetch<
    Array<{
      id: number;
      name: string;
      assigned: number;
      worked: number;
      pending: number;
      completion_rate: number;
      new_leads: number;
    }>
  >(`/api/dashboard/team-performance?${params.toString()}`);
}

// Followups API
export async function fetchFollowups(params: {
  search?: string;
  date?: string;
  created_date?: string;
  modified_date?: string;
  car_registration?: string;
  mobile?: string;
  status?: string;
  user_id?: string;
  page?: number;
  per_page?: number;
}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  return apiFetch<{
    leads: Lead[];
    total_pages: number;
    current_page: number;
    total: number;
  }>(`/api/followups?${search.toString()}`);
}

// Admin APIs
export async function fetchUnassignedLeads(params: {
  search?: string;
  created_date?: string;
}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return apiFetch<{
    leads: Array<{
      id: number;
      mobile: string;
      customer_name?: string;
      car_manufacturer?: string;
      car_model?: string;
      pickup_type?: string;
      service_type?: string;
      scheduled_date?: string;
      source?: string;
      remarks?: string;
      created_at: string;
      assigned_to?: string;
    }>;
  }>(`/api/admin/unassigned-leads?${search.toString()}`);
}

export async function fetchTeamMembers() {
  return apiFetch<{
    members: Array<{ id: number; name: string }>;
  }>("/api/admin/team-members");
}

export async function fetchCurrentUser() {
  return apiFetch<{
    id: number;
    username: string;
    name: string;
    is_admin: boolean;
  }>("/api/user/current");
}

export async function logout() {
  const API_BASE_LOGOUT =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" && window.location.origin === "http://localhost:3000" 
      ? "http://localhost:5000" 
      : ""); // Empty string means relative paths (same origin)
  
  await fetch(`${API_BASE_LOGOUT}/logout`, {
    method: "GET",
    credentials: "include",
  });
}


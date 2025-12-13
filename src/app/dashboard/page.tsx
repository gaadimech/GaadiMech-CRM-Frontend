"use client";

import { useEffect, useState } from "react";
import StatusBadge from "../../components/StatusBadge";
import ActionButtons from "../../components/ActionButtons";
import LeadDetailDialog from "../../components/LeadDetailDialog";
import { fetchQueue, fetchTeamMembers, fetchCurrentUser, triggerSnapshot } from "../../lib/api";
import type { QueueItem } from "../../lib/types";
import { getTodayIST, formatDateIST, formatDateTimeIST } from "../../lib/dateUtils";

import { getApiBase } from "../../lib/apiBase";

const API_BASE = getApiBase();

interface DashboardMetrics {
  todays_followups: number;
  initial_assignment: number;
  completion_rate: number;
  new_leads_today: number;
  completed_followups: number;
  pending_followups: number;
}

interface TeamMember {
  id: number;
  name: string;
  assigned: number;
  worked: number;
  pending: number;
  completion_rate: number;
  new_leads: number;
}

interface TeamMemberOption {
  id: number;
  name: string;
  username: string;
}

function formatTime(dateIso: string) {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  return d.toLocaleTimeString("en-IN", { 
    timeZone: "Asia/Kolkata",
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

function formatDate(dateIso: string) {
  if (!dateIso) return "";
  // Use formatDateIST to ensure proper IST conversion
  const formatted = formatDateIST(dateIso);
  // Extract just the date part (day month) without year for display
  const parts = formatted.split(" ");
  return `${parts[0]} ${parts[1]}`;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamMember[]>([]);
  const [todaysFollowups, setTodaysFollowups] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayIST());
  const [selectedTeamMember, setSelectedTeamMember] = useState<number | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingLead, setEditingLead] = useState<QueueItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [fixingCount, setFixingCount] = useState(false);
  const [fixCountMessage, setFixCountMessage] = useState<string | null>(null);

  // Fetch current user and team members on mount
  useEffect(() => {
    async function loadUserAndTeam() {
      try {
        const user = await fetchCurrentUser();
        // Admin check - is_admin is a boolean from the API
        const isAdminValue = Boolean(user.is_admin);
        setIsAdmin(isAdminValue);
        console.log("[Dashboard] User admin status:", user.is_admin, "Type:", typeof user.is_admin, "Resolved to:", isAdminValue);
        
        // Only fetch team members if user is admin
        if (isAdminValue) {
          try {
            const teamData = await fetchTeamMembers();
            setTeamMembers((teamData.members || []).map(m => ({ id: m.id, name: m.name, username: m.name })));
          } catch (err) {
            console.error("Failed to load team members:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    }
    loadUserAndTeam();
    // Note: Removed periodic polling - user status doesn't need to be checked every 10 seconds
    // ProtectedRoute handles authentication checks
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [selectedDate, selectedTeamMember]);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      if (selectedTeamMember) {
        params.set("user_id", String(selectedTeamMember));
      }

      // Fetch dashboard metrics
      const metricsRes = await fetch(
        `${API_BASE}/api/dashboard/metrics?${params.toString()}`,
        { credentials: "include" }
      );
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      // Fetch team performance
      const teamRes = await fetch(
        `${API_BASE}/api/dashboard/team-performance?${params.toString()}`,
        { credentials: "include" }
      );
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamPerformance(teamData);
      }

      // Fetch today's followups (show all like the old UI)
      const queueData = await fetchQueue({ 
        date: selectedDate,
        user_id: selectedTeamMember || undefined
      });
      
      // Sort by status priority (most important first)
      // Priority order: New Lead > Feedback > Confirmed > Open > Completed > Needs Followup > Did not Pick up
      const statusPriority: Record<string, number> = {
        "New Lead": 0,              // First priority
        "Feedback": 1,              // Second priority
        "Confirmed": 2,            // Third priority
        "Open": 3,                  // Fourth priority
        "Completed": 4,             // Fifth priority
        "Needs Followup": 5,        // Sixth priority
        "Did Not Pick Up": 6,       // Seventh priority
      };
      
      const sortedItems = (queueData.items || []).sort((a, b) => {
        // Normalize status strings (trim whitespace)
        const statusA = (a.status || "").trim();
        const statusB = (b.status || "").trim();
        
        // Get priority (default to 99 for unknown statuses)
        const priorityA = statusPriority[statusA] ?? 99;
        const priorityB = statusPriority[statusB] ?? 99;
        
        // Sort by priority (lower number = higher priority = comes first)
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        // If same priority, sort by followup_date (earlier first)
        const dateA = a.followup_date ? new Date(a.followup_date).getTime() : 0;
        const dateB = b.followup_date ? new Date(b.followup_date).getTime() : 0;
        return dateA - dateB;
      });
      
      setTodaysFollowups(sortedItems);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFixCount() {
    if (!isAdmin) {
      setFixCountMessage("Only admins can fix counts");
      setTimeout(() => setFixCountMessage(null), 3000);
      return;
    }

    setFixingCount(true);
    setFixCountMessage(null);
    try {
      const result = await triggerSnapshot();
      if (result.success) {
        setFixCountMessage("Count fixed successfully! Refreshing dashboard...");
        // Reload dashboard to show updated counts
        await loadDashboard();
        setTimeout(() => setFixCountMessage(null), 3000);
      } else {
        setFixCountMessage(result.message || "Failed to fix count");
        setTimeout(() => setFixCountMessage(null), 5000);
      }
    } catch (err: any) {
      console.error("Failed to fix count:", err);
      setFixCountMessage(err.message || "Failed to fix count");
      setTimeout(() => setFixCountMessage(null), 5000);
    } finally {
      setFixingCount(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">Dashboard</h1>
              <p className="text-sm text-zinc-600">Overview of today's activities</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && teamMembers.length > 0 && (
                <select
                  value={selectedTeamMember || ""}
                  onChange={(e) => setSelectedTeamMember(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 sm:flex-none min-w-0 px-3 py-2.5 border border-zinc-300 rounded-xl text-sm bg-white touch-manipulation"
                >
                  <option value="">All Team Members</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 sm:flex-none min-w-0 px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
              />
              {isAdmin && (
                <button
                  onClick={handleFixCount}
                  disabled={fixingCount}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
                >
                  {fixingCount ? "Fixing..." : "Fix Count"}
                </button>
              )}
              <button
                onClick={loadDashboard}
                className="px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 active:bg-zinc-700 transition touch-manipulation"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Fix Count Message */}
        {fixCountMessage && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${
            fixCountMessage.includes("successfully") 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {fixCountMessage}
          </div>
        )}

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mb-4 sm:mb-6 lg:grid-cols-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-sm">
              <p className="text-xs sm:text-sm opacity-90 mb-1">Today's Followups</p>
              <p className="text-2xl sm:text-3xl font-bold">
                {metrics.todays_followups}
              </p>
              <p className="text-xs opacity-80 mt-1">
                {metrics.pending_followups} pending
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-sm">
              <p className="text-xs sm:text-sm opacity-90 mb-1">Initial Assignment</p>
              <p className="text-2xl sm:text-3xl font-bold">
                {metrics.initial_assignment}
              </p>
              <p className="text-xs opacity-80 mt-1">Fixed at 5:00 AM IST</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-sm">
              <p className="text-xs sm:text-sm opacity-90 mb-1">Completion Rate</p>
              <p className="text-2xl sm:text-3xl font-bold">
                {metrics.completion_rate.toFixed(1)}%
              </p>
              <p className="text-xs opacity-80 mt-1">
                {metrics.completed_followups} of {metrics.initial_assignment} done
              </p>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-sm">
              <p className="text-xs sm:text-sm opacity-90 mb-1">New Leads Today</p>
              <p className="text-2xl sm:text-3xl font-bold">
                {metrics.new_leads_today}
              </p>
              <p className="text-xs opacity-80 mt-1">Fresh leads added</p>
            </div>
          </div>
        )}

        {/* Today's Followups */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
              Pending Followups for {new Date(selectedDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </h2>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              {!loading && todaysFollowups.length > 0 && (
                <span className="text-sm text-zinc-500">
                  {todaysFollowups.length} total
                </span>
              )}
              {!loading && todaysFollowups.length > itemsPerPage && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center border border-zinc-300 rounded-xl hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    ←
                  </button>
                  <span className="text-sm text-zinc-600 px-2 min-w-[80px] text-center">
                    {currentPage} / {Math.ceil(todaysFollowups.length / itemsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(todaysFollowups.length / itemsPerPage), p + 1))}
                    disabled={currentPage >= Math.ceil(todaysFollowups.length / itemsPerPage)}
                    className="w-9 h-9 flex items-center justify-center border border-zinc-300 rounded-xl hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : todaysFollowups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-zinc-500 mb-2">
                No pending followups for {new Date(selectedDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </p>
              <p className="text-xs text-zinc-400">
                All followups for this date are completed or confirmed
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysFollowups
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 transition touch-manipulation"
                >
                  {/* Mobile-first card layout */}
                  <div className="flex flex-col gap-3">
                    {/* Header with name and badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 text-base">
                        {item.customer_name || "Unnamed"}
                      </h3>
                      <StatusBadge status={item.status} />
                      {item.overdue && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                    
                    {/* Contact info */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <a 
                        href={`tel:${item.mobile}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.mobile}
                      </a>
                      <span className="text-xs text-zinc-500">
                        {item.car_registration || "No reg"} • {item.followup_date ? formatDateIST(item.followup_date) : ""} {item.followup_date ? formatTime(item.followup_date) : ""}
                      </span>
                    </div>
                    
                    {/* Remarks */}
                    {item.remarks && (
                      <p className="text-sm text-zinc-600 line-clamp-2">
                        {item.remarks}
                      </p>
                    )}
                    
                    {/* Action buttons */}
                    <div className="pt-2 border-t border-zinc-100">
                      <ActionButtons 
                        lead={item} 
                        compact 
                        onEditClick={() => setEditingLead(item)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Performance */}
        {teamPerformance.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4">
              Team Performance
            </h2>
            
            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {teamPerformance.map((member, idx) => (
                <div key={member.id} className="p-4 bg-zinc-50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 flex items-center justify-center bg-zinc-900 text-white text-xs font-bold rounded-full">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-900">{member.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      member.completion_rate >= 100
                        ? "text-green-600"
                        : member.completion_rate >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}>
                      {member.completion_rate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        member.completion_rate >= 100
                          ? "bg-green-500"
                          : member.completion_rate >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(member.completion_rate, 100)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-zinc-900">{member.assigned}</p>
                      <p className="text-xs text-zinc-500">Assigned</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600">{member.worked}</p>
                      <p className="text-xs text-zinc-500">Worked</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-600">{member.pending}</p>
                      <p className="text-xs text-zinc-500">Pending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">{member.new_leads}</p>
                      <p className="text-xs text-zinc-500">New</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="text-left py-3 px-3 text-zinc-600 font-medium">
                      Rank
                    </th>
                    <th className="text-left py-3 px-3 text-zinc-600 font-medium">
                      Team Member
                    </th>
                    <th className="text-right py-3 px-3 text-zinc-600 font-medium">
                      Assigned
                    </th>
                    <th className="text-right py-3 px-3 text-zinc-600 font-medium">
                      Worked
                    </th>
                    <th className="text-right py-3 px-3 text-zinc-600 font-medium">
                      Pending
                    </th>
                    <th className="text-right py-3 px-3 text-zinc-600 font-medium">
                      Completion
                    </th>
                    <th className="text-right py-3 px-3 text-zinc-600 font-medium">
                      New Leads
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((member, idx) => (
                    <tr key={member.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="py-3 px-3 text-zinc-900 font-medium">#{idx + 1}</td>
                      <td className="py-3 px-3 font-medium text-zinc-900">
                        {member.name}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-700">
                        {member.assigned}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-700">
                        {member.worked}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-700">
                        {member.pending}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-zinc-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                member.completion_rate >= 100
                                  ? "bg-green-500"
                                  : member.completion_rate >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(member.completion_rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-600 w-12 text-right">
                            {member.completion_rate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-700">
                        {member.new_leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lead Detail Dialog */}
        <LeadDetailDialog
          lead={editingLead}
          isOpen={editingLead !== null}
          onClose={() => setEditingLead(null)}
          onUpdate={() => {
            setEditingLead(null);
            loadDashboard();
          }}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}


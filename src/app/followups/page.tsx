"use client";

import { useEffect, useState } from "react";
import StatusBadge from "../../components/StatusBadge";
import ActionButtons from "../../components/ActionButtons";
import LeadDetailDialog from "../../components/LeadDetailDialog";
import { fetchFollowups, fetchTeamMembers, fetchCurrentUser } from "../../lib/api";
import { getTodayIST, formatDateIST, formatDateTimeIST } from "../../lib/dateUtils";
import type { Lead, LeadStatus } from "../../lib/types";

import { getApiBase } from "../../lib/apiBase";

const API_BASE = getApiBase();

const STATUS_OPTIONS: LeadStatus[] = [
  "All Status",
  "New Lead",
  "Needs Followup",
  "Did Not Pick Up",
  "Confirmed",
  "Open",
  "Completed",
  "Feedback",
] as any;

export default function FollowupsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: number; name: string }>>([]);
  const [filters, setFilters] = useState({
    search: "",
    followup_date: getTodayIST(), // Default to today's date in IST
    created_date: "",
    modified_date: "",
    car_registration: "",
    mobile: "",
    status: "All Status" as string,
    user_id: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Load user and team members on mount
  useEffect(() => {
    async function loadUserAndTeam() {
      try {
        const user = await fetchCurrentUser();
        setIsAdmin(user.is_admin || false);
        
        if (user.is_admin) {
          try {
            const teamData = await fetchTeamMembers();
            setTeamMembers(teamData.members || []);
          } catch (err) {
            console.error("Failed to load team members:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    }
    loadUserAndTeam();
  }, []);

  useEffect(() => {
    loadFollowups();
  }, [filters, page]);

  async function loadFollowups() {
    setLoading(true);
    try {
      const data = await fetchFollowups({
        search: filters.search || undefined,
        date: filters.followup_date || undefined,
        created_date: filters.created_date || undefined,
        modified_date: filters.modified_date || undefined,
        car_registration: filters.car_registration || undefined,
        mobile: filters.mobile || undefined,
        status: filters.status !== "All Status" ? filters.status : undefined,
        user_id: filters.user_id || undefined,
        page,
        per_page: 50,
      });
      
      setLeads(data.leads || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load followups:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page on filter change
  }

  function handleReset() {
    setFilters({
      search: "",
      followup_date: getTodayIST(), // Reset to today
      created_date: "",
      modified_date: "",
      car_registration: "",
      mobile: "",
      status: "All Status",
      user_id: "",
    });
    setPage(1);
  }

  function handleRowClick(lead: Lead) {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  }

  function handleDialogClose() {
    setIsDialogOpen(false);
    setSelectedLead(null);
  }

  function handleDialogUpdate() {
    loadFollowups();
  }

  async function handleEdit(lead: Lead) {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  }

  async function handleDelete(lead: Lead) {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete lead for ${lead.customer_name || lead.mobile}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/followups/${lead.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        loadFollowups();
      } else {
        alert("Failed to delete lead");
      }
    } catch (err) {
      console.error("Error deleting lead:", err);
      alert("Error deleting lead");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-1">View Followups</h1>
          <p className="text-sm text-zinc-600">Search and filter all leads</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 mb-4 sm:mb-6 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isAdmin && teamMembers.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Team Member
                </label>
                <select
                  name="user_id"
                  value={filters.user_id}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white touch-manipulation"
                >
                  <option value="">All Team Members</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Search
              </label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Name, mobile, car..."
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Followup Date
              </label>
              <input
                type="date"
                name="followup_date"
                value={filters.followup_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Created Date
              </label>
              <input
                type="date"
                name="created_date"
                value={filters.created_date}
                onChange={handleFilterChange}
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Car Registration
              </label>
              <input
                type="text"
                name="car_registration"
                value={filters.car_registration}
                onChange={handleFilterChange}
                placeholder="Registration number"
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={loadFollowups}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 active:bg-zinc-700 transition touch-manipulation"
            >
              Search
            </button>
            <button
              onClick={handleReset}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
              All Leads ({total} total)
            </h2>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 flex items-center justify-center border border-zinc-300 rounded-xl hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  aria-label="Previous page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm text-zinc-600 px-3 min-w-[80px] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 flex items-center justify-center border border-zinc-300 rounded-xl hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  aria-label="Next page"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No leads found</div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-zinc-100">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => handleRowClick(lead)}
                    className="p-4 hover:bg-zinc-50 active:bg-zinc-100 transition touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-zinc-900 truncate">
                          {lead.customer_name || "Unnamed"}
                        </h3>
                        <a
                          href={`tel:${lead.mobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-medium text-blue-600"
                        >
                          {lead.mobile}
                        </a>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                    
                    <div className="text-xs text-zinc-500 mb-3 space-y-0.5">
                      <p>Followup: {formatDateIST(lead.followup_date)}</p>
                      {lead.remarks && (
                        <p className="text-zinc-600 line-clamp-1">{lead.remarks}</p>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100" onClick={(e) => e.stopPropagation()}>
                      <ActionButtons lead={lead} compact />
                      <button
                        onClick={() => handleEdit(lead)}
                        className="px-3 py-1.5 text-xs font-medium border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 touch-manipulation"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(lead)}
                          className="px-3 py-1.5 text-xs font-medium border border-red-300 rounded-lg text-red-700 hover:bg-red-50 active:bg-red-100 touch-manipulation"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                        Customer
                      </th>
                      <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                        Mobile
                      </th>
                      <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                        Followup
                      </th>
                      <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                        Remarks
                      </th>
                      <th className="text-left py-3 px-4 text-zinc-700 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => handleRowClick(lead)}
                        className="border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer"
                      >
                        <td className="py-3 px-4 text-zinc-900 font-medium">
                          {lead.customer_name || "Unnamed"}
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={`tel:${lead.mobile}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline"
                          >
                            {lead.mobile}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-zinc-700">
                          {formatDateIST(lead.followup_date)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">
                          {lead.remarks || "—"}
                        </td>
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <ActionButtons lead={lead} compact />
                            <button
                              onClick={() => handleEdit(lead)}
                              className="px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-100"
                            >
                              Edit
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(lead)}
                                className="px-2.5 py-1.5 text-xs border border-red-300 rounded-lg text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lead Detail Dialog */}
      <LeadDetailDialog
        lead={selectedLead}
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onUpdate={handleDialogUpdate}
        isAdmin={isAdmin}
      />
    </div>
  );
}

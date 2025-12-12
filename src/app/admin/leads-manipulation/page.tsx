"use client";

import { useEffect, useState } from "react";
import { getApiBase } from "../../../lib/apiBase";

const API_BASE = getApiBase();

interface Lead {
  id: number;
  customer_name: string;
  mobile: string;
  car_registration?: string | null;
  car_model?: string | null;
  followup_date: string;
  status: string;
  remarks?: string | null;
  creator_id: number;
  creator_name?: string;
  created_at?: string;
  modified_at?: string;
}

interface User {
  id: number;
  name: string;
  username: string;
  is_admin: boolean;
}

export default function LeadsManipulationPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [operationType, setOperationType] = useState<"date" | "user" | "both" | "distributed">("date");
  const [newDate, setNewDate] = useState("");
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [distStartDate, setDistStartDate] = useState("");
  const [distEndDate, setDistEndDate] = useState("");
  const [leadsPerDay, setLeadsPerDay] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Filter states
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  useEffect(() => {
    loadUsers();
    loadLeads();
  }, [filterFromDate, filterToDate, filterUserId, filterStatus, filterSearch]);

  async function loadUsers() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }

  async function loadLeads() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Build date range filter
      if (filterFromDate) {
        params.set("date_from", filterFromDate);
      }
      if (filterToDate) {
        params.set("date_to", filterToDate);
      }
      if (filterUserId) {
        params.set("user_id", filterUserId);
      }
      if (filterStatus) {
        params.set("status", filterStatus);
      }
      if (filterSearch) {
        params.set("search", filterSearch);
      }

      const res = await fetch(
        `${API_BASE}/api/admin/leads-manipulation/search?${params.toString()}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      } else {
        const errorData = await res.json().catch(() => ({ error: "Failed to load leads" }));
        setMessage({ type: "error", text: errorData.error || "Failed to load leads" });
      }
    } catch (err) {
      console.error("Failed to load leads:", err);
      setMessage({ type: "error", text: "Failed to load leads" });
    } finally {
      setLoading(false);
    }
  }

  function handleSelectLead(leadId: number) {
    setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  }

  function handleSelectAll() {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l.id)));
    }
  }

  async function handleBulkUpdate() {
    if (selectedLeads.size === 0) {
      setMessage({ type: "error", text: "Please select at least one lead" });
      return;
    }

    if (operationType === "date" && !newDate) {
      setMessage({ type: "error", text: "Please select a new date" });
      return;
    }

    if (operationType === "user" && (!fromUserId || !toUserId)) {
      setMessage({ type: "error", text: "Please select both source and target users" });
      return;
    }

    if (operationType === "both" && (!newDate || !fromUserId || !toUserId)) {
      setMessage({ type: "error", text: "Please fill all required fields" });
      return;
    }

    if (operationType === "distributed") {
      if (!distStartDate || !distEndDate || !leadsPerDay) {
        setMessage({ type: "error", text: "Please fill all distributed date fields" });
        return;
      }
      const leadsPerDayNum = parseInt(leadsPerDay);
      if (isNaN(leadsPerDayNum) || leadsPerDayNum <= 0) {
        setMessage({ type: "error", text: "Leads per day must be a positive number" });
        return;
      }
      const startDate = new Date(distStartDate);
      const endDate = new Date(distEndDate);
      if (startDate > endDate) {
        setMessage({ type: "error", text: "Start date must be before or equal to end date" });
        return;
      }
    }

    const confirmMsg = operationType === "distributed"
      ? `Are you sure you want to distribute ${selectedLeads.size} lead(s) across ${distStartDate} to ${distEndDate} with ${leadsPerDay} leads per day?`
      : `Are you sure you want to update ${selectedLeads.size} lead(s)?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }

    setProcessing(true);
    setMessage(null);
    setProgress({ current: 0, total: selectedLeads.size, percentage: 0 });
    setShowSummary(false);
    setSummaryData(null);

    try {
      const payload: any = {
        lead_ids: Array.from(selectedLeads),
        operation_type: operationType,
      };

      if (operationType === "date" || operationType === "both") {
        payload.new_followup_date = newDate;
      }

      if (operationType === "user" || operationType === "both") {
        payload.from_user_id = parseInt(fromUserId);
        payload.to_user_id = parseInt(toUserId);
      }

      if (operationType === "distributed") {
        payload.dist_start_date = distStartDate;
        payload.dist_end_date = distEndDate;
        payload.leads_per_day = parseInt(leadsPerDay);
        if (fromUserId && toUserId) {
          payload.from_user_id = parseInt(fromUserId);
          payload.to_user_id = parseInt(toUserId);
        }
      }

      // Simulate progress updates (since backend processes all at once, we'll show estimated progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev.percentage >= 90) return prev;
          const increment = Math.min(10, (selectedLeads.size / 100) || 1);
          const newCurrent = Math.min(prev.current + increment, selectedLeads.size * 0.9);
          return {
            current: Math.floor(newCurrent),
            total: selectedLeads.size,
            percentage: Math.min(90, (newCurrent / selectedLeads.size) * 100),
          };
        });
      }, 100);

      const res = await fetch(`${API_BASE}/api/admin/leads-manipulation/bulk-update`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setProgress({ current: selectedLeads.size, total: selectedLeads.size, percentage: 100 });

      const data = await res.json();

      if (res.ok) {
        // Store summary data
        if (data.detailed_stats) {
          setSummaryData(data.detailed_stats);
          setShowSummary(true);
        }

        const successMsg = operationType === "distributed"
          ? `Successfully distributed ${data.updated_count} lead(s) across ${data.distribution_summary || "the date range"}`
          : `Successfully updated ${data.updated_count} lead(s)`;
        
        setMessage({
          type: "success",
          text: successMsg,
        });
        setSelectedLeads(new Set());
        setNewDate("");
        setFromUserId("");
        setToUserId("");
        setDistStartDate("");
        setDistEndDate("");
        setLeadsPerDay("");
        // Reload leads after a short delay
        setTimeout(() => {
          loadLeads();
        }, 1000);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update leads" });
      }
    } catch (err) {
      console.error("Failed to update leads:", err);
      setMessage({ type: "error", text: "Failed to update leads. Please try again." });
    } finally {
      setProcessing(false);
      setTimeout(() => {
        setProgress({ current: 0, total: 0, percentage: 0 });
      }, 2000);
    }
  }

  // Quick filter: Find missed leads (followup date before a certain date)
  function handleQuickFilterMissed() {
    const today = new Date();
    today.setDate(today.getDate() - 1); // Yesterday
    const yesterdayStr = today.toISOString().split("T")[0];
    setFilterToDate(yesterdayStr);
    setFilterFromDate("");
    setFilterUserId("");
    setFilterStatus("");
    setFilterSearch("");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-1">
            Leads Manipulation
          </h1>
          <p className="text-sm text-zinc-600">
            Bulk operations: Transfer leads between dates and users
          </p>
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-xl ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Progress Bar */}
        {processing && progress.total > 0 && (
          <div className="mb-4 bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700">
                Processing leads...
              </span>
              <span className="text-sm font-semibold text-zinc-900">
                {progress.current} / {progress.total} ({Math.round(progress.percentage)}%)
              </span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column: Filters */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4">
                Filters
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Follow-up Date From
                  </label>
                  <input
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Follow-up Date To
                  </label>
                  <input
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Assigned User
                  </label>
                  <select
                    value={filterUserId}
                    onChange={(e) => setFilterUserId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="New Lead">New Lead</option>
                    <option value="Needs Followup">Needs Followup</option>
                    <option value="Did Not Pick Up">Did Not Pick Up</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Open">Open</option>
                    <option value="Completed">Completed</option>
                    <option value="Feedback">Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Search
                  </label>
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Name, mobile, car..."
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleQuickFilterMissed}
                  className="w-full px-3 py-2 bg-orange-100 text-orange-700 rounded-xl font-medium hover:bg-orange-200 transition text-sm"
                >
                  Find Missed Leads (Before Today)
                </button>
              </div>
            </div>

            {/* Bulk Operation Panel */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 mb-4">
                Bulk Operation
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Operation Type
                  </label>
                  <select
                    value={operationType}
                    onChange={(e) =>
                      setOperationType(e.target.value as "date" | "user" | "both" | "distributed")
                    }
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  >
                    <option value="date">Change Date Only</option>
                    <option value="user">Transfer User Only</option>
                    <option value="both">Change Date + Transfer User</option>
                    <option value="distributed">Distribute Across Date Range</option>
                  </select>
                </div>

                {(operationType === "date" || operationType === "both") && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      New Follow-up Date *
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    />
                  </div>
                )}

                {operationType === "distributed" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                        Distribution Start Date *
                      </label>
                      <input
                        type="date"
                        value={distStartDate}
                        onChange={(e) => setDistStartDate(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                        Distribution End Date *
                      </label>
                      <input
                        type="date"
                        value={distEndDate}
                        onChange={(e) => setDistEndDate(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                        Leads Per Day (Additional) *
                      </label>
                      <input
                        type="number"
                        value={leadsPerDay}
                        onChange={(e) => setLeadsPerDay(e.target.value)}
                        required
                        min="1"
                        placeholder="e.g., 50"
                        className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Number of additional leads per day (existing leads are considered)
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                        Transfer User (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={fromUserId}
                          onChange={(e) => setFromUserId(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        >
                          <option value="">From (All)</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={toUserId}
                          onChange={(e) => setToUserId(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        >
                          <option value="">To (Keep Same)</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {(operationType === "user" || operationType === "both") && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                        From User *
                      </label>
                      <select
                        value={fromUserId}
                        onChange={(e) => setFromUserId(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      >
                        <option value="">Select user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                        To User *
                      </label>
                      <select
                        value={toUserId}
                        onChange={(e) => setToUserId(e.target.value)}
                        required
                        className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                      >
                        <option value="">Select user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <div className="text-xs text-zinc-600 mb-2">
                    Selected: {selectedLeads.size} lead(s)
                  </div>
                  <button
                    onClick={handleBulkUpdate}
                    disabled={processing || selectedLeads.size === 0}
                    className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 active:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? "Processing..." : "Apply Bulk Update"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Leads List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold text-zinc-900">
                  Leads ({leads.length})
                </h2>
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-zinc-600 hover:text-zinc-900 font-medium"
                >
                  {selectedLeads.size === leads.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : leads.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No leads found. Adjust your filters.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
                  {leads.map((lead) => {
                    const isSelected = selectedLeads.has(lead.id);
                    const followupDate = lead.followup_date
                      ? new Date(lead.followup_date).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A";

                    return (
                      <div
                        key={lead.id}
                        className={`p-3.5 border rounded-xl transition cursor-pointer ${
                          isSelected
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 hover:bg-zinc-50"
                        }`}
                        onClick={() => handleSelectLead(lead.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectLead(lead.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-zinc-900 truncate">
                                  {lead.customer_name}
                                </p>
                                <a
                                  href={`tel:${lead.mobile}`}
                                  className="text-sm font-medium text-blue-600"
                                >
                                  {lead.mobile}
                                </a>
                              </div>
                              <div className="flex flex-col gap-1 items-end flex-shrink-0">
                                <span className="text-xs text-zinc-500">
                                  {followupDate}
                                </span>
                                <span className="px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-800 rounded-full">
                                  {lead.status}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-zinc-500">
                              <span>
                                {lead.car_model || "No car"} • {lead.creator_name || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && summaryData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900">Operation Summary</h2>
                <button
                  onClick={() => {
                    setShowSummary(false);
                    setSummaryData(null);
                  }}
                  className="p-2 hover:bg-zinc-100 rounded-lg transition"
                >
                  <svg
                    className="w-5 h-5 text-zinc-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Overall Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs font-medium text-blue-600 mb-1">Total Selected</p>
                  <p className="text-2xl font-bold text-blue-900">{summaryData.total_leads_selected}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-xs font-medium text-green-600 mb-1">Successfully Updated</p>
                  <p className="text-2xl font-bold text-green-900">{summaryData.total_leads_updated}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <p className="text-xs font-medium text-orange-600 mb-1">Not Updated</p>
                  <p className="text-2xl font-bold text-orange-900">{summaryData.leads_not_updated || 0}</p>
                </div>
              </div>

              {/* Distribution Details */}
              {summaryData.date_range && (
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <h3 className="font-semibold text-zinc-900 mb-3">Distribution Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-600 mb-1">Date Range</p>
                      <p className="font-medium text-zinc-900">
                        {new Date(summaryData.date_range.start).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })} - {new Date(summaryData.date_range.end).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-600 mb-1">Total Days</p>
                      <p className="font-medium text-zinc-900">{summaryData.date_range.days} days</p>
                    </div>
                    <div>
                      <p className="text-zinc-600 mb-1">Leads Per Day Limit</p>
                      <p className="font-medium text-zinc-900">{summaryData.leads_per_day_limit} leads/day</p>
                    </div>
                    {summaryData.average_leads_per_day && (
                      <div>
                        <p className="text-zinc-600 mb-1">Average Leads Per Day</p>
                        <p className="font-medium text-zinc-900">{summaryData.average_leads_per_day} leads</p>
                      </div>
                    )}
                    {summaryData.max_leads_in_day !== undefined && (
                      <>
                        <div>
                          <p className="text-zinc-600 mb-1">Max Leads in a Day</p>
                          <p className="font-medium text-zinc-900">{summaryData.max_leads_in_day} leads</p>
                        </div>
                        <div>
                          <p className="text-zinc-600 mb-1">Min Leads in a Day</p>
                          <p className="font-medium text-zinc-900">{summaryData.min_leads_in_day} leads</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* User Transfer Details */}
              {summaryData.user_transfer && (
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <h3 className="font-semibold text-zinc-900 mb-3">User Transfer</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="text-zinc-600 mb-1">From</p>
                      <p className="font-medium text-zinc-900">
                        {summaryData.user_transfer.from_user_name || `User ID: ${summaryData.user_transfer.from_user_id}`}
                      </p>
                    </div>
                    <div className="text-zinc-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-zinc-600 mb-1">To</p>
                      <p className="font-medium text-zinc-900">
                        {summaryData.user_transfer.to_user_name || `User ID: ${summaryData.user_transfer.to_user_id}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Distribution by Date */}
              {summaryData.distribution_by_date && Object.keys(summaryData.distribution_by_date).length > 0 && (
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <h3 className="font-semibold text-zinc-900 mb-3">Distribution by Date</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(summaryData.distribution_by_date)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, count]: [string, any]) => (
                        <div key={date} className="flex items-center justify-between p-2 bg-white rounded-lg">
                          <span className="text-sm font-medium text-zinc-700">
                            {new Date(date).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              weekday: "short",
                            })}
                          </span>
                          <span className="text-sm font-semibold text-zinc-900">{count} leads</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Operation Type */}
              {summaryData.operation_type && (
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <h3 className="font-semibold text-zinc-900 mb-2">Operation Type</h3>
                  <p className="text-sm text-zinc-700 capitalize">
                    {summaryData.operation_type === "date" && "Change Date Only"}
                    {summaryData.operation_type === "user" && "Transfer User Only"}
                    {summaryData.operation_type === "both" && "Change Date + Transfer User"}
                    {summaryData.operation_type === "distributed" && "Distribute Across Date Range"}
                  </p>
                  {summaryData.new_followup_date && (
                    <p className="text-sm text-zinc-600 mt-2">
                      New Follow-up Date: {new Date(summaryData.new_followup_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => {
                  setShowSummary(false);
                  setSummaryData(null);
                }}
                className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


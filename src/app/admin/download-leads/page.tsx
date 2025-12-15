"use client";

import { useEffect, useState } from "react";
import { getApiBase } from "../../../lib/apiBase";

const API_BASE = getApiBase();

interface TeamMember {
  id: number;
  name: string;
  username: string;
}

export default function DownloadLeadsPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // Filter states
  const [filterType, setFilterType] = useState<"created_date" | "followup_date" | "date_range">("followup_date");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  
  // Metrics
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  useEffect(() => {
    // Update metrics when filters change
    if (shouldFetchCount()) {
      fetchLeadCount();
    } else {
      setLeadCount(null);
      setLastOperation(null);
    }
  }, [filterType, date, startDate, endDate, selectedUserIds]);

  function shouldFetchCount(): boolean {
    if (filterType === "date_range") {
      return startDate !== "" && endDate !== "";
    } else {
      return date !== "";
    }
  }

  async function loadTeamMembers() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/team-members`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch (err) {
      console.error("Failed to load team members:", err);
    }
  }

  async function fetchLeadCount() {
    if (!shouldFetchCount()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("filter_type", filterType);
      
      if (filterType === "date_range") {
        params.set("start_date", startDate);
        params.set("end_date", endDate);
      } else {
        params.set("date", date);
      }
      
      selectedUserIds.forEach((userId) => {
        params.append("user_ids", userId.toString());
      });

      const res = await fetch(
        `${API_BASE}/api/admin/download-leads/count?${params.toString()}`,
        { credentials: "include" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setLeadCount(data.count || 0);
        
        // Update last operation description
        let operationDesc = `Filtered by ${filterType === "created_date" ? "Created Date" : filterType === "followup_date" ? "Followup Date" : "Date Range"}`;
        if (filterType === "date_range") {
          operationDesc += `: ${startDate} to ${endDate}`;
        } else {
          operationDesc += `: ${date}`;
        }
        if (selectedUserIds.length > 0) {
          const selectedNames = teamMembers
            .filter((m) => selectedUserIds.includes(m.id))
            .map((m) => m.name)
            .join(", ");
          operationDesc += ` | Users: ${selectedNames}`;
        } else {
          operationDesc += ` | Users: All`;
        }
        setLastOperation(operationDesc);
        setMessage(null);
      } else {
        const errorData = await res.json().catch(() => ({ error: "Failed to fetch count" }));
        setMessage({ type: "error", text: errorData.error || "Failed to fetch lead count" });
      }
    } catch (err) {
      console.error("Failed to fetch lead count:", err);
      setMessage({ type: "error", text: "Failed to fetch lead count" });
    } finally {
      setLoading(false);
    }
  }

  function handleUserToggle(userId: number) {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  }

  function handleSelectAllUsers() {
    if (selectedUserIds.length === teamMembers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(teamMembers.map((m) => m.id));
    }
  }

  async function handleDownload() {
    if (!shouldFetchCount()) {
      setMessage({ type: "error", text: "Please select date filters" });
      return;
    }

    if (leadCount === null || leadCount === 0) {
      setMessage({ type: "error", text: "No leads found matching the criteria" });
      return;
    }

    setDownloading(true);
    setMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("filter_type", filterType);
      
      if (filterType === "date_range") {
        params.set("start_date", startDate);
        params.set("end_date", endDate);
      } else {
        params.set("date", date);
      }
      
      selectedUserIds.forEach((userId) => {
        params.append("user_ids", userId.toString());
      });

      const res = await fetch(
        `${API_BASE}/api/admin/download-leads/export?${params.toString()}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = res.headers.get("Content-Disposition");
        let filename = "leads.csv";
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setMessage({ type: "success", text: `Successfully downloaded ${leadCount} leads` });
      } else {
        const errorData = await res.json().catch(() => ({ error: "Failed to download CSV" }));
        setMessage({ type: "error", text: errorData.error || "Failed to download CSV" });
      }
    } catch (err) {
      console.error("Failed to download CSV:", err);
      setMessage({ type: "error", text: "Failed to download CSV" });
    } finally {
      setDownloading(false);
    }
  }

  function getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-1">Download Leads</h1>
          <p className="text-sm text-zinc-600">Filter and download leads in CSV format for WhatsApp bulk messaging</p>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Filter Criteria</h2>

          {/* Filter Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Filter By
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setFilterType("followup_date");
                  setDate("");
                  setStartDate("");
                  setEndDate("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === "followup_date"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Followup Date
              </button>
              <button
                onClick={() => {
                  setFilterType("created_date");
                  setDate("");
                  setStartDate("");
                  setEndDate("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === "created_date"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Created Date
              </button>
              <button
                onClick={() => {
                  setFilterType("date_range");
                  setDate("");
                  setStartDate("");
                  setEndDate("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterType === "date_range"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Date Range
              </button>
            </div>
          </div>

          {/* Date Inputs */}
          {filterType === "date_range" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                {filterType === "created_date" ? "Created Date" : "Followup Date"}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={getTodayDate()}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
          )}

          {/* User Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700">
                Team Members (Optional)
              </label>
              <button
                onClick={handleSelectAllUsers}
                className="text-sm text-zinc-600 hover:text-zinc-900 underline"
              >
                {selectedUserIds.length === teamMembers.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="border border-zinc-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-sm text-zinc-500">Loading team members...</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(member.id)}
                        onChange={() => handleUserToggle(member.id)}
                        className="w-4 h-4 text-zinc-900 border-zinc-300 rounded focus:ring-zinc-900"
                      />
                      <span className="text-sm text-zinc-700">{member.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {selectedUserIds.length === 0
                ? "No users selected - will include all users"
                : `${selectedUserIds.length} user(s) selected`}
            </p>
          </div>
        </div>

        {/* Metrics Card */}
        {leadCount !== null && (
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Results</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                <span className="text-sm font-medium text-zinc-700">Total Leads Found</span>
                <span className="text-2xl font-bold text-zinc-900">{leadCount}</span>
              </div>
              
              {lastOperation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-1">Last Operation</p>
                  <p className="text-sm text-blue-800">{lastOperation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Download Button */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4 sm:p-6">
          <button
            onClick={handleDownload}
            disabled={downloading || !shouldFetchCount() || leadCount === null || leadCount === 0}
            className={`w-full py-3 px-4 rounded-lg font-medium transition ${
              downloading || !shouldFetchCount() || leadCount === null || leadCount === 0
                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950"
            }`}
          >
            {downloading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Downloading...
              </span>
            ) : (
              "Download CSV"
            )}
          </button>
          <p className="text-xs text-zinc-500 mt-2 text-center">
            CSV will contain phone_number column with all matching lead phone numbers
          </p>
        </div>
      </div>
    </div>
  );
}




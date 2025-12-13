"use client";

import { useEffect, useState } from "react";
import VoiceInputButton from "../../../components/VoiceInputButton";

import { getApiBase } from "../../../lib/apiBase";

const API_BASE = getApiBase();

interface UnassignedLead {
  id: number;
  mobile: string;
  customer_name?: string;
  car_model?: string; // Combined manufacturer and model
  pickup_type?: string;
  service_type?: string;
  scheduled_date?: string;
  source?: string;
  remarks?: string;
  created_at: string;
  assigned_to?: string;
  added_to_crm?: boolean; // Track if lead has been added to CRM
  assigned_date?: string; // Date when lead was assigned
  assignment_id?: number; // TeamAssignment ID
}

interface TeamMember {
  id: number;
  name: string;
}

export default function AdminLeadsPage() {
  const [unassignedLeads, setUnassignedLeads] = useState<UnassignedLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [parseText, setParseText] = useState("");
  const [parseResult, setParseResult] = useState<any>(null);
  const [formData, setFormData] = useState(() => {
    // Set default scheduled_date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    return {
    mobile: "",
    customer_name: "",
      car_model: "", // Combined manufacturer and model
    pickup_type: "",
      service_type: "Express Car Service", // Default service type
      scheduled_date: todayStr, // Default to today
    source: "Website",
      remarks: "", // Keep empty by default
    assign_to: "",
    };
  });
  const [search, setSearch] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<UnassignedLead | null>(null);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, [search, createdDate]);

  async function loadData() {
    setLoading(true);
    try {
      // Load unassigned leads
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (createdDate) params.set("created_date", createdDate);

      const leadsRes = await fetch(
        `${API_BASE}/api/admin/unassigned-leads?${params.toString()}`,
        { credentials: "include" }
      );
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setUnassignedLeads(leadsData.leads || []);
      }

      // Load team members
      const teamRes = await fetch(`${API_BASE}/api/admin/team-members`, {
        credentials: "include",
      });
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamMembers(teamData.members || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleParseText() {
    if (!parseText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/parse-customer-text`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: parseText }),
      });

      const data = await res.json();
      
      if (res.ok && data.success && data.data) {
        setParseResult(data.data);
        // Auto-fill form if parsing successful
        // Get today's date for default scheduled_date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        // Combine manufacturer and model into single car_model field
        let combinedCarModel = "";
        if (data.data.car_manufacturer && data.data.car_model) {
          combinedCarModel = `${data.data.car_manufacturer} ${data.data.car_model}`;
        } else if (data.data.car_manufacturer) {
          combinedCarModel = data.data.car_manufacturer;
        } else if (data.data.car_model) {
          combinedCarModel = data.data.car_model;
        }
        
        // Backend automatically handles default customer name if missing
        // It will return a sequential name like "Customer 1", "Customer 2", etc.
        // from a global database counter that ensures uniqueness across all users
        
        setFormData((prev) => ({
          ...prev,
          mobile: data.data.mobile || prev.mobile,
          customer_name: data.data.customer_name || prev.customer_name,
          car_model: combinedCarModel || prev.car_model,
          service_type: data.data.service_type || "Express Car Service", // Default to Express Car Service if not parsed
          pickup_type: data.data.pickup_type || prev.pickup_type,
          scheduled_date: todayStr, // Always use today's date, ignore parsed date
          source: data.data.source || prev.source,
          remarks: "", // Keep remarks empty by default
        }));
      } else {
        // Show error message if parsing failed
        const errorMsg = data.message || 'Failed to parse text';
        alert(errorMsg);
        console.error('Parse error:', errorMsg);
      }
    } catch (err) {
      console.error("Failed to parse text:", err);
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.mobile || !formData.assign_to) {
      alert("Mobile number and team member assignment are required");
      return;
    }

    setSubmitting(true);
    const startTime = Date.now();

    try {
      const formDataToSend = new URLSearchParams();
      Object.entries(formData).forEach(([key, value]) => {
        if (value) formDataToSend.append(key, value);
      });

      const res = await fetch(`${API_BASE}/admin_leads`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formDataToSend.toString(),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`Lead assignment took ${duration}ms`);

      if (res.ok) {
        alert("Lead added and assigned successfully!");
        // Reset form with defaults
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        setFormData({
          mobile: "",
          customer_name: "",
          car_model: "",
          pickup_type: "",
          service_type: "Express Car Service",
          scheduled_date: todayStr,
          source: "Website",
          remarks: "",
          assign_to: "",
        });
        loadData();
      } else {
        const errorText = await res.text();
        alert(`Failed to add lead: ${errorText || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to add lead:", err);
      alert("Error adding lead. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteLead(leadId: number) {
    if (!confirm("Are you sure you want to delete this lead? This will also remove all assignments to team members.")) {
      return;
    }

    setDeletingLeadId(leadId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/unassigned-leads/${leadId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        // Remove from local state immediately for better UX
        setUnassignedLeads((prev) => prev.filter((lead) => lead.id !== leadId));
        alert("Lead deleted successfully!");
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        alert(`Failed to delete lead: ${errorData.error || "Unknown error"}`);
        // Reload data to sync with server
        loadData();
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert("Error deleting lead. Please try again.");
      loadData();
    } finally {
      setDeletingLeadId(null);
    }
  }

  async function handleLeadClick(lead: UnassignedLead) {
    setSelectedLead(lead);
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/unassigned-leads/${lead.id}/details`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLeadDetails(data);
      } else {
        console.error("Failed to load lead details");
        setLeadDetails(null);
      }
    } catch (err) {
      console.error("Error loading lead details:", err);
      setLeadDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-1">Admin Leads</h1>
          <p className="text-sm text-zinc-600">Manage leads and team assignments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column: AI Parser & Add Lead Form */}
          <div className="space-y-4 sm:space-y-6">
            {/* AI Text Parser */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 mb-3 sm:mb-4">
                AI Text Parser
              </h2>
              <div className="space-y-3">
                <textarea
                  value={parseText}
                  onChange={(e) => setParseText(e.target.value)}
                  placeholder="Paste customer message here..."
                  rows={5}
                  className="w-full px-3 py-3 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm touch-manipulation text-zinc-900"
                />
                <button
                  onClick={handleParseText}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 active:bg-blue-800 transition touch-manipulation"
                >
                  Parse Text
                </button>
                {parseResult && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
                    <pre className="whitespace-pre-wrap text-xs overflow-x-auto">
                      {JSON.stringify(parseResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Add New Lead Form */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-900 mb-3 sm:mb-4">
                Add New Lead & Assign
              </h2>
              <form onSubmit={handleAddLead} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                    required
                    pattern="(\+91[0-9]{10}|[0-9]{10}|91[0-9]{10})"
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    placeholder="+91"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, customer_name: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Car Model
                  </label>
                  <input
                    type="text"
                    value={formData.car_model}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, car_model: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    placeholder="Car Model"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Pickup Type
                    </label>
                    <select
                      value={formData.pickup_type}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, pickup_type: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    >
                      <option value="">Select</option>
                      <option value="Pickup">Pickup</option>
                      <option value="Self Walkin">Self Walkin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Service Type
                    </label>
                    <select
                      value={formData.service_type}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, service_type: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    >
                      <option value="">Select</option>
                      <option value="Express Car Service">Express Service</option>
                      <option value="Dent Paint">Dent Paint</option>
                      <option value="AC Service">AC Service</option>
                      <option value="Car Wash">Car Wash</option>
                      <option value="Repairs">Repairs</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, scheduled_date: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                      Source
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, source: e.target.value }))
                      }
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    >
                      <option value="Website">Website</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Chatbot">Chatbot</option>
                      <option value="Social Media">Social Media</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-zinc-700">
                      Remarks
                    </label>
                    <VoiceInputButton
                      onTranscript={(text) =>
                        setFormData((prev) => ({ ...prev, remarks: text }))
                      }
                      currentValue={formData.remarks}
                      size="sm"
                    />
                  </div>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                    placeholder="Notes or remarks (use mic for voice)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Assign to Team Member *
                  </label>
                  <select
                    value={formData.assign_to}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, assign_to: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation text-zinc-900"
                  >
                    <option value="">Select team member</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 active:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  {submitting ? "Assigning Lead..." : "+ Add Lead"}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Recent Leads */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900 mb-3 sm:mb-4">Recent Leads</h2>

            {/* Filters */}
            <div className="mb-4 space-y-2">
              <input
                type="date"
                value={createdDate}
                onChange={(e) => setCreatedDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl touch-manipulation text-zinc-900"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or car"
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl touch-manipulation text-zinc-900"
              />
            </div>

            {loading ? (
              <div className="text-center py-8 text-zinc-500">Loading...</div>
            ) : unassignedLeads.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No leads found</div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                {unassignedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => handleLeadClick(lead)}
                    className="p-3.5 border border-zinc-200 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition touch-manipulation cursor-pointer"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-900 truncate">
                            {lead.customer_name || "Unnamed"}
                          </p>
                          <a 
                            href={`tel:${lead.mobile}`}
                            className="text-sm font-medium text-blue-600"
                          >
                            {lead.mobile}
                          </a>
                        </div>
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                          {lead.assigned_to && (
                            <span className="text-xs text-blue-600 font-medium">
                              → {lead.assigned_to}
                            </span>
                          )}
                          {lead.added_to_crm && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              In CRM
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-zinc-500">
                        {lead.car_model || 'No car info'} • {lead.service_type}
                      </p>
                      
                      {lead.assigned_date && (
                        <p className="text-xs text-zinc-400 mt-1">
                          Assigned on {formatDate(lead.assigned_date)}
                        </p>
                      )}
                      
                      <div className="flex gap-2 pt-2 border-t border-zinc-100" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={`tel:${lead.mobile}`}
                          className="flex-1 px-3 py-2 bg-zinc-900 text-white text-xs font-medium rounded-lg text-center hover:bg-zinc-800 active:bg-zinc-700 transition touch-manipulation"
                        >
                          Call
                        </a>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          disabled={deletingLeadId === lead.id}
                          className="flex-1 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
                        >
                          {deletingLeadId === lead.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Details Modal */}
      {selectedLead && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm bg-zinc-900/20" 
          onClick={() => setSelectedLead(null)}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-zinc-900">Lead Details</h2>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-zinc-400 hover:text-zinc-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingDetails ? (
                <div className="text-center py-8 text-zinc-500">Loading details...</div>
              ) : (
                <div className="space-y-4">
                  {/* Basic Information */}
                  {leadDetails?.lead && (
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-sm font-semibold text-zinc-700 mb-3">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-zinc-500 mb-1">Customer Name</p>
                          <p className="text-zinc-900 font-medium">{leadDetails.lead.customer_name || "Unnamed"}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Mobile</p>
                          <a href={`tel:${leadDetails.lead.mobile}`} className="text-blue-600 font-medium hover:underline">
                            {leadDetails.lead.mobile}
                          </a>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Car Model</p>
                          <p className="text-zinc-900">{leadDetails.lead.car_model || "—"}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Service Type</p>
                          <p className="text-zinc-900">{leadDetails.lead.service_type || "—"}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Pickup Type</p>
                          <p className="text-zinc-900">{leadDetails.lead.pickup_type || "—"}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Source</p>
                          <p className="text-zinc-900">{leadDetails.lead.source || "—"}</p>
                        </div>
                        {leadDetails.lead.scheduled_date && (
                          <div>
                            <p className="text-zinc-500 mb-1">Scheduled Date</p>
                            <p className="text-zinc-900">{formatDate(leadDetails.lead.scheduled_date)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-zinc-500 mb-1">Created At</p>
                          <p className="text-zinc-900">{formatDate(leadDetails.lead.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assignment Information */}
                  {leadDetails?.assignment?.assigned_to && (
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-sm font-semibold text-zinc-700 mb-3">Assignment</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-zinc-500 mb-1">Assigned To</p>
                          <p className="text-zinc-900 font-medium">{leadDetails.assignment.assigned_to}</p>
                        </div>
                        {leadDetails.assignment.assigned_date && (
                          <div>
                            <p className="text-zinc-500 mb-1">Assigned Date</p>
                            <p className="text-zinc-900">{formatDate(leadDetails.assignment.assigned_date)}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-zinc-500 mb-1">Status</p>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            leadDetails.assignment.added_to_crm 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {leadDetails.assignment.added_to_crm ? "Added to CRM" : leadDetails.assignment.status || "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Original Remarks */}
                  {leadDetails?.lead?.remarks && (
                    <div className="border-b border-zinc-200 pb-4">
                      <h3 className="text-sm font-semibold text-zinc-700 mb-3">Original Remarks</h3>
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap">{leadDetails.lead.remarks}</p>
                    </div>
                  )}

                  {/* CRM Details (if added to CRM) */}
                  {leadDetails?.crm_lead && (
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-700 mb-3">CRM Details</h3>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-zinc-500 mb-1">Status</p>
                            <p className="text-zinc-900 font-medium">{leadDetails.crm_lead.status}</p>
                          </div>
                          {leadDetails.crm_lead.followup_date && (
                            <div>
                              <p className="text-zinc-500 mb-1">Followup Date</p>
                              <p className="text-zinc-900">{formatDate(leadDetails.crm_lead.followup_date)}</p>
                            </div>
                          )}
                          {leadDetails.crm_lead.car_registration && (
                            <div>
                              <p className="text-zinc-500 mb-1">Car Registration</p>
                              <p className="text-zinc-900">{leadDetails.crm_lead.car_registration}</p>
                            </div>
                          )}
                          {leadDetails.crm_lead.modified_at && (
                            <div>
                              <p className="text-zinc-500 mb-1">Last Modified</p>
                              <p className="text-zinc-900">{formatDate(leadDetails.crm_lead.modified_at)}</p>
                            </div>
                          )}
                        </div>
                        {leadDetails.crm_lead.remarks && (
                          <div>
                            <p className="text-zinc-500 mb-1 text-sm">CRM Remarks</p>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-green-200">
                              {leadDetails.crm_lead.remarks}
                            </p>
                          </div>
                        )}
                        {!leadDetails.crm_lead.remarks && (
                          <p className="text-sm text-zinc-500 italic">No remarks added in CRM</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


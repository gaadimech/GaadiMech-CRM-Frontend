"use client";

import { useState, useEffect } from "react";
import type { Lead, LeadStatus } from "../lib/types";
import StatusBadge from "./StatusBadge";
import { formatDateIST, formatDateTimeIST } from "../lib/dateUtils";
import VoiceInputButton from "./VoiceInputButton";

import { getApiBase } from "../lib/apiBase";

const API_BASE = getApiBase();

const STATUS_OPTIONS: LeadStatus[] = [
  "New Lead",
  "Needs Followup",
  "Did Not Pick Up",
  "Confirmed",
  "Open",
  "Completed",
  "Feedback",
];

interface LeadDetailDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isAdmin: boolean;
}

export default function LeadDetailDialog({
  lead,
  isOpen,
  onClose,
  onUpdate,
  isAdmin,
}: LeadDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    mobile: "",
    car_registration: "",
    car_model: "",
    followup_date: "",
    status: "Needs Followup" as LeadStatus,
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      // Convert followup_date from UTC ISO to IST date string (YYYY-MM-DD)
      let followupDate = "";
      if (lead.followup_date) {
        const d = new Date(lead.followup_date);
        // Get date in IST timezone
        const istString = d.toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        // Convert MM/DD/YYYY to YYYY-MM-DD
        const [month, day, year] = istString.split("/");
        followupDate = `${year}-${month}-${day}`;
      }
      
      setFormData({
        customer_name: lead.customer_name || "",
        mobile: lead.mobile || "",
        car_registration: lead.car_registration || "",
        car_model: (lead as any).car_model || "",
        followup_date: followupDate,
        status: lead.status || "Needs Followup",
        remarks: lead.remarks || "",
      });
      setIsEditing(false);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  async function handleSave() {
    if (!lead) return;
    
    setSaving(true);
    try {
      // Convert followup_date from YYYY-MM-DD to UTC ISO format
      // We need to ensure the date stays exactly as the user selected it
      // Send the date as a string in YYYY-MM-DD format to avoid timezone conversion issues
      let followupDateTime = formData.followup_date || null;

      const res = await fetch(`${API_BASE}/api/followups/${lead.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          mobile: formData.mobile,
          car_registration: formData.car_registration,
          car_model: formData.car_model,
          followup_date: followupDateTime,
          status: formData.status,
          remarks: formData.remarks,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        onUpdate();
        onClose();
      } else {
        alert("Failed to update lead");
      }
    } catch (err) {
      console.error("Error updating lead:", err);
      alert("Error updating lead");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lead || !isAdmin) return;
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/followups/${lead.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        onUpdate();
        onClose();
      } else {
        alert("Failed to delete lead");
      }
    } catch (err) {
      console.error("Error deleting lead:", err);
      alert("Error deleting lead");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto sm:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white p-4 sm:p-6 border-b border-zinc-200 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
            Lead Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Mobile
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  pattern="(\+91[0-9]{10}|[0-9]{10}|91[0-9]{10})"
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
                  placeholder="+917404625111 or 7404625111"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Car Registration
                  </label>
                  <input
                    type="text"
                    value={formData.car_registration}
                    onChange={(e) =>
                      setFormData({ ...formData, car_registration: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Car Model
                  </label>
                  <input
                    type="text"
                    value={formData.car_model}
                    onChange={(e) =>
                      setFormData({ ...formData, car_model: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
                    placeholder="e.g., Maruti Celerio"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Followup Date
                  </label>
                  <input
                    type="date"
                    value={formData.followup_date}
                    onChange={(e) =>
                      setFormData({ ...formData, followup_date: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as LeadStatus })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-zinc-700">
                    Remarks
                  </label>
                  <VoiceInputButton
                    onTranscript={(text) =>
                      setFormData({ ...formData, remarks: text })
                    }
                    currentValue={formData.remarks}
                    size="sm"
                  />
                </div>
                <textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm touch-manipulation"
                  placeholder="Use mic for voice input"
                />
              </div>
            </>
          ) : (
            <>
              {/* Quick contact action for mobile */}
              <div className="sm:hidden flex gap-2 pb-3 border-b border-zinc-100">
                <a
                  href={`tel:${lead.mobile}`}
                  className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium text-center touch-manipulation"
                >
                  Call
                </a>
                <a
                  href={`https://wa.me/${lead.mobile?.replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium text-center touch-manipulation"
                >
                  WhatsApp
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Customer Name</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {lead.customer_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Mobile</p>
                  <a href={`tel:${lead.mobile}`} className="text-sm font-medium text-blue-600">
                    {lead.mobile || "—"}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Car Registration</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {lead.car_registration || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Car Model</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {(lead as any).car_model || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Status</p>
                  <StatusBadge status={lead.status} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Followup Date</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {formatDateIST(lead.followup_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Created</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {lead.created_at ? formatDateTimeIST(lead.created_at) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Modified</p>
                  <p className="text-sm font-medium text-zinc-900">
                    {lead.modified_at ? formatDateTimeIST(lead.modified_at) : "—"}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-zinc-100">
                <p className="text-xs text-zinc-500 mb-1">Remarks</p>
                <p className="text-sm text-zinc-900 whitespace-pre-wrap">
                  {lead.remarks || "—"}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white p-4 sm:p-6 border-t border-zinc-200">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-50 transition touch-manipulation"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  className="sm:mr-auto px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 active:bg-red-800 transition touch-manipulation"
                >
                  Delete Lead
                </button>
              )}
              <div className="flex gap-2 flex-1 sm:flex-none">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 border border-zinc-300 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 active:bg-zinc-700 transition touch-manipulation"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


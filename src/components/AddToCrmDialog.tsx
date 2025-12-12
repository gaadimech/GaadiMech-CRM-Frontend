"use client";

import { useState, useEffect } from "react";
import type { LeadStatus } from "../lib/types";
import { getTodayIST } from "../lib/dateUtils";
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

interface AddToCrmDialogProps {
  assignmentId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    customer_name: string;
    mobile: string;
    car_model: string;
    followup_date: string;
    status: LeadStatus;
    remarks: string;
  };
}

export default function AddToCrmDialog({
  assignmentId,
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: AddToCrmDialogProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    mobile: "",
    car_registration: "",
    car_model: "",
    followup_date: getTodayIST(),
    status: "New Lead" as LeadStatus,
    remarks: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && assignmentId) {
      // Load assignment details if not provided
      if (!initialData) {
        loadAssignmentDetails();
      } else {
        setFormData({
          customer_name: initialData.customer_name || "",
          mobile: initialData.mobile || "",
          car_registration: "",
          car_model: initialData.car_model || "",
          followup_date: initialData.followup_date || getTodayIST(),
          status: initialData.status || "New Lead",
          remarks: initialData.remarks || "",
        });
      }
    }
  }, [isOpen, assignmentId, initialData]);

  async function loadAssignmentDetails() {
    if (!assignmentId) return;
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/team-leads/assignment/${assignmentId}`,
        {
          credentials: "include",
        }
      );
      const data = await res.json();
      
      if (data.success) {
        setFormData({
          customer_name: data.customer_name || "",
          mobile: data.mobile || "",
          car_registration: data.car_registration || "",
          car_model: data.car_model || "",
          followup_date: data.followup_date || getTodayIST(),
          status: data.status || "New Lead",
          remarks: data.remarks || "",
        });
      } else {
        setError(data.message || "Failed to load assignment details");
      }
    } catch (err) {
      setError("Error loading assignment details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!assignmentId) return;
    
    if (!formData.customer_name || !formData.mobile) {
      setError("Customer Name and Mobile Number are required");
      return;
    }

    setSaving(true);
    setError("");
    
    try {
      const res = await fetch(
        `${API_BASE}/api/team-leads/add-to-crm/${assignmentId}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_name: formData.customer_name,
            mobile: formData.mobile,
            car_registration: formData.car_registration,
            car_model: formData.car_model,
            followup_date: formData.followup_date,
            status: formData.status,
            remarks: formData.remarks,
          }),
        }
      );

      const data = await res.json();
      
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to add lead to CRM");
      }
    } catch (err) {
      setError("Error adding lead to CRM");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto sm:m-4">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-zinc-900">
            Add Lead to CRM
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
          >
            <svg
              className="w-6 h-6"
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

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading...</div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({ ...formData, mobile: e.target.value })
                  }
                  pattern="(\+91[0-9]{10}|[0-9]{10}|91[0-9]{10})"
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  placeholder="+917404625111 or 7404625111"
                  required
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
                      setFormData({
                        ...formData,
                        car_registration: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                    placeholder="Registration"
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
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                    placeholder="e.g., Maruti Swift"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Follow-up Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.followup_date}
                    onChange={(e) =>
                      setFormData({ ...formData, followup_date: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as LeadStatus,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                    required
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
                      setFormData((prev) => ({ ...prev, remarks: text }))
                    }
                    currentValue={formData.remarks}
                    size="md"
                  />
                </div>
                <textarea
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  placeholder="Notes or remarks (use mic for voice)"
                />
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-4 sm:px-6 py-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 active:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {saving ? "Adding..." : "Add to CRM"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-5 py-3 border border-zinc-300 rounded-xl font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition disabled:opacity-50 touch-manipulation"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


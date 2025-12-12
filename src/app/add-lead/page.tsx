"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "../../lib/types";
import VoiceInputButton from "../../components/VoiceInputButton";

import { getApiBase } from "../../lib/apiBase";

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

export default function AddLeadPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    customer_name: "",
    mobile: "",
    car_registration: "",
    car_model: "",
    followup_date: new Date().toISOString().split("T")[0],
    status: "New Lead" as LeadStatus,
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formDataToSend = new URLSearchParams();
      formDataToSend.append("customer_name", formData.customer_name);
      formDataToSend.append("mobile", formData.mobile);
      formDataToSend.append("car_registration", formData.car_registration);
      formDataToSend.append("car_model", formData.car_model);
      formDataToSend.append("followup_date", formData.followup_date);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("remarks", formData.remarks);

      const res = await fetch(`${API_BASE}/add_lead`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formDataToSend.toString(),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        const text = await res.text();
        setError(text || "Failed to add lead. Please try again.");
      }
    } catch (err) {
      setError("Error adding lead. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-6">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-6 shadow-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-4 sm:mb-6">Add New Lead</h1>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="customer_name"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Customer Name *
              </label>
              <input
                id="customer_name"
                name="customer_name"
                type="text"
                value={formData.customer_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <label
                htmlFor="mobile"
                className="block text-sm font-medium text-zinc-700 mb-1.5"
              >
                Mobile Number *
              </label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                value={formData.mobile}
                onChange={handleChange}
                required
                pattern="(\+91[0-9]{10}|[0-9]{10}|91[0-9]{10})"
                className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                placeholder="+917404625111 or 7404625111"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="car_registration"
                  className="block text-sm font-medium text-zinc-700 mb-1.5"
                >
                  Car Registration
                </label>
                <input
                  id="car_registration"
                  name="car_registration"
                  type="text"
                  value={formData.car_registration}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  placeholder="Registration no."
                />
              </div>

              <div>
                <label
                  htmlFor="car_model"
                  className="block text-sm font-medium text-zinc-700 mb-1.5"
                >
                  Car Model
                </label>
                <input
                  id="car_model"
                  name="car_model"
                  type="text"
                  value={formData.car_model}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                  placeholder="e.g., Maruti Celerio"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="followup_date"
                  className="block text-sm font-medium text-zinc-700 mb-1.5"
                >
                  Followup Date *
                </label>
                <input
                  id="followup_date"
                  name="followup_date"
                  type="date"
                  value={formData.followup_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-zinc-700 mb-1.5"
                >
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
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
                <label
                  htmlFor="remarks"
                  className="block text-sm font-medium text-zinc-700"
                >
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
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent touch-manipulation"
                placeholder="Notes or comments (use mic for voice)"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-medium hover:bg-zinc-800 active:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {loading ? "Adding..." : "Add Lead"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-3 border border-zinc-300 rounded-xl font-medium text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


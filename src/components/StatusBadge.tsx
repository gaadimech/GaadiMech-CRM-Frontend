import type { LeadStatus } from "../lib/types";

const statusColors: Record<LeadStatus, string> = {
  "New Lead": "bg-purple-100 text-purple-800",
  "Needs Followup": "bg-yellow-100 text-yellow-800",
  "Did Not Pick Up": "bg-red-100 text-red-800",
  "Confirmed": "bg-green-100 text-green-800",
  "Open": "bg-blue-100 text-blue-800",
  "Completed": "bg-emerald-100 text-emerald-800",
  "Feedback": "bg-orange-100 text-orange-800",
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        statusColors[status] || "bg-zinc-100 text-zinc-800"
      }`}
    >
      {status}
    </span>
  );
}


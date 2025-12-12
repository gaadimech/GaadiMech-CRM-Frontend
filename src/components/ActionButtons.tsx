"use client";

import { useState } from "react";
import type { Lead } from "../lib/types";
import WhatsAppTemplateModal from "./WhatsAppTemplateModal";

function telHref(mobile: string) {
  return `tel:${mobile}`;
}

function whatsappHref(mobile: string, message?: string) {
  const cleaned = mobile.replace(/[^\d]/g, "");
  const withCountry = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  let url = `https://wa.me/${withCountry}`;
  if (message) {
    url += `?text=${encodeURIComponent(message)}`;
  }
  return url;
}

interface ActionButtonsProps {
  lead: Lead;
  onStatusClick?: () => void;
  onRescheduleClick?: () => void;
  onEditClick?: () => void;
  compact?: boolean;
}

export default function ActionButtons({
  lead,
  onStatusClick,
  onRescheduleClick,
  onEditClick,
  compact = false,
}: ActionButtonsProps) {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Mobile-optimized button sizes with proper touch targets (min 44px)
  const sizeClass = compact 
    ? "px-3 py-2 text-xs min-h-[36px]" 
    : "px-4 py-2.5 text-sm min-h-[40px]";

  function handleWhatsAppClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowTemplateModal(true);
  }

  function handleTemplateSelect(message: string) {
    const url = whatsappHref(lead.mobile, message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${compact ? "gap-1.5" : ""}`}>
        <a
          href={telHref(lead.mobile)}
          onClick={(e) => e.stopPropagation()}
          className={`rounded-xl bg-zinc-900 ${sizeClass} font-medium text-white shadow-sm hover:bg-zinc-800 active:bg-zinc-700 transition touch-manipulation inline-flex items-center justify-center`}
        >
          Call
        </a>
        <button
          onClick={handleWhatsAppClick}
          className={`rounded-xl bg-emerald-600 ${sizeClass} font-medium text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 transition touch-manipulation inline-flex items-center justify-center`}
        >
          WhatsApp
        </button>
        {onEditClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditClick();
            }}
            className={`rounded-xl bg-blue-600 ${sizeClass} font-medium text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition touch-manipulation inline-flex items-center justify-center`}
          >
            Edit
          </button>
        )}
        {onStatusClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusClick();
            }}
            className={`rounded-xl border border-zinc-300 ${sizeClass} font-medium text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation inline-flex items-center justify-center`}
          >
            Status
          </button>
        )}
        {onRescheduleClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRescheduleClick();
            }}
            className={`rounded-xl border border-zinc-300 ${sizeClass} font-medium text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 transition touch-manipulation inline-flex items-center justify-center`}
          >
            {compact ? "Reschedule" : "Snooze"}
          </button>
        )}
      </div>
      <WhatsAppTemplateModal
        mobile={lead.mobile}
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </>
  );
}


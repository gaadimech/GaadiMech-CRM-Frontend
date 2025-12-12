"use client";

import { useEffect, useState } from "react";

import { getApiBase } from "../lib/apiBase";

const API_BASE = getApiBase();

interface WhatsAppTemplate {
  id: number;
  name: string;
  message: string;
  created_at: string;
  updated_at: string;
  created_by: number;
}

interface WhatsAppTemplateModalProps {
  mobile: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (message: string) => void;
}

export default function WhatsAppTemplateModal({
  mobile,
  isOpen,
  onClose,
  onSelectTemplate,
}: WhatsAppTemplateModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp-templates`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectTemplate(template: WhatsAppTemplate) {
    onSelectTemplate(template.message);
    onClose();
  }

  function handleNoTemplate() {
    onSelectTemplate("");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Select WhatsApp Template
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Choose a template to prefill your message for {mobile}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-lg transition"
            aria-label="Close"
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 mb-4">No templates available</p>
              <button
                onClick={handleNoTemplate}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition"
              >
                Continue Without Template
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full text-left p-4 border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition"
                >
                  <h3 className="font-semibold text-zinc-900 mb-1">
                    {template.name}
                  </h3>
                  <p className="text-sm text-zinc-600 line-clamp-2">
                    {template.message}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 flex justify-end gap-2">
          <button
            onClick={handleNoTemplate}
            className="px-4 py-2 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition"
          >
            Continue Without Template
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useState, Fragment } from "react";
import { getApiBase } from "../../../lib/apiBase";

const API_BASE = getApiBase();

interface TeleobiTemplate {
  template_id: string;
  template_name: string;
  template_type: "utility" | "marketing";
  status: string;
  category: string;
  language: string;
  variables: Record<string, any>;
  header_info?: {
    has_image?: boolean;
    has_video?: boolean;
    has_document?: boolean;
    header_type?: string;
    header_subtype?: string;
  };
  synced_at: string | null;
}

interface Lead {
  lead_id: number;
  phone_number: string;
  customer_name: string;
  status: string;
  followup_date: string | null;
}

interface BulkJob {
  id: number;
  job_name: string;
  template_name: string;
  total_recipients: number;
  processed_count: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  delivery_rate: number;
  read_rate: number;
  success_rate?: number;
  progress_percentage?: number;
  eta_seconds?: number | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  needs_refresh?: boolean;
}

interface MessagePreview {
  header: {
    type: 'image' | 'text';
    url?: string;
    text?: string;
  } | null;
  body: string;
  footer: string | null;
  buttons: any[] | null;
}

interface QualityMetrics {
  total_sends: number;
  successful_sends: number;
  failed_sends: number;
  success_rate: number;
  rate_limit_stats: {
    tier: number;
    per_second: { used: number; limit: number };
    per_minute: { used: number; limit: number };
    per_hour: { used: number; limit: number };
    per_day: { used: number | string; limit: number | string };
  };
}

export default function WhatsAppBulkPage() {
  const [templates, setTemplates] = useState<TeleobiTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TeleobiTemplate | null>(null);
  const [templateType, setTemplateType] = useState<"all" | "utility" | "marketing">("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter criteria
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Template variables
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  // Quality metrics (removed - not needed anymore)

  // Bulk jobs
  const [bulkJobs, setBulkJobs] = useState<BulkJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState<Record<number, boolean>>({});
  
  // Message preview
  const [messagePreview, setMessagePreview] = useState<MessagePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Progress tracking
  const [jobProgress, setJobProgress] = useState<Record<number, BulkJob>>({});

  useEffect(() => {
    loadTemplates();
    loadBulkJobs();
  }, [templateType]);

  // Load progress for all processing jobs on mount and when jobs list changes
  useEffect(() => {
    // Load status for all processing jobs to show progress bars
    const processingJobs = bulkJobs.filter(job => job.status === 'processing');
    processingJobs.forEach(job => {
      loadBulkJobStatus(job.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkJobs.length, bulkJobs.map(j => j.id).join(',')]);

  // Poll for progress updates for all processing jobs
  useEffect(() => {
    const processingJobs = bulkJobs.filter(job => job.status === 'processing');
    if (processingJobs.length > 0) {
      const interval = setInterval(() => {
        // Update all processing jobs
        processingJobs.forEach(job => {
          loadBulkJobStatus(job.id);
        });
        // Also refresh job list to get latest status
        loadBulkJobs();
      }, 2000); // Poll every 2 seconds for real-time progress
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkJobs.length, bulkJobs.filter(j => j.status === 'processing').map(j => j.id).join(',')]);
  
  async function loadBulkJobStatus(jobId: number) {
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/jobs/${jobId}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.job) {
          setJobProgress(prev => ({ ...prev, [jobId]: data.job }));
          
          // Stop polling if job is completed, failed, or cancelled
          if (data.job.status === "completed" || data.job.status === "failed" || data.job.status === "partial" || data.job.status === "cancelled") {
            if (selectedJob === jobId) {
              setSelectedJob(null);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load job status:", err);
    }
  }

  async function cancelJob(jobId: number) {
    if (!confirm(`Are you sure you want to cancel this campaign? Messages already sent cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/jobs/${jobId}/cancel`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSuccess(`Campaign #${jobId} has been cancelled.`);
          // Refresh job list and progress
          loadBulkJobs();
          loadBulkJobStatus(jobId);
        } else {
          setError(data.error || "Failed to cancel campaign");
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to cancel campaign");
      }
    } catch (err) {
      console.error("Failed to cancel job:", err);
      setError("Failed to cancel campaign. Please try again.");
    }
  }
  
  // Update preview when template or variables change
  useEffect(() => {
    if (selectedTemplate && Object.keys(templateVariables).length > 0) {
      const timeoutId = setTimeout(() => {
        loadMessagePreview();
      }, 500); // Debounce preview updates
      return () => clearTimeout(timeoutId);
    } else {
      setMessagePreview(null);
    }
  }, [selectedTemplate, templateVariables]);


  async function loadTemplates() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (templateType !== "all") {
        params.set("type", templateType);
      }

      const res = await fetch(
        `${API_BASE}/api/whatsapp/teleobi/templates?${params.toString()}`,
        { credentials: "include" }
      );

      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      } else {
        setError("Failed to load templates");
      }
    } catch (err: any) {
      setError(`Failed to load templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function syncTemplates() {
    setSyncing(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/templates/sync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(data.message || "Templates synced successfully");
        loadTemplates();
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to sync templates");
      }
    } catch (err: any) {
      setError(`Failed to sync templates: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function filterLeads() {
    if (!filterDate) {
      setError("Please select a followup date");
      return;
    }

    setLoadingLeads(true);
    setError("");
    setFilteredLeads([]);

    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/leads/filter`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followup_date: filterDate,
          status: filterStatus || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFilteredLeads(data.leads || []);
        setSuccess(`Found ${data.count} leads matching criteria`);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to filter leads");
      }
    } catch (err: any) {
      setError(`Failed to filter leads: ${err.message}`);
    } finally {
      setLoadingLeads(false);
    }
  }

  async function sendBulk() {
    if (!selectedTemplate) {
      setError("Please select a template");
      return;
    }

    if (filteredLeads.length === 0) {
      setError("Please filter leads first");
      return;
    }

    // Quality metrics validation removed - system now relies on Teleobi's internal quality tracking

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const recipients = filteredLeads.map((lead) => ({
        lead_id: lead.lead_id,
        phone_number: lead.phone_number,
      }));

      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/send-bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: selectedTemplate.template_name,
          recipients: recipients,
          variables: templateVariables,
          filter_criteria: {
            followup_date: filterDate,
            status: filterStatus,
          },
          job_name: `Bulk send - ${selectedTemplate.template_name} - ${new Date().toLocaleString()}`,
        }),
      });

      if (res.ok || res.status === 202) {
        const data = await res.json();
        setSuccess(
          `Bulk send job created! Job ID: ${data.job_id}. Processing ${data.total_recipients} messages...`
        );
        setSelectedJob(data.job_id);
        // Start polling for progress immediately
        loadBulkJobStatus(data.job_id);
        loadBulkJobs();
        // Clear filtered leads after sending
        setFilteredLeads([]);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to send bulk messages");
      }
    } catch (err: any) {
      setError(`Failed to send bulk messages: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  async function loadBulkJobs() {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/jobs?limit=5`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setBulkJobs(data.jobs || []);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to load campaigns");
      }
    } catch (err: any) {
      console.error("Failed to load bulk jobs:", err);
      setError(`Failed to load campaigns: ${err.message}`);
    } finally {
      setLoadingJobs(false);
    }
  }
  
  async function fetchJobDetails(jobId: number) {
    setFetchingDetails(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/jobs/${jobId}/fetch-details`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        // Update the job in the list
        setBulkJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, ...data.job } : job
        ));
        setSuccess(`Updated details for ${data.job.updated_count || 0} messages`);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to fetch details");
      }
    } catch (err: any) {
      console.error("Failed to fetch job details:", err);
      setError(`Failed to fetch details: ${err.message}`);
    } finally {
      setFetchingDetails(prev => ({ ...prev, [jobId]: false }));
    }
  }
  
  async function loadMessagePreview() {
    if (!selectedTemplate) return;
    
    setLoadingPreview(true);
    try {
      const res = await fetch(`${API_BASE}/api/whatsapp/teleobi/template-preview`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_name: selectedTemplate.template_name,
          variables: templateVariables,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessagePreview(data.preview);
      }
    } catch (err) {
      console.error("Failed to load preview:", err);
    } finally {
      setLoadingPreview(false);
    }
  }


  function handleTemplateSelect(template: TeleobiTemplate) {
    // Prevent infinite loops by checking if it's the same template
    if (selectedTemplate?.template_id === template.template_id) {
      return; // Already selected, don't re-initialize
    }
    
    setSelectedTemplate(template);
    
    // Initialize template variables - ONLY extract actual template variables
    const vars: Record<string, string> = {};
    
    if (template.variables && typeof template.variables === 'object') {
      // Handle variables that are objects with labels
      const variableKeys = Object.keys(template.variables);
      
      // Filter and process only valid variable keys
      variableKeys.forEach((key) => {
        // Skip internal keys and non-variable keys
        if (key.startsWith('_')) return;
        
        // Only process keys that match variable patterns (body_var_X or var_X)
        // This ensures we only get actual template variables, not random keys
        if (!key.match(/^(body_var_|var_)\d+$/)) {
          return; // Skip invalid keys
        }
        
        const varInfo = template.variables[key];
        
        // Only process if it's a valid variable object with metadata
        if (typeof varInfo === 'object' && varInfo !== null) {
          // Check if it has the expected structure (label, position, etc.)
          if (varInfo.label || varInfo.position !== undefined) {
            vars[key] = "";
          }
        } else if (typeof varInfo === 'string' && varInfo.trim() !== '') {
          // Variable is just a string value (legacy format) - skip this format
          // We only want objects with metadata
          return;
        }
      });
    }
    
    // Add header image URL if template requires image
    if (template.header_info?.has_image) {
      vars['header_image_url'] = "";
    }
    
    // Only set if we have variables to avoid empty state issues
    console.log(`[Template Select] ${template.template_name}: Initializing ${Object.keys(vars).length} variables`);
    console.log(`[Template Select] Variable keys:`, Object.keys(vars));
    setTemplateVariables(vars);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6">
        {/* View Analytics Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => {
              setShowAnalytics(!showAnalytics);
              if (!showAnalytics) loadBulkJobs();
            }}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition"
          >
            {showAnalytics ? "Hide Analytics" : "View Analytics"}
          </button>
        </div>
        
        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div className="mb-6 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-900">📊 Campaign Analytics</h2>
              <button
                onClick={loadBulkJobs}
                disabled={loadingJobs}
                className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-xl text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 transition"
              >
                {loadingJobs ? "Refreshing..." : "🔄 Refresh"}
              </button>
            </div>
            {loadingJobs ? (
              <div className="text-center py-8 text-zinc-500">Loading campaigns...</div>
            ) : bulkJobs.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No campaigns found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-zinc-300 bg-zinc-50">
                      <th className="text-left py-4 px-4 text-sm font-bold text-zinc-900">Job ID</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-zinc-900">Campaign</th>
                      <th className="text-left py-4 px-4 text-sm font-bold text-zinc-900">Template</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Scheduled</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Processed</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Sent</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Delivered</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Read</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Failed</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Delivery %</th>
                      <th className="text-right py-4 px-4 text-sm font-bold text-zinc-900">Read %</th>
                      <th className="text-center py-4 px-4 text-sm font-bold text-zinc-900">Status</th>
                      <th className="text-center py-4 px-4 text-sm font-bold text-zinc-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkJobs.map((job) => {
                      // Get latest progress data if available
                      const progressData = jobProgress[job.id] || job;
                      const isProcessing = job.status === 'processing';
                      
                      return (
                        <Fragment key={job.id}>
                          <tr className="border-b border-zinc-200 hover:bg-zinc-50 transition">
                            <td className="py-4 px-4">
                              <span className="text-sm font-bold text-zinc-900">#{job.id}</span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm text-zinc-900 font-medium">{job.job_name || `Job #${job.id}`}</div>
                              {job.created_at && (
                                <div className="text-xs text-zinc-500 mt-1">
                                  {new Date(job.created_at).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-zinc-700">{job.template_name}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm font-semibold text-zinc-900">{job.total_recipients}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm text-zinc-700">{progressData.processed_count || 0}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm font-semibold text-zinc-900">{progressData.sent_count || 0}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm font-semibold text-emerald-600">{progressData.delivered_count || 0}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm font-semibold text-blue-600">{progressData.read_count || 0}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-sm font-semibold text-red-600">{progressData.failed_count || 0}</span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`text-sm font-semibold ${
                                progressData.delivery_rate >= 90 ? 'text-emerald-600' :
                                progressData.delivery_rate >= 70 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {progressData.delivery_rate !== undefined ? `${progressData.delivery_rate.toFixed(1)}%` : '-'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`text-sm font-semibold ${
                                progressData.read_rate >= 50 ? 'text-blue-600' :
                                progressData.read_rate >= 30 ? 'text-yellow-600' :
                                'text-zinc-500'
                              }`}>
                                {progressData.read_rate !== undefined ? `${progressData.read_rate.toFixed(1)}%` : '-'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                job.status === 'cancelled' ? 'bg-orange-100 text-orange-800' :
                                job.status === 'failed' ? 'bg-red-100 text-red-800' :
                                'bg-zinc-100 text-zinc-800'
                              }`}>
                                {job.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex gap-2 justify-center">
                                {isProcessing && (
                                  <button
                                    onClick={() => cancelJob(job.id)}
                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition"
                                    title="Stop this campaign"
                                  >
                                    🛑 Stop
                                  </button>
                                )}
                                <button
                                  onClick={() => fetchJobDetails(job.id)}
                                  disabled={fetchingDetails[job.id]}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                  {fetchingDetails[job.id] ? "⏳ Fetching..." : "📊 Fetch Details"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* Progress Bar Row for Processing Jobs */}
                          {isProcessing && progressData && (
                            <tr className="border-b border-zinc-200 bg-blue-50">
                              <td colSpan={13} className="py-3 px-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-blue-900">
                                      Sending Messages... {progressData.processed_count || 0} / {progressData.total_recipients}
                                    </span>
                                    {progressData.eta_seconds && progressData.eta_seconds > 0 && (
                                      <span className="text-sm text-blue-700">
                                        ETA: {Math.floor(progressData.eta_seconds / 60)}m {Math.round(progressData.eta_seconds % 60)}s
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-full bg-blue-200 rounded-full h-2.5">
                                    <div
                                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${Math.min(progressData.progress_percentage || 0, 100)}%`
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-blue-700">
                                    <span>{Math.round(progressData.progress_percentage || 0)}% Complete</span>
                                    <span>
                                      ✅ Sent: {progressData.sent_count || 0} | ❌ Failed: {progressData.failed_count || 0}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-zinc-500 text-center">
                  Showing top 5 most recent campaigns
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Main Content */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">
              WhatsApp Bulk Messaging
            </h1>
            <p className="text-sm text-zinc-600">
              Send bulk WhatsApp template messages with enterprise-grade safety
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={syncTemplates}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {syncing ? "Syncing..." : "Sync Templates"}
            </button>
          </div>
        </div>


        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Template Selection & Configuration */}
          <div className="space-y-6">
            {/* Template Selection */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Select Template</h2>

              {/* Template Type Filter */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setTemplateType("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    templateType === "all"
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setTemplateType("utility")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    templateType === "utility"
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  Utility
                </button>
                <button
                  onClick={() => setTemplateType("marketing")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    templateType === "marketing"
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  Marketing
                </button>
              </div>

              {/* Templates List */}
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No templates found. Click "Sync Templates" to fetch from Teleobi.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.template_id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleTemplateSelect(template);
                      }}
                      className={`p-4 border rounded-xl cursor-pointer transition ${
                        selectedTemplate?.template_id === template.template_id
                          ? "border-blue-500 bg-blue-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-zinc-900">{template.template_name}</p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {template.template_type.toUpperCase()} • {template.status}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            template.template_type === "utility"
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {template.template_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Template Variables */}
            {selectedTemplate && Object.keys(templateVariables).length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                  Template Variables ({Object.keys(templateVariables).length})
                </h2>
                {selectedTemplate.header_info?.has_image && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      📷 This template requires an image header
                    </p>
                    <p className="text-xs text-blue-700">
                      Provide a publicly accessible image URL for the header
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {(() => {
                    // Safety: Filter and sort variables before rendering
                    const validKeys = Object.keys(templateVariables)
                      .filter(key => {
                        // Filter out internal keys and invalid keys
                        if (key.startsWith('_')) return false;
                        // Only show valid variable keys (body_var_X, var_X, or header_image_url)
                        return /^(body_var_|var_)\d+$/.test(key) || key === 'header_image_url';
                      })
                      .sort((a, b) => {
                        // Sort by variable position/number for consistent display
                        const getVarNum = (key: string): number => {
                          if (key === 'header_image_url') return 999; // Header image comes last
                          const match = key.match(/\d+/);
                          return match ? parseInt(match[0]) : 0;
                        };
                        return getVarNum(a) - getVarNum(b);
                      });
                    
                    // Debug log (remove in production)
                    if (validKeys.length !== Object.keys(templateVariables).length) {
                      console.warn(`Filtered variables: ${Object.keys(templateVariables).length} -> ${validKeys.length}`);
                    }
                    
                    return validKeys.map((key) => {
                    const varInfo = selectedTemplate.variables?.[key];
                    const isImageHeader = key === 'header_image_url';
                    const label = typeof varInfo === 'object' && varInfo?.label
                      ? varInfo.label
                      : key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
                    const isRequired = typeof varInfo === 'object' && varInfo?.required !== false;
                    
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                          {label}
                          {isRequired && <span className="text-red-500 ml-1">*</span>}
                          {isImageHeader && (
                            <span className="ml-2 text-xs text-blue-600">(Image URL)</span>
                          )}
                        </label>
                        {isImageHeader ? (
                          <div className="space-y-2">
                            <input
                              type="url"
                              value={templateVariables[key] || ""}
                              onChange={(e) => {
                                const newVars = { ...templateVariables };
                                newVars[key] = e.target.value;
                                setTemplateVariables(newVars);
                              }}
                              className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                              placeholder="https://example.com/image.jpg"
                            />
                            <p className="text-xs text-zinc-500">
                              Enter a publicly accessible image URL for the template header
                            </p>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={templateVariables[key] || ""}
                            onChange={(e) => {
                              const newVars = { ...templateVariables };
                              newVars[key] = e.target.value;
                              setTemplateVariables(newVars);
                            }}
                            className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                            placeholder={`Enter ${label.toLowerCase()}`}
                            required={isRequired}
                          />
                        )}
                      </div>
                    );
                  });
                  })()}
                </div>
                
                {/* Message Preview */}
                {messagePreview && (
                  <div className="mt-6 bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                      📱 Message Preview
                    </h2>
                    {loadingPreview ? (
                      <div className="text-center py-8 text-zinc-500">Loading preview...</div>
                    ) : (
                      <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200">
                        {/* WhatsApp-like preview */}
                        <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
                          {/* Header */}
                          {messagePreview.header && (
                            <div className="bg-zinc-100 p-4 border-b border-zinc-200">
                              {messagePreview.header.type === 'image' && messagePreview.header.url ? (
                                <div className="aspect-video bg-zinc-200 rounded-lg overflow-hidden">
                                  <img
                                    src={messagePreview.header.url}
                                    alt="Header"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not available%3C/text%3E%3C/svg%3E';
                                    }}
                                  />
                                </div>
                              ) : messagePreview.header.type === 'text' && messagePreview.header.text ? (
                                <p className="text-sm font-medium text-zinc-900">{messagePreview.header.text}</p>
                              ) : null}
                            </div>
                          )}
                          
                          {/* Body */}
                          <div className="p-4">
                            <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
                              {messagePreview.body || '[No body content]'}
                            </p>
                          </div>
                          
                          {/* Footer */}
                          {messagePreview.footer && (
                            <div className="px-4 pb-4">
                              <p className="text-xs text-zinc-500 italic">{messagePreview.footer}</p>
                            </div>
                          )}
                          
                          {/* Buttons */}
                          {messagePreview.buttons && messagePreview.buttons.length > 0 && (
                            <div className="px-4 pb-4 space-y-2">
                              {messagePreview.buttons.map((btn: any, idx: number) => (
                                <button
                                  key={idx}
                                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
                                  disabled
                                >
                                  {btn.text || btn.title || `Button ${idx + 1}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Lead Filtering & Sending */}
          <div className="space-y-6">
            {/* Lead Filtering */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Filter Leads</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Followup Date *
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Status (Optional)
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="New Lead">New Lead</option>
                    <option value="Needs Followup">Needs Followup</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Open">Open</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <button
                  onClick={filterLeads}
                  disabled={loadingLeads || !filterDate}
                  className="w-full px-4 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loadingLeads ? "Filtering..." : "Filter Leads"}
                </button>
              </div>
            </div>

            {/* Filtered Leads Preview */}
            {filteredLeads.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                  Filtered Leads ({filteredLeads.length})
                </h2>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredLeads.slice(0, 10).map((lead) => (
                    <div
                      key={lead.lead_id}
                      className="p-3 border border-zinc-200 rounded-lg text-sm"
                    >
                      <p className="font-medium text-zinc-900">{lead.customer_name}</p>
                      <p className="text-zinc-600">{lead.phone_number}</p>
                      <p className="text-xs text-zinc-500">{lead.status}</p>
                    </div>
                  ))}
                  {filteredLeads.length > 10 && (
                    <p className="text-sm text-zinc-500 text-center">
                      ... and {filteredLeads.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Send Button & Progress */}
            {selectedTemplate && filteredLeads.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Send Messages</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-xl">
                    <p className="text-sm text-zinc-700">
                      <strong>Template:</strong> {selectedTemplate.template_name}
                    </p>
                    <p className="text-sm text-zinc-700">
                      <strong>Recipients:</strong> {filteredLeads.length}
                    </p>
                    <p className="text-sm text-zinc-700">
                      <strong>Type:</strong> {selectedTemplate.template_type.toUpperCase()}
                    </p>
                  </div>
                  
                  {/* Progress Bar - Show when job is processing */}
                  {selectedJob && jobProgress[selectedJob] && jobProgress[selectedJob].status === 'processing' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-900">Sending Messages...</span>
                        <span className="text-sm font-bold text-blue-700">
                          {jobProgress[selectedJob].processed_count || 0} / {jobProgress[selectedJob].total_recipients}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${jobProgress[selectedJob].progress_percentage || 0}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-blue-700">
                        <span>{Math.round(jobProgress[selectedJob].progress_percentage || 0)}% Complete</span>
                        {jobProgress[selectedJob].eta_seconds && jobProgress[selectedJob].eta_seconds > 0 && (
                          <span>
                            ETA: {Math.round(jobProgress[selectedJob].eta_seconds! / 60)}m {Math.round(jobProgress[selectedJob].eta_seconds! % 60)}s
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        <span>✅ Sent: {jobProgress[selectedJob].sent_count || 0}</span>
                        <span className="ml-4">❌ Failed: {jobProgress[selectedJob].failed_count || 0}</span>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={sendBulk}
                    disabled={sending || !!(selectedJob && jobProgress[selectedJob]?.status === 'processing')}
                    className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {sending ? "Starting..." : (selectedJob && jobProgress[selectedJob]?.status === 'processing') 
                      ? `Sending... (${jobProgress[selectedJob]?.processed_count || 0}/${jobProgress[selectedJob]?.total_recipients || 0})`
                      : `Send to ${filteredLeads.length} Recipients`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


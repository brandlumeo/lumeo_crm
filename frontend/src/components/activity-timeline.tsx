"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Activity, Phone, Users, Mail, FileText, CheckCircle2, ArrowRight, Eye, Code, Sparkles, ChevronDown, ChevronUp, Trash2, Search, Filter, X, Pin } from "lucide-react";
import DOMPurify from "dompurify";

import { createActivity, deleteActivity, updateActivity, fetchLead, fetchDeal, fetchCustomer, aiAssistantAction } from "@/lib/api";
import { useActivities, useCurrentUser, useCurrentCompany, useEmailTemplates, useSendEmail, useEmailMessages } from "@/lib/queries";
import { AIExecutiveBrief } from "./ai-executive-brief";
import { formatDateTime, getInitials, formatINR, toNumber } from "@/lib/utils";

// C6 fix: Safe HTML sanitizer — only allows basic formatting tags, no JS execution vectors
const ALLOWED_TAGS = ["b", "i", "em", "strong", "u", "p", "br", "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "span", "div"];
const ALLOWED_ATTR = ["href", "target", "rel", "class", "style"];

function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") return ""; // SSR guard
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
  });
}

const typeIcons: Record<string, any> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: FileText,
  status_change: CheckCircle2,
};

const typeTone: Record<string, string> = {
  call: "bg-blue-soft text-blue border border-blue/20",
  meeting: "bg-gold-soft text-gold border border-gold/20",
  email: "bg-accent-soft text-accent border border-accent/20",
  note: "bg-green-soft text-green border border-green/20",
  status_change: "bg-bone-2 text-ink-2 border border-line",
};

export function ActivityTimeline({
  entityId,
  entityType,
}: {
  entityId: number;
  entityType: "lead" | "deal" | "customer";
}) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { data: company } = useCurrentCompany();
  const { data: templatesData } = useEmailTemplates();
  const sendEmailMutation = useSendEmail();

  // Scoped queries to fetch the exact entity details safely
  const { data: lead } = useQuery({
    queryKey: ["crm", "leads", entityId],
    queryFn: () => fetchLead(entityId),
    enabled: Boolean(entityType === "lead" && entityId),
  });

  const { data: customer } = useQuery({
    queryKey: ["crm", "customers", entityId],
    queryFn: () => fetchCustomer(entityId),
    enabled: Boolean(entityType === "customer" && entityId),
  });

  const { data: deal } = useQuery({
    queryKey: ["crm", "deals", entityId],
    queryFn: () => fetchDeal(entityId),
    enabled: Boolean(entityType === "deal" && entityId),
  });

  const [activeTab, setActiveTab] = useState<"call" | "meeting" | "email" | "note">("note");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [previewMode, setPreviewMode] = useState<"live" | "code">("live");
  
  const [callOutcome, setCallOutcome] = useState<string>("connected");
  const [callReason, setCallReason] = useState<string>("");

  const [timelineFilter, setTimelineFilter] = useState<"all" | "note" | "call" | "email" | "meeting">("all");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [activityToDelete, setActivityToDelete] = useState<number | null>(null);

  // Sync toEmail with entity's email if available
  useEffect(() => {
    if (activeTab === "email") {
      if (entityType === "lead" && lead?.email) {
        setToEmail(lead.email);
      } else if (entityType === "customer" && customer?.email) {
        setToEmail(customer.email);
      }
    }
  }, [activeTab, entityType, lead, customer]);

  const params: Record<string, any> = {};
  params[entityType] = entityId;

  const { data, isLoading } = useActivities(params);
  const { data: emailData, isLoading: isLoadingEmails } = useEmailMessages(params);

  const mutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      setDescription("");
      setCallOutcome("connected");
      setCallReason("");
      queryClient.invalidateQueries({ queryKey: ["crm", "activities"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "activities"] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, is_pinned }: { id: number; is_pinned: boolean }) => updateActivity(id, { is_pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "activities"] });
    },
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setSubject("");
      setDescription("");
      return;
    }
    const templates = templatesData ?? [];
    const template = templates.find((t) => t.id.toString() === templateId);
    if (template) {
      setSubject(template.subject);
      setDescription(template.body_content);
    }
  };

  const insertTag = (tag: string) => {
    const textarea = document.getElementById("email-body-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + tag + after;
    setDescription(newText);

    // Reset cursor position after state update
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 0);
  };

  const wrapText = (beforeTag: string, afterTag: string) => {
    const textarea = document.getElementById("email-body-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newText = before + beforeTag + selected + afterTag + after;
    setDescription(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + beforeTag.length;
      textarea.selectionEnd = start + beforeTag.length + selected.length;
    }, 0);
  };

  const getParsedContent = (text: string) => {
    let parsed = text;
    const context: Record<string, string> = {
      company_name: company?.name || "Lumeo Corp",
      user_name: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.username || "Sales Rep",
      name: lead?.name || customer?.name || deal?.title || "Customer",
      lead_name: lead?.name || "Lead Name",
      lead_email: lead?.email || "lead@example.com",
      customer_name: customer?.name || "Customer Name",
      customer_email: customer?.email || "customer@example.com",
      deal_title: deal?.title || "Deal Title",
      deal_amount: deal?.amount ? formatINR(toNumber(deal.amount)) : "₹0.00",
    };

    Object.entries(context).forEach(([key, val]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      parsed = parsed.replace(regex, val);
    });

    return parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "email") {
      if (!toEmail.trim() || !subject.trim() || !description.trim()) return;

      const payload: any = {
        subject: subject.trim(),
        body: description.trim(),
        to_email: toEmail.trim(),
      };
      if (entityType === "lead") payload.lead_id = entityId;
      else if (entityType === "customer") payload.customer_id = entityId;
      else if (entityType === "deal") payload.deal_id = entityId;

      try {
        await sendEmailMutation.mutateAsync(payload);
        setSubject("");
        setDescription("");
        setSelectedTemplateId("");
      } catch (err) {
        console.error(err);
      }
    } else {
      if (activeTab === "call" && callOutcome === "not_connected" && !callReason) return;
      if (activeTab !== "call" && !description.trim()) return;

      const payload: any = {
        [entityType]: entityId,
        activity_type: activeTab,
        description: description || "Call Logged",
      };

      if (activeTab === "call") {
        payload.call_outcome = callOutcome;
        if (callOutcome === "not_connected") {
          payload.call_reason = callReason;
        }
      }

      mutation.mutate(payload);
    }
  };

  const activities = data?.results ?? [];
  const emails = emailData?.results ?? [];
  
  const combinedTimeline = [
    ...activities.map(a => ({ ...a, _kind: 'activity' as const, sort_date: new Date(a.created_at).getTime() })),
    ...emails.map(e => ({ ...e, _kind: 'email' as const, sort_date: new Date(e.received_at || e.created_at).getTime() }))
  ].sort((a, b) => {
    const aPinned = (a as any).is_pinned ? 1 : 0;
    const bPinned = (b as any).is_pinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return b.sort_date - a.sort_date;
  });

  const filteredTimeline = combinedTimeline.filter(item => {
    if (timelineFilter !== "all") {
      if (timelineFilter === "email") {
        if (item._kind !== "email") return false;
      } else {
        if (item._kind !== "activity") return false;
        if (item.activity_type !== timelineFilter) return false;
      }
    }
    if (timelineSearch.trim()) {
      const q = timelineSearch.toLowerCase();
      if (item._kind === "email") {
        return (item.subject?.toLowerCase().includes(q) || item.body_text?.toLowerCase().includes(q) || item.body_html?.toLowerCase().includes(q));
      } else {
        return item.description?.toLowerCase().includes(q);
      }
    }
    return true;
  });

  const isPending = mutation.isPending || sendEmailMutation.isPending;
  const isEmailTab = activeTab === "email";

  return (
    <div className="card animate-rise">
      <div className="card-head">
        <div className="card-title">Activity Timeline</div>
      </div>

      <div className="p-5 border-b border-line bg-slate-950/20 backdrop-blur-sm">
        <div className="flex gap-2 mb-4">
          {(["note", "call", "meeting", "email"] as const).map((type) => {
            const Icon = typeIcons[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setActiveTab(type);
                  setDescription("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === type
                    ? "bg-slate-100 text-slate-950 shadow-sm font-semibold scale-105"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEmailTab ? (
            <div className="space-y-3 p-4 rounded-xl border border-slate-900 bg-slate-950/40">
              {/* To Email & Subject row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">To Email</label>
                  <input
                    type="email"
                    required
                    className="input h-9 text-xs"
                    placeholder="recipient@example.com"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Template</label>
                  <select
                    className="input h-9 text-xs bg-slate-950"
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    <option value="">-- Direct Compose --</option>
                    {(templatesData ?? []).map((t) => (
                      <option key={t.id} value={t.id.toString()}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  required
                  className="input h-9 text-xs"
                  placeholder="Enter email subject..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950 border border-slate-900">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Bold"
                    onClick={() => wrapText("<b>", "</b>")}
                    className="p-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 font-bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    title="Italic"
                    onClick={() => wrapText("<i>", "</i>")}
                    className="p-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    title="Heading"
                    onClick={() => wrapText("<h3>", "</h3>")}
                    className="p-1.5 rounded hover:bg-slate-900 text-xs text-slate-300 font-semibold"
                  >
                    H
                  </button>
                  <button
                    type="button"
                    title="Paragraph"
                    onClick={() => wrapText("<p>", "</p>")}
                    className="p-1.5 rounded hover:bg-slate-900 text-xs text-slate-300"
                  >
                    P
                  </button>
                  <button
                    type="button"
                    title="Break"
                    onClick={() => wrapText("", "<br />")}
                    className="p-1.5 rounded hover:bg-slate-900 text-xs text-slate-400"
                  >
                    br
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500 font-medium mr-1 uppercase">Insert tags:</span>
                  <button
                    type="button"
                    onClick={() => insertTag("{{name}}")}
                    className="px-2 py-0.5 text-[10px] rounded bg-slate-900 hover:bg-slate-800 text-accent font-medium border border-accent/20"
                  >
                    name
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag("{{company_name}}")}
                    className="px-2 py-0.5 text-[10px] rounded bg-slate-900 hover:bg-slate-800 text-accent font-medium border border-accent/20"
                  >
                    company
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTag("{{user_name}}")}
                    className="px-2 py-0.5 text-[10px] rounded bg-slate-900 hover:bg-slate-800 text-accent font-medium border border-accent/20"
                  >
                    user
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Email Body (HTML Supported)</label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!subject && !description) return;
                      const res = await aiAssistantAction({ action: "draft_email", prompt: subject || description });
                      setDescription(res.result.replace(/\n/g, "<br />"));
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 text-accent hover:bg-accent/20 rounded text-[10px] font-semibold tracking-wide transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Draft with AI
                  </button>
                </div>
                <textarea
                  id="email-body-textarea"
                  className="w-full bg-slate-950 border border-slate-900 rounded-lg p-3 text-sm focus:border-slate-800 transition-colors outline-none resize-none min-h-[140px] font-mono text-xs text-slate-300"
                  placeholder="Dear {{name}},\n\nType your rich-text HTML email here..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Accordion Live Preview */}
              {description.trim() && (
                <div className="border border-slate-900 rounded-lg overflow-hidden bg-slate-950/60">
                  <button
                    type="button"
                    onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-950 text-xs text-slate-300 hover:text-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Parsed Template Live Preview</span>
                    </div>
                    {isPreviewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isPreviewExpanded && (
                    <div className="p-4 border-t border-slate-900 bg-slate-950/20 max-h-[220px] overflow-y-auto">
                      <div className="flex justify-end gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setPreviewMode("live")}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                            previewMode === "live" ? "bg-accent/20 text-accent font-semibold" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>Live</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewMode("code")}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
                            previewMode === "code" ? "bg-accent/20 text-accent font-semibold" : "text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <Code className="w-3 h-3" />
                          <span>Code</span>
                        </button>
                      </div>

                      {previewMode === "live" ? (
                        <div
                          className="prose prose-invert max-w-none text-xs text-slate-300 leading-relaxed border border-dashed border-slate-900/60 p-3 rounded bg-slate-950/60 shadow-inner"
                          // C6 fix: sanitize with DOMPurify before rendering — prevents XSS from template content
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(getParsedContent(description)),
                          }}
                        />
                      ) : (
                        <pre className="p-3 bg-slate-950/80 rounded border border-slate-900 text-[11px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap select-all">
                          {getParsedContent(description)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === "call" && (
                <div className="grid grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Call Outcome</span>
                    <select
                      className="select w-full"
                      value={callOutcome}
                      onChange={(e) => {
                        setCallOutcome(e.target.value);
                        if (e.target.value === "connected") setCallReason("");
                      }}
                    >
                      <option value="connected">Connected</option>
                      <option value="not_connected">Not Connected</option>
                    </select>
                  </label>
                  {callOutcome === "not_connected" && (
                    <label className="block space-y-1">
                      <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Reason <span className="text-red-500">*</span></span>
                      <select
                        className="select w-full"
                        value={callReason}
                        onChange={(e) => setCallReason(e.target.value)}
                        required
                      >
                        <option value="">-- Select Reason --</option>
                        <option value="no_answer">No Answer</option>
                        <option value="switched_off">Switched Off</option>
                        <option value="busy">Busy</option>
                        <option value="wrong_number">Wrong Number</option>
                        <option value="invalid_number">Invalid Number</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  )}
                </div>
              )}
              <textarea
                className="w-full bg-bone border border-line rounded-lg p-3 text-sm focus:border-ink transition-colors outline-none resize-none min-h-[80px]"
                placeholder={`Log a ${activeTab}...`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required={activeTab !== "call" || callOutcome === "connected"}
              />
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={async () => {
                    if (!description.trim()) return;
                    const res = await aiAssistantAction({ action: "summarize", context: description });
                    setDescription(res.result);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent/10 text-accent hover:bg-accent/20 rounded text-[11px] font-semibold tracking-wide transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Summarize Notes with AI
                </button>
              </div>
            </div>
          )}

          {sendEmailMutation.isError && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
              {(sendEmailMutation.error as any)?.response?.data?.error || "An error occurred while sending email."}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                isPending || 
                (activeTab !== "call" && !description.trim()) || 
                (activeTab === "call" && callOutcome === "not_connected" && !callReason) || 
                (isEmailTab && (!toEmail.trim() || !subject.trim()))
              }
              className="btn btn-primary btn-sm disabled:opacity-50 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              {isPending ? (
                <span>Saving...</span>
              ) : isEmailTab ? (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Premium Email</span>
                </>
              ) : (
                <span>Save Activity</span>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 bg-paper border-l border-line p-6 overflow-y-auto">
        <AIExecutiveBrief timelineData={combinedTimeline} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 bg-slate-950/40 p-3 rounded-lg border border-line">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <div className="flex flex-wrap items-center gap-1.5">
              {(["all", "note", "call", "email", "meeting"] as const).map((type) => (
                <button
                  key={`filter_${type}`}
                  onClick={() => setTimelineFilter(type)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize transition-all ${
                    timelineFilter === type 
                      ? "bg-accent text-white shadow-sm" 
                      : "bg-paper text-muted hover:bg-bone hover:text-ink border border-line"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search history..."
              value={timelineSearch}
              onChange={(e) => setTimelineSearch(e.target.value)}
              className="w-full sm:w-[220px] bg-paper border border-line rounded-full pl-8 pr-8 py-1.5 text-xs text-ink focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all"
            />
            {timelineSearch && (
              <button 
                onClick={() => setTimelineSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {isLoading || isLoadingEmails ? (
          <div className="text-center text-muted text-sm py-8">Loading activities...</div>
        ) : filteredTimeline.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 mx-auto text-muted mb-2 opacity-40" />
            <div className="text-sm text-muted">No activities match your filters.</div>
          </div>
        ) : (
          <div className="relative pl-3 border-l border-line space-y-6">
            {filteredTimeline.map((item) => {
              if (item._kind === "activity") {
                const activity = item as any;
                const Icon = typeIcons[activity.activity_type] || Activity;
                return (
                  <div key={`act_${activity.id}`} className="relative pl-6">
                    <div className={`absolute -left-[14px] top-0.5 w-7 h-7 rounded-full grid place-items-center bg-paper`}>
                      <div className={`w-6 h-6 rounded-full grid place-items-center ${typeTone[activity.activity_type] || "bg-bone text-muted border border-line"}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13.5px] font-medium text-ink">
                          {activity.created_by?.first_name || activity.created_by?.username || "System"}
                        </span>
                        <span className="text-xs text-muted capitalize">
                          logged a {activity.activity_type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-muted/60">•</span>
                        <span className="text-[11px] text-muted/80">
                          {formatDateTime(activity.created_at)}
                        </span>
                        {activity.call_outcome && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ml-2 font-medium ${activity.call_outcome === "connected" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {activity.call_outcome === "connected" ? "Connected" : activity.call_reason ? `Not Connected (${activity.call_reason.replace("_", " ")})` : "Not Connected"}
                          </span>
                        )}
                        {activity.is_pinned && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-2 border border-amber-200">
                            <Pin className="w-2.5 h-2.5 fill-amber-600" />
                            Pinned
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => pinMutation.mutate({ id: activity.id, is_pinned: !activity.is_pinned })}
                            disabled={pinMutation.isPending}
                            className={`text-muted transition-colors ${activity.is_pinned ? 'text-amber-500 hover:text-amber-600' : 'hover:text-amber-500'}`}
                            title={activity.is_pinned ? "Unpin Activity" : "Pin Activity"}
                          >
                            <Pin className={`w-3.5 h-3.5 ${activity.is_pinned ? 'fill-amber-500' : ''}`} />
                          </button>
                          {user && (['owner', 'admin', 'manager'].includes(user.role?.toLowerCase()) || activity.created_by?.id === user.id || !activity.created_by) && (
                            <button
                              type="button"
                              onClick={() => setActivityToDelete(activity.id)}
                              disabled={deleteMutation.isPending}
                              className="text-muted hover:text-rose-600 transition-colors"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {activity.description && (
                        <div className="text-[13px] text-ink-2 bg-bone-2 p-3 rounded-lg border border-line inline-block max-w-[85%] whitespace-pre-wrap mt-1">
                          {activity.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else {
                const email = item as any;
                return (
                  <div key={`email_${email.id}`} className="relative pl-6">
                    <div className={`absolute -left-[14px] top-0.5 w-7 h-7 rounded-full grid place-items-center bg-paper`}>
                      <div className="w-6 h-6 rounded-full grid place-items-center bg-accent-soft text-accent border border-accent/20">
                        <Mail className="w-3 h-3" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13.5px] font-medium text-ink">
                          {email.direction === 'inbound' ? email.from_address : "You"}
                        </span>
                        <span className="text-xs text-muted">
                          {email.direction === 'inbound' ? "sent an email" : `sent an email to ${email.to_addresses.join(', ')}`}
                        </span>
                        <span className="text-xs text-muted/60">•</span>
                        <span className="text-[11px] text-muted/80">
                          {formatDateTime(email.received_at || email.created_at)}
                        </span>
                      </div>
                      <div className="text-[13px] text-ink-2 bg-bone-2 p-3 rounded-lg border border-line inline-block max-w-[85%] whitespace-pre-wrap w-full">
                        <div className="font-semibold mb-2">{email.subject}</div>
                        <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body_html || email.body_text) }} />
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {activityToDelete && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 relative z-[10000]">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 border border-rose-200 shadow-sm">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Activity</h3>
              <p className="text-[13px] leading-relaxed text-slate-500">
                Are you sure you want to delete this activity? This action cannot be undone and it will be permanently removed from the timeline.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMutation.mutate(activityToDelete);
                  setActivityToDelete(null);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold rounded-lg shadow-sm shadow-rose-600/20 transition-all flex items-center gap-2"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Activity"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

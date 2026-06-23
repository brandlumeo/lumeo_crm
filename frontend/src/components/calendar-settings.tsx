"use client";
import { toast } from "sonner";
import { useState } from "react";
import {
  useCalendarAccounts, useConnectCalendarAccount, useDeleteCalendarAccount, useUpdateCalendarAccount,
  useBookingLinks, useCreateBookingLink, useUpdateBookingLink, useDeleteBookingLink
} from "@/lib/queries";
import { Calendar, Plus, Trash2, CheckCircle, Loader2, Link as LinkIcon, ExternalLink, Copy, Clock, ShieldCheck, Zap, Settings, HelpCircle } from "lucide-react";

const PROVIDER_META: Record<string, {
  label: string; sub: string; color: string; bg: string; border: string; gradient: string;
  logo: React.ReactNode;
}> = {
  google: {
    label: "Google", sub: "Google Calendar",
    color: "text-red-600", bg: "bg-red-50", border: "border-red-200",
    gradient: "from-red-400 to-orange-500",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  outlook: {
    label: "Microsoft", sub: "Outlook Calendar",
    color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200",
    gradient: "from-blue-500 to-indigo-600",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5">
        <rect x="1" y="4" width="14" height="16" rx="2" fill="#0078D4"/>
        <path d="M7.5 9C6.12 9 5 10.34 5 12s1.12 3 2.5 3S10 13.66 10 12 8.88 9 7.5 9z" fill="white"/>
        <path d="M15 7h8v10h-8z" fill="#0078D4"/>
        <path d="M15 7l4 5-4 5M15 12h8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  apple: {
    label: "Apple", sub: "Apple Calendar",
    color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-200",
    gradient: "from-slate-500 to-slate-700",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

const DURATION_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-violet-50 text-violet-700 border-violet-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
];

export function CalendarSettings() {
  const { data: accountsData, isLoading: isLoadingAccounts } = useCalendarAccounts();
  const { data: linksData, isLoading: isLoadingLinks } = useBookingLinks();

  const connectMutation = useConnectCalendarAccount();
  const deleteAccountMutation = useDeleteCalendarAccount();
  const updateAccountMutation = useUpdateCalendarAccount();
  const createLinkMutation = useCreateBookingLink();
  const updateLinkMutation = useUpdateBookingLink();
  const deleteLinkMutation = useDeleteBookingLink();

  const [provider, setProvider] = useState<"google" | "outlook" | "apple">("google");

  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkSlug, setLinkSlug] = useState("");
  const [linkDuration, setLinkDuration] = useState(30);
  const [linkDesc, setLinkDesc] = useState("");

  const [expandedAccountId, setExpandedAccountId] = useState<number | null>(null);
  const [editingAccountSettings, setEditingAccountSettings] = useState<any>(null);

  const handleConnect = () => connectMutation.mutate({ provider });

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    createLinkMutation.mutate(
      { name: linkName, slug: linkSlug, duration_minutes: linkDuration, description: linkDesc },
      {
        onSuccess: () => {
          setShowLinkForm(false);
          setLinkName(""); setLinkSlug(""); setLinkDesc("");
        },
      }
    );
  };

  const handleUpdateAccountSettings = (id: number) => {
    if (!editingAccountSettings) return;
    updateAccountMutation.mutate({
      id,
      payload: {
        sync_conflicts: editingAccountSettings.sync_conflicts,
        write_events: editingAccountSettings.write_events,
        location_type: editingAccountSettings.location_type,
        buffer_minutes: editingAccountSettings.buffer_minutes,
        minimum_notice_hours: editingAccountSettings.minimum_notice_hours,
        working_hours_start: editingAccountSettings.working_hours_start,
        working_hours_end: editingAccountSettings.working_hours_end,
      }
    }, {
      onSuccess: () => {
        toast.success("Calendar preferences saved!");
        setExpandedAccountId(null);
        setEditingAccountSettings(null);
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  const activeAccounts = accountsData?.results || [];
  const bookingLinks = linksData?.results || [];
  const selectedMeta = PROVIDER_META[provider];

  if (isLoadingAccounts || isLoadingLinks) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-[13px]">Loading calendar settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">

      {/* ─── Calendar Connections ─── */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">Calendar Connections</h3>
            <p className="text-[14px] text-muted">Connect your calendar to sync meetings and enable automatic booking.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Connected accounts */}
          <div className="xl:col-span-2 bg-white border border-line rounded-2xl shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />

            <div className="px-6 py-4 pt-8 border-b border-line bg-bone/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-[14px] font-semibold text-ink">Connected Calendars</span>
                {activeAccounts.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {activeAccounts.length} active
                  </span>
                )}
              </div>
            </div>

            {activeAccounts.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-center space-y-3 px-6">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-sky-400" />
                </div>
                <div className="text-[14px] font-semibold text-ink">No calendars connected</div>
                <p className="text-[13px] text-muted max-w-xs">Connect a calendar below to start syncing meetings and enabling booking links.</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {activeAccounts.map((account) => {
                  const meta = PROVIDER_META[account.provider] ?? PROVIDER_META.google;
                  return (
                    <div key={account.id} className="flex flex-col hover:bg-bone/10 transition-all">
                      <div className="flex items-center justify-between gap-4 px-6 py-4 group">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.border}`}>
                            {meta.logo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-semibold text-ink whitespace-nowrap truncate" title={account.account_email}>
                              {account.account_email}
                            </div>
                            <div className={`text-[12px] font-medium mt-0.5 whitespace-nowrap truncate ${meta.color}`}>
                              {meta.sub}
                            </div>
                          </div>
                        </div>

                        {/* Preferences Summary */}
                        <div className="hidden lg:flex items-center gap-3 text-xs text-muted pr-2 font-medium shrink-0">
                          {account.sync_conflicts && (
                            <span className="flex items-center gap-1 bg-bone px-2.5 py-0.5 rounded-md border border-line whitespace-nowrap">
                              Conflict Check
                            </span>
                          )}
                          {account.write_events && (
                            <span className="flex items-center gap-1 bg-bone px-2.5 py-0.5 rounded-md border border-line whitespace-nowrap">
                              Write Access
                            </span>
                          )}
                        </div>

                        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>

                        {/* Settings Toggle */}
                        <button
                          onClick={() => {
                            setExpandedAccountId(expandedAccountId === account.id ? null : account.id);
                            setEditingAccountSettings(expandedAccountId === account.id ? null : { ...account });
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
                            expandedAccountId === account.id
                              ? "border-slate-300 bg-bone text-ink shadow-inner"
                              : "border-transparent text-muted hover:border-slate-200 hover:bg-bone/50 hover:text-ink"
                          }`}
                          title="Configure Calendar Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => deleteAccountMutation.mutate(account.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 text-muted hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                          title="Disconnect"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Expanded Settings Form */}
                      {expandedAccountId === account.id && editingAccountSettings && (
                        <div className="px-6 py-5 bg-bone/20 border-t border-line space-y-5 animate-rise">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Sync Preferences */}
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-line">
                              <span className="text-[13px] font-bold text-ink block mb-1">Preferences & Routing</span>
                              <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={editingAccountSettings.sync_conflicts} 
                                  onChange={e => setEditingAccountSettings((prev: any) => ({ ...prev, sync_conflicts: e.target.checked }))}
                                  className="mt-1 accent-accent rounded"
                                />
                                <div>
                                  <span className="text-xs font-semibold text-ink">Check for Conflicts</span>
                                  <p className="text-[11px] text-muted leading-relaxed">Bookings will block times where this calendar has existing events.</p>
                                </div>
                              </label>
                              <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-line/50 mt-2">
                                <input 
                                  type="checkbox" 
                                  checked={editingAccountSettings.write_events} 
                                  onChange={e => setEditingAccountSettings((prev: any) => ({ ...prev, write_events: e.target.checked }))}
                                  className="mt-1 accent-accent rounded"
                                />
                                <div>
                                  <span className="text-xs font-semibold text-ink">Add Booked Meetings</span>
                                  <p className="text-[11px] text-muted leading-relaxed">New bookings will be automatically inserted into this calendar.</p>
                                </div>
                              </label>
                            </div>

                            {/* Booking Parameters */}
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-line">
                              <span className="text-[13px] font-bold text-ink block mb-1">Meeting Options</span>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-semibold text-muted mb-1">Location Type</label>
                                  <select
                                    value={editingAccountSettings.location_type}
                                    onChange={e => setEditingAccountSettings((prev: any) => ({ ...prev, location_type: e.target.value }))}
                                    className="select w-full h-9 text-xs pl-2 pr-6 py-0 border border-line rounded bg-bone/30 focus:border-ink transition-colors"
                                  >
                                    <option value="google_meet">Google Meet</option>
                                    <option value="zoom">Zoom Link</option>
                                    <option value="phone">Phone Call</option>
                                    <option value="in_person">In-Person</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-[11px] font-semibold text-muted mb-1">Buffer Time</label>
                                  <select
                                    value={editingAccountSettings.buffer_minutes}
                                    onChange={e => setEditingAccountSettings((prev: any) => ({ ...prev, buffer_minutes: parseInt(e.target.value) }))}
                                    className="select w-full h-9 text-xs pl-2 pr-6 py-0 border border-line rounded bg-bone/30 focus:border-ink transition-colors"
                                  >
                                    <option value="0">None (0 min)</option>
                                    <option value="5">5 min</option>
                                    <option value="10">10 min</option>
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                  </select>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-line/50">
                                <label className="block text-[11px] font-semibold text-muted mb-1">Minimum Notice</label>
                                <select
                                  value={editingAccountSettings.minimum_notice_hours}
                                  onChange={e => setEditingAccountSettings((prev: any) => ({ ...prev, minimum_notice_hours: parseInt(e.target.value) }))}
                                  className="select w-full h-9 text-xs pl-2 pr-6 py-0 border border-line rounded bg-bone/30 focus:border-ink transition-colors"
                                >
                                  <option value="1">1 hour in advance</option>
                                  <option value="2">2 hours in advance</option>
                                  <option value="4">4 hours in advance</option>
                                  <option value="12">12 hours in advance</option>
                                  <option value="24">24 hours (1 day) in advance</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Availability Hours */}
                          <div className="bg-white p-4 rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="text-[13px] font-bold text-ink">Availability Windows</span>
                              <p className="text-[11px] text-muted">Set daily times during which clients are allowed to request bookings.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={editingAccountSettings.working_hours_start} 
                                onChange={e => setEditingAccountSettings((prev: any) => ({ ...prev, working_hours_start: e.target.value }))}
                                className="input h-8 w-16 text-center text-xs border border-line font-mono"
                                placeholder="09:00"
                              />
                              <span className="text-xs text-muted">to</span>
                              <input 
                                type="text" 
                                value={editingAccountSettings.working_hours_end} 
                                onChange={e => setEditingAccountSettings((prev: any) => ({ ...prev, working_hours_end: e.target.value }))}
                                className="input h-8 w-16 text-center text-xs border border-line font-mono"
                                placeholder="17:00"
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex justify-end gap-2 pt-1">
                            <button 
                              type="button" 
                              onClick={() => { setExpandedAccountId(null); setEditingAccountSettings(null); }}
                              className="btn bg-white hover:bg-bone border border-line text-xs font-semibold px-4 h-8 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleUpdateAccountSettings(account.id)}
                              disabled={updateAccountMutation.isPending}
                              className="btn bg-ink hover:bg-black text-white text-xs font-semibold px-4 h-8 rounded-lg flex items-center gap-1.5"
                            >
                              {updateAccountMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Save Settings
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connect new account */}
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${selectedMeta.gradient} transition-all duration-300`} />
            <div className="p-5 pt-8 flex flex-col gap-4">
              <div className="text-[13px] font-semibold text-ink">Connect Calendar</div>
              {/* Provider selector */}
              <div className="space-y-2">
                {(["google", "outlook", "apple"] as const).map(p => {
                  const meta = PROVIDER_META[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        provider === p
                          ? `${meta.bg} ${meta.border} ring-2 ring-offset-1 shadow-sm`
                          : "border-line hover:border-slate-300 bg-bone/30"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${meta.bg} ${meta.border}`}>
                        {meta.logo}
                      </div>
                      <span className="text-[13px] font-semibold text-ink flex-1">{meta.sub}</span>
                      {provider === p && <CheckCircle className={`w-4 h-4 shrink-0 ${meta.color}`} />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
                className={`w-full btn text-white text-[13px] font-semibold flex items-center justify-center gap-2 py-2.5 transition-all shadow-sm hover:shadow-md disabled:opacity-50 bg-gradient-to-r ${selectedMeta.gradient}`}
              >
                {connectMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                  : <><Plus className="w-4 h-4" /> Connect</>
                }
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Booking Links ─── */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">Booking Links</h3>
            <p className="text-[14px] text-muted">Share these links with clients to let them book time on your calendar.</p>
          </div>
          {!showLinkForm && (
            <button
              onClick={() => setShowLinkForm(true)}
              className="btn bg-ink hover:bg-ink-dark text-white px-5 text-[13px] flex items-center gap-2 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> New Link
            </button>
          )}
        </div>

        {/* Create form */}
        {showLinkForm && (
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden relative mb-5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-indigo-500" />
            <div className="p-6 pt-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-ink">Create Booking Link</div>
                  <div className="text-[12px] text-muted">Give clients a direct link to book a meeting with you.</div>
                </div>
              </div>
              <form onSubmit={handleCreateLink} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Meeting Name</label>
                    <input required type="text" value={linkName} onChange={e => setLinkName(e.target.value)}
                      className="input w-full" placeholder="e.g. Discovery Call" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Duration</label>
                    <div className="flex gap-2 flex-wrap">
                      {DURATION_OPTIONS.map(d => (
                        <button key={d} type="button" onClick={() => setLinkDuration(d)}
                          className={`px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition-all ${
                            linkDuration === d
                              ? "border-violet-400 bg-violet-50 text-violet-700 ring-1 ring-violet-400"
                              : "border-line text-muted hover:border-slate-300"
                          }`}
                        >
                          {d}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">URL Slug</label>
                  <div className="flex items-center border border-line rounded-xl overflow-hidden focus-within:border-ink transition-colors bg-white">
                    <span className="px-3 text-[13px] text-muted bg-bone-2 border-r border-line py-2 shrink-0">/book/</span>
                    <input required type="text" value={linkSlug} onChange={e => setLinkSlug(e.target.value)}
                      className="flex-1 px-3 py-2 text-[13px] outline-none bg-transparent font-mono" placeholder="discovery-call" />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">Description <span className="text-muted font-normal">(optional)</span></label>
                  <textarea value={linkDesc} onChange={e => setLinkDesc(e.target.value)}
                    className="input w-full resize-none h-20" placeholder="Instructions or agenda for the meeting..." />
                </div>
                <div className="flex gap-3 justify-end pt-1">
                  <button type="button" onClick={() => setShowLinkForm(false)} className="btn btn-secondary text-[13px] px-4">Cancel</button>
                  <button type="submit" disabled={createLinkMutation.isPending}
                    className="btn bg-ink hover:bg-ink-dark text-white text-[13px] px-5 flex items-center gap-2">
                    {createLinkMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Booking link cards */}
        {bookingLinks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookingLinks.map((link, idx) => {
              const fullUrl = `${window.location.origin}/book/${link.slug}`;
              const palette = DURATION_COLORS[idx % DURATION_COLORS.length];
              return (
                <div key={link.id} className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden group hover:border-slate-300 hover:shadow-md transition-all">
                  {/* Top bar */}
                  <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${palette}`}>
                        {link.duration_minutes} min
                      </span>
                      <span className="text-[14px] font-semibold text-ink truncate">{link.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateLinkMutation.mutate({ id: link.id, payload: { is_active: !link.is_active } })}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          link.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-bone-2 text-muted border-line"
                        }`}
                      >
                        {link.is_active ? "Active" : "Paused"}
                      </button>
                      <button
                        onClick={() => deleteLinkMutation.mutate(link.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 text-muted transition-all opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4">
                    <p className="text-[13px] text-muted line-clamp-2 min-h-[40px] mb-3">
                      {link.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-1.5 text-[12px] text-muted bg-bone/50 border border-line rounded-lg px-3 py-1.5 font-mono truncate mb-4">
                      <LinkIcon className="w-3 h-3 text-accent shrink-0" />
                      /book/{link.slug}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => copyToClipboard(fullUrl)}
                        className="btn btn-secondary py-2 text-[12px] flex items-center justify-center gap-1.5 hover:bg-bone transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </button>
                      <a
                        href={fullUrl} target="_blank" rel="noreferrer"
                        className="btn bg-bone-2 hover:bg-bone text-ink text-[12px] flex items-center justify-center gap-1.5 border border-line transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Preview
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !showLinkForm && (
            <div className="py-14 flex flex-col items-center text-center space-y-3 bg-white border border-dashed border-line rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-[14px] font-semibold text-ink">No booking links yet</div>
              <p className="text-[13px] text-muted max-w-xs">Create a shareable link so clients can book directly on your calendar without back-and-forth emails.</p>
              <button
                onClick={() => setShowLinkForm(true)}
                className="btn bg-ink text-white text-[13px] px-5 mt-1 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Create first link
              </button>
            </div>
          )
        )}
      </div>

    </div>
  );
}

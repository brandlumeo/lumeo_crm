"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Settings, Loader2, CheckCircle, XCircle, Shield, 
  Globe2, Clock, CalendarDays, TableProperties, Download,
  UserPlus, Link as LinkIcon, Copy
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AppSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  // App Settings State
  const [timezone, setTimezone] = useState(company?.timezone ?? "UTC");
  const [dateFormat, setDateFormat] = useState(company?.date_format ?? "MMM DD, YYYY");
  const [timeFormat, setTimeFormat] = useState(company?.time_format ?? "12h");
  const [language, setLanguage] = useState(company?.language ?? "en");
  const [rowLimit, setRowLimit] = useState(company?.datatable_row_limit?.toString() ?? "10");
  const [canExport, setCanExport] = useState(company?.employee_can_export_data ?? false);

  // Client Signup Settings State
  const [allowSignup, setAllowSignup] = useState(company?.allow_client_signup ?? false);
  const [needApproval, setNeedApproval] = useState(company?.need_admin_approval_after_client_signup ?? true);
  
  // Just mock URL based on standard format shown in screenshot, since it relies on some backend key
  // We'll just construct a domain using window if available or a generic string
  const signupUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/client-signup/${company?.id}`
    : `https://crm.app/client-signup/${company?.id}`;

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "App settings updated successfully." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update app settings. Please try again." });
    },
  });

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(signupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center border border-zinc-700/50 shadow-inner shrink-0 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)] mix-blend-overlay"></div>
             <Settings className="w-7 h-7 text-white relative z-10" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">App & Client Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure your workspace preferences, localization, data tables, and client signup portals.
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => mutation.mutate({
              timezone,
              date_format: dateFormat,
              time_format: timeFormat,
              language,
              datatable_row_limit: parseInt(rowLimit) || 10,
              employee_can_export_data: canExport,
              allow_client_signup: allowSignup,
              need_admin_approval_after_client_signup: needApproval
            })}
            disabled={mutation.isPending}
            className="btn bg-ink hover:bg-ink-2 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-medium flex items-center gap-2 shrink-0 group relative overflow-hidden bg-ink hover:bg-black text-white"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can modify app settings.</span>
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      {/* App Settings Card */}
      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-600 via-gray-600 to-slate-800"></div>
        
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          
          <div className="flex items-start sm:items-center gap-4 p-5 bg-gradient-to-br from-zinc-50/50 to-slate-50/30 border border-zinc-100/50 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-paper border border-zinc-200 flex items-center justify-center shrink-0 shadow-sm">
              <Globe2 className="w-6 h-6 text-zinc-700" strokeWidth={2} />
            </div>
            <div className="pr-4">
              <div className="text-[15px] font-semibold text-ink mb-0.5">Localization & Data Preferences</div>
              <div className="text-[13px] text-muted leading-snug">Set standard regional formatting and data table defaults.</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Date Format */}
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-muted" /> Date Format
              </label>
              <div className="relative">
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  disabled={!isAdmin}
                  className={cn(
                    "input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10",
                    !isAdmin && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                  <option value="d-m-Y">d-m-Y</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Time Format */}
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted" /> Time Format
              </label>
              <div className="relative">
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  disabled={!isAdmin}
                  className={cn(
                    "input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10",
                    !isAdmin && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <option value="12h">12 Hour(s) (11:03 am)</option>
                  <option value="24h">24 Hour(s) (13:30)</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5 text-muted" /> Default Timezone
              </label>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={!isAdmin}
                  className={cn(
                    "input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10",
                    !isAdmin && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <option value="UTC">UTC</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Dubai">Asia/Dubai</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                  <Globe2 className="w-4 h-4" />
                </div>
              </div>
            </div>
            
            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                Language
              </label>
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={!isAdmin}
                  className={cn(
                    "input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10",
                    !isAdmin && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="es">🇪🇸 Español</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="de">🇩🇪 Deutsch</option>
                  <option value="hi">🇮🇳 हिन्दी</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Datatable Row Limit */}
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                <TableProperties className="w-3.5 h-3.5 text-muted" /> Datatable Row Limit
              </label>
              <div className="relative">
                <select
                  value={rowLimit}
                  onChange={(e) => setRowLimit(e.target.value)}
                  disabled={!isAdmin}
                  className={cn(
                    "input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10",
                    !isAdmin && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Data Export Toggle */}
            <div className="space-y-1.5 flex flex-col justify-center pt-5">
              <label className="relative inline-flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={canExport}
                  disabled={!isAdmin || mutation.isPending}
                  onChange={(e) => setCanExport(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[21px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-800 peer-checked:border-zinc-800 shadow-inner"></div>
                <span className="ml-3 text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <Download className="w-4 h-4 text-muted" />
                  Employee can export data
                </span>
              </label>
            </div>

          </div>
        </div>
      </div>

      {/* Client Sign Up Settings Card */}
      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500"></div>
        
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          
          <div className="flex items-start sm:items-center gap-4 p-5 bg-gradient-to-br from-blue-50/50 to-sky-50/30 border border-blue-100/50 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-paper border border-blue-200 flex items-center justify-center shrink-0 shadow-sm">
              <UserPlus className="w-6 h-6 text-blue-600" strokeWidth={2} />
            </div>
            <div className="pr-4">
              <div className="text-[15px] font-semibold text-ink mb-0.5">Client Sign up Settings</div>
              <div className="text-[13px] text-muted leading-snug">Configure self-service registration for your clients.</div>
            </div>
          </div>

          <div className="flex flex-col gap-8 max-w-2xl">
            {/* Toggles */}
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
              <label className="relative inline-flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={allowSignup}
                  disabled={!isAdmin || mutation.isPending}
                  onChange={(e) => setAllowSignup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[21px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:border-blue-600 shadow-inner"></div>
                <span className="ml-3 text-[14px] font-medium text-ink">
                  Allow Client Signup
                </span>
              </label>

              <label className="relative inline-flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={needApproval}
                  disabled={!isAdmin || mutation.isPending}
                  onChange={(e) => setNeedApproval(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[21px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:border-blue-600 shadow-inner"></div>
                <span className="ml-3 text-[14px] font-medium text-ink">
                  Require admin approval
                </span>
              </label>
            </div>

            {/* URL Display */}
            {allowSignup && (
              <div className="space-y-2 animate-fade-in w-full">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-muted" /> Client Signup URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={signupUrl}
                      className="input w-full h-11 bg-bone/50 text-muted cursor-default focus:bg-bone/50 font-mono text-xs tracking-tight px-4 truncate border-line"
                    />
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="btn btn-secondary h-11 px-5 flex items-center justify-center gap-2 bg-paper hover:bg-bone transition-colors shrink-0"
                  >
                    {copied ? (
                      <><CheckCircle className="w-4 h-4 text-green" /> Copied</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-red-500/80 font-medium italic mt-2">
                  (This URL will be used by the client to register on the website.)
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

"use client";

import { useState } from "react";
import { useEmailAccounts, useGetOAuthUrl, useDisconnectEmailAccount } from "@/lib/queries";
import { Mail, Plus, Trash2, CheckCircle, Loader2, ShieldCheck, Zap, RefreshCw } from "lucide-react";

const PROVIDER_META: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
  logo: React.ReactNode;
  gradient: string;
}> = {
  google: {
    label: "Google / Gmail",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
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
    label: "Microsoft Outlook",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    gradient: "from-blue-500 to-indigo-600",
    logo: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <rect x="1" y="4" width="14" height="16" rx="2" fill="#0078D4"/>
        <path d="M7.5 9C6.12 9 5 10.34 5 12s1.12 3 2.5 3S10 13.66 10 12 8.88 9 7.5 9z" fill="white"/>
        <path d="M15 7h6l2 2v8l-2 2h-6V7z" fill="#0078D4"/>
        <path d="M15 7l4 5-4 5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 12h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
};

const FEATURE_HIGHLIGHTS = [
  { icon: <Mail className="w-4 h-4 text-blue-500" />, title: "Email Sync", desc: "Automatically sync sent & received emails to CRM contacts." },
  { icon: <Zap className="w-4 h-4 text-amber-500" />, title: "Smart Triggers", desc: "Trigger workflow automations based on email events." },
  { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, title: "Secure OAuth", desc: "Connects via OAuth 2.0 — we never store your password." },
  { icon: <RefreshCw className="w-4 h-4 text-violet-500" />, title: "Auto Refresh", desc: "Tokens refresh automatically so syncing never breaks." },
];

export function EmailSettings() {
  const { data: accounts, isLoading } = useEmailAccounts();
  const urlMutation = useGetOAuthUrl();
  const disconnectMutation = useDisconnectEmailAccount();

  const [provider, setProvider] = useState<"google" | "outlook">("google");
  const selectedMeta = PROVIDER_META[provider];

  const handleConnect = () => {
    urlMutation.mutate(provider, {
      onSuccess: (data) => {
        if (data?.url) {
          window.location.href = data.url;
        }
      }
    });
  };

  const activeAccounts = accounts?.results || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">Email Integrations</h3>
        <p className="text-[14px] text-muted">Connect your Google or Outlook accounts to sync emails directly with your CRM.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Main accounts card */}
        <div className="xl:col-span-2 space-y-5">

          {/* Connected Accounts */}
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="px-6 py-5 pt-8 border-b border-line bg-bone/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-[14px] font-semibold text-ink">Connected Accounts</span>
                {activeAccounts.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 ml-1">
                    {activeAccounts.length} active
                  </span>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[13px]">Loading accounts...</span>
              </div>
            ) : activeAccounts.length === 0 ? (
              <div className="py-14 flex flex-col items-center text-center space-y-3 px-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-[14px] font-semibold text-ink">No accounts connected</div>
                <p className="text-[13px] text-muted max-w-xs">Connect a Google or Microsoft account below to start syncing emails with your CRM records.</p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {activeAccounts.map((account) => {
                  const meta = PROVIDER_META[account.provider] ?? PROVIDER_META.google;
                  return (
                    <div key={account.id} className="flex items-center gap-4 px-6 py-4 hover:bg-bone/30 transition-all group">
                      {/* Provider logo tile */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.bg} ${meta.border}`}>
                        {meta.logo}
                      </div>

                      {/* Account info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-ink truncate">{account.email_address}</div>
                        <div className={`text-[12px] font-medium ${meta.color} mt-0.5`}>{meta.label}</div>
                      </div>

                      {/* Status badge */}
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>

                      {/* Disconnect */}
                      <button
                        onClick={() => {
                          if (confirm("Disconnect this email account?")) {
                            disconnectMutation.mutate(account.id);
                          }
                        }}
                        disabled={disconnectMutation.isPending}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 text-muted hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-50"
                        title="Disconnect account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connect new account */}
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${selectedMeta.gradient} transition-all duration-300`} />

            <div className="p-6 pt-8">
              <div className="flex items-center gap-2 mb-5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${selectedMeta.bg} ${selectedMeta.border}`}>
                  {selectedMeta.logo}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-ink">Connect a new account</div>
                  <div className="text-[12px] text-muted">Authorise via OAuth — secure and instant.</div>
                </div>
              </div>

              {/* Provider selector tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {(["google", "outlook"] as const).map(p => {
                  const meta = PROVIDER_META[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                        provider === p
                          ? `${meta.bg} ${meta.border} ring-2 ring-offset-1 shadow-sm scale-[1.01]`
                          : "border-line hover:border-slate-300 bg-bone/30"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${meta.bg} ${meta.border}`}>
                        {meta.logo}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink truncate">
                          {p === "google" ? "Google" : "Microsoft"}
                        </div>
                        <div className="text-[11px] text-muted truncate">
                          {p === "google" ? "Gmail / Workspace" : "Outlook / 365"}
                        </div>
                      </div>
                      {provider === p && (
                        <CheckCircle className={`w-4 h-4 shrink-0 ml-auto ${meta.color}`} />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
              onClick={handleConnect}
              disabled={urlMutation.isPending}
              className={`w-full text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm ${
                urlMutation.isPending ? "opacity-75 cursor-not-allowed" : "hover:opacity-90"
              }`}
              style={{ backgroundColor: provider === "google" ? "#EA4335" : "#0078D4" }}
            >
              {urlMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}Connect {selectedMeta.label}
              </button>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Feature highlights */}
          <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line bg-bone/40 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-[13px] font-semibold text-ink">What you get</span>
            </div>
            <div className="p-5 space-y-4">
              {FEATURE_HIGHLIGHTS.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-bone-2 border border-line flex items-center justify-center shrink-0 mt-0.5">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-ink mb-0.5">{f.title}</div>
                    <div className="text-[12px] text-muted leading-relaxed">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security note */}
          <div className="bg-slate-800 text-white rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[13px] font-semibold">Secure by design</span>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              All connections use <span className="text-white font-medium">OAuth 2.0</span>. We never store your email password. You can revoke access any time from your Google or Microsoft account settings.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-semibold">TLS encrypted in transit</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

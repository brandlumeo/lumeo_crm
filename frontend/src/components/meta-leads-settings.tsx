"use client";

import { useState, useEffect } from "react";
import { useCurrentCompany, useUpdateCompany } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Globe, CheckCircle2, AlertCircle, Save, ExternalLink, 
  Trash2, ShieldCheck, Zap, HelpCircle, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function MetaLeadsSettingsForm() {
  const { data: company, isLoading } = useCurrentCompany();
  const updateCompany = useUpdateCompany();
  const queryClient = useQueryClient();

  const [pixelId, setPixelId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (company) {
      setPixelId(company.meta_pixel_id || "");
    }
  }, [company]);

  const handleConnectFacebook = async () => {
    try {
      setIsConnecting(true);
      const redirect_uri = `${window.location.origin}/settings/integrations/facebook/callback`;
      const res = await api.get(`/crm/integrations/facebook/authorize/?redirect_uri=${encodeURIComponent(redirect_uri)}`);
      if (res.data.auth_url) {
        window.location.href = res.data.auth_url;
      } else {
        toast.error("Could not obtain Facebook authorization URL.");
        setIsConnecting(false);
      }
    } catch (err: any) {
      setIsConnecting(false);
      toast.error(err.response?.data?.error || "Failed to start Facebook connection.");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect this Facebook Page? Leads will no longer automatically sync to Lumeo CRM.")) {
      return;
    }

    try {
      setIsDisconnecting(true);
      await api.post("/crm/integrations/facebook/disconnect/");
      await queryClient.invalidateQueries({ queryKey: ["current-company"] });
      toast.success("Facebook Page disconnected.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to disconnect Facebook Page.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSavePixel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    updateCompany.mutate(
      { meta_pixel_id: pixelId.trim() },
      {
        onSuccess: () => {
          toast.success("Meta Pixel / Dataset ID saved successfully.");
        },
        onError: () => {
          toast.error("Failed to save Meta Pixel ID.");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const isConnected = Boolean(company?.meta_page_id);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2]" />
          <h3 className="text-2xl font-semibold text-ink tracking-tight">Meta &amp; Facebook Lead Ads</h3>
        </div>
        <p className="text-[14px] text-muted max-w-2xl">
          Connect your Facebook Pages in 1-click. Any lead generated from Facebook or Instagram Lead Ads will immediately arrive in your Lumeo CRM leads pipeline in real time.
        </p>
      </div>

      {/* 1-Click Connect / Connected Card */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-line bg-bone/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div>
              <h4 className="text-[15px] font-semibold text-ink">Facebook Page Lead Sync</h4>
              <p className="text-[13px] text-muted">Official Meta Graph API webhook subscription</p>
            </div>
          </div>

          <div>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected &amp; Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bone text-muted border border-line">
                Not Connected
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {isConnected ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-line bg-bone-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">{company?.meta_page_name || "Facebook Page"}</span>
                    <span className="text-[11px] font-mono text-muted bg-bone px-2 py-0.5 rounded border border-line">
                      ID: {company?.meta_page_id}
                    </span>
                  </div>
                  <p className="text-xs text-muted flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Webhooks enabled for <code className="font-mono text-ink">leadgen</code> fields. New form fills route directly into this workspace.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="btn btn-secondary text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20 shrink-0 flex items-center gap-1.5"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Disconnect Page</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted">
                <span>Want to test an incoming lead right now?</span>
                <a
                  href="https://developers.facebook.com/tools/lead-ads-testing/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Meta Lead Ads Testing Tool
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-ink-2 max-w-xl">
                Click below to authorize Lumeo CRM with your Facebook account. We&rsquo;ll automatically subscribe your business Page to real-time Lead generation notifications.
              </p>

              <button
                type="button"
                onClick={handleConnectFacebook}
                disabled={isConnecting}
                className="bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium px-5 py-2.5 rounded-xl shadow-sm inline-flex items-center gap-2.5 transition-all text-sm active:scale-95"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <span>Connect with Facebook</span>
              </button>

              <div className="pt-2 flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Requires Page Admin or Lead Access permission on your Meta Business Account.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meta Conversions API (CAPI) Quality Optimization */}
      <form onSubmit={handleSavePixel} className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-line bg-bone/30">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[15px] font-semibold text-ink flex items-center gap-2">
                Conversion Leads Optimization (CAPI)
                <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Meta AI Feedback Loop
                </span>
              </h4>
              <p className="text-[13px] text-muted">
                Train Meta&rsquo;s ad delivery algorithm to target high-intent customers rather than low-quality junk leads.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5 max-w-md">
            <label className="text-[12px] font-bold text-ink uppercase tracking-wider">Meta Pixel / Dataset ID</label>
            <input
              type="text"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="e.g. 123456789012345"
              className="input w-full font-mono text-[13px]"
            />
            <p className="text-[12px] text-muted">
              Found in Meta Events Manager &rarr; Datasets &rarr; Settings &rarr; Dataset ID.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-line bg-bone-2 text-xs text-muted space-y-2">
            <div className="flex items-center gap-2 text-ink font-semibold">
              <Zap className="w-4 h-4 text-accent" />
              <span>How this boosts your ROI automatically:</span>
            </div>
            <p>
              When your sales team reviews leads on your CRM dashboard and selects <strong>&ldquo;Good Quality&rdquo;</strong>, Lumeo CRM immediately fires an authenticated <code className="font-mono text-ink">QualifiedLead</code> event to Meta. Meta uses this real conversion signal to find more lookalike customers just like your best leads.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={updateCompany.isPending}
              className="btn btn-primary min-w-[140px]"
            >
              {updateCompany.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Dataset ID
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Manual Webhook Details (Collapsible for Developers) */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-bone/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-muted" />
            <span className="text-sm font-semibold text-ink">Manual / Enterprise Webhook Credentials</span>
          </div>
          <span className="text-xs text-muted">{showAdvanced ? "Hide Details" : "Show Details"}</span>
        </button>

        {showAdvanced && (
          <div className="p-6 border-t border-line space-y-4 bg-bone/20 text-xs">
            <p className="text-muted">
              If your organization uses custom Meta Developer App settings or enterprise webhooks, configure your Page subscription using these live production endpoints:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-paper rounded-xl border border-line space-y-1">
                <span className="font-bold text-ink uppercase tracking-wider text-[11px]">Callback URL</span>
                <code className="block font-mono text-[11px] text-ink break-all select-all bg-bone p-1.5 rounded">
                  https://lumeo-crm-backend.onrender.com/api/v1/crm/webhooks/meta-leads/
                </code>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-line space-y-1">
                <span className="font-bold text-ink uppercase tracking-wider text-[11px]">Verify Token</span>
                <code className="block font-mono text-[11px] text-ink select-all bg-bone p-1.5 rounded">
                  lumeo_crm_whatsapp_token
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

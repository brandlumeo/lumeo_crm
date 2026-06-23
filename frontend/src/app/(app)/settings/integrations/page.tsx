"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Globe,
  Terminal,
  Key,
  Check,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  RefreshCw,
  Cpu,
  Lock,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import {
  useSMTPConfigs,
  useCreateSMTPConfig,
  useUpdateSMTPConfig,
  useWebhookSubscriptions,
  useCreateWebhookSubscription,
  useDeleteWebhookSubscription,
  useTestWebhookSubscription,
  useWebhookDeliveryLogs,
} from "@/lib/queries";

export default function IntegrationsSettingsPage() {
  // SMTP settings state
  const { data: smtpConfigs, isLoading: isSmtpLoading } = useSMTPConfigs();
  const createSmtpMutation = useCreateSMTPConfig();
  const updateSmtpMutation = useUpdateSMTPConfig();

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpTls, setSmtpTls] = useState(true);
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpSuccess, setSmtpSuccess] = useState(false);

  // Sync loaded SMTP config
  useEffect(() => {
    if (smtpConfigs && smtpConfigs.length > 0) {
      const config = smtpConfigs[0];
      setSmtpHost(config.host);
      setSmtpPort(config.port.toString());
      setSmtpUser(config.username);
      setSmtpFrom(config.from_email);
      setSmtpTls(config.use_tls);
    }
  }, [smtpConfigs]);

  const handleSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSuccess(false);

    const payload: any = {
      host: smtpHost.trim(),
      port: parseInt(smtpPort, 10) || 587,
      username: smtpUser.trim(),
      use_tls: smtpTls,
      from_email: smtpFrom.trim(),
    };

    if (smtpPass.trim()) {
      payload.password = smtpPass.trim();
    }

    try {
      if (smtpConfigs && smtpConfigs.length > 0) {
        await updateSmtpMutation.mutateAsync({
          id: smtpConfigs[0].id,
          payload,
        });
      } else {
        await createSmtpMutation.mutateAsync(payload);
      }
      setSmtpPass("");
      setSmtpSuccess(true);
      setTimeout(() => setSmtpSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Webhooks state
  const { data: webhookSubs, isLoading: isWebhooksLoading } = useWebhookSubscriptions();
  const { data: webhookLogs, refetch: refetchLogs } = useWebhookDeliveryLogs();
  
  const createWebhookMutation = useCreateWebhookSubscription();
  const deleteWebhookMutation = useDeleteWebhookSubscription();
  const testWebhookMutation = useTestWebhookSubscription();

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookTriggers, setWebhookTriggers] = useState<string[]>(["deal.won"]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const generateSecret = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setWebhookSecret(token);
  };

  const handleTriggerChange = (trigger: string) => {
    if (webhookTriggers.includes(trigger)) {
      setWebhookTriggers(webhookTriggers.filter((t) => t !== trigger));
    } else {
      setWebhookTriggers([...webhookTriggers, trigger]);
    }
  };

  const handleWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !webhookSecret.trim() || webhookTriggers.length === 0) return;

    try {
      await createWebhookMutation.mutateAsync({
        target_url: webhookUrl.trim(),
        secret_token: webhookSecret.trim(),
        event_triggers: webhookTriggers,
      });
      setWebhookUrl("");
      setWebhookSecret("");
      setWebhookTriggers(["deal.won"]);
    } catch (err) {
      console.error(err);
    }
  };

  const activeSmtpMutation = createSmtpMutation.isPending || updateSmtpMutation.isPending;

  return (
    <PageShell
      eyebrow="Workspace settings"
      title="Developer & Integrations"
      description="Power up Lumeo CRM with outbound HTTP hooks, custom SMTP transaction routers, and HMAC security tokens."
    >
      <div className="mb-6 flex justify-between items-center">
        <Link href="/settings" className="btn btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>

        <button
          onClick={() => void refetchLogs()}
          className="btn btn-secondary text-xs flex items-center gap-1.5 text-muted hover:text-ink"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] xl:grid-cols-[1fr_480px] gap-8 items-start">
        {/* Left Column: Config Panels */}
        <div className="space-y-8">
          {/* SMTP Router Card */}
          <div className="card border border-slate-900 bg-slate-950/40 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 grid place-items-center">
                <Mail className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">Outbound SMTP Gateway</h3>
                <p className="text-xs text-muted">Configure custom transaction routing to dispatch emails from your own domain.</p>
              </div>
            </div>

            {isSmtpLoading ? (
              <div className="py-8 text-center text-xs text-muted">Loading SMTP configurations...</div>
            ) : (
              <form onSubmit={handleSmtpSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SMTP Host</label>
                    <input
                      type="text"
                      required
                      className="input h-9 text-xs"
                      placeholder="smtp.mailgun.org"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SMTP Port</label>
                    <input
                      type="text"
                      required
                      className="input h-9 text-xs"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SMTP Username</label>
                    <input
                      type="text"
                      required
                      className="input h-9 text-xs"
                      placeholder="postmaster@yourdomain.com"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SMTP Password</label>
                    <input
                      type="password"
                      className="input h-9 text-xs"
                      placeholder={smtpConfigs && smtpConfigs.length > 0 ? "•••••••••••• (Unchanged)" : "Enter secret password..."}
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Email</label>
                    <input
                      type="email"
                      required
                      className="input h-9 text-xs"
                      placeholder="sales@yourdomain.com"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="smtp-tls"
                      checked={smtpTls}
                      onChange={(e) => setSmtpTls(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-accent focus:ring-accent"
                    />
                    <label htmlFor="smtp-tls" className="text-xs text-slate-300 font-medium cursor-pointer">
                      Use TLS (Secure Handshake)
                    </label>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <AnimatePresence>
                    {smtpSuccess && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        SMTP Persisted Successfully
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={activeSmtpMutation}
                    className="btn btn-primary btn-sm ml-auto flex items-center gap-1.5"
                  >
                    {activeSmtpMutation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Gateway Settings</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Webhooks Subscription Panel */}
          <div className="card border border-slate-900 bg-slate-950/40 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 grid place-items-center">
                <Globe className="w-4.5 h-4.5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">Outbound Webhooks</h3>
                <p className="text-xs text-muted">Subscribe external platforms to live CRM state changes securely.</p>
              </div>
            </div>

            {/* Create Subscription Form */}
            <form onSubmit={handleWebhookSubmit} className="space-y-4 p-4 border border-slate-900 bg-slate-950/80 rounded-xl mb-6">
              <h4 className="text-[11px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                Create Webhook Endpoint
              </h4>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Endpoint URL</label>
                <input
                  type="url"
                  required
                  className="input h-9 text-xs"
                  placeholder="https://api.yourdomain.com/webhooks/crm/"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-2 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secret Signing Token (HMAC SHA-256)</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className="input h-9 text-xs pr-8 font-mono"
                      placeholder="Click Generate to secure endpoint..."
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-600 absolute right-2.5 top-3" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={generateSecret}
                  className="btn btn-secondary h-9 justify-center text-xs flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5 text-accent" />
                  Generate
                </button>
              </div>

              {/* Event triggers selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Subscribed Event Triggers</label>
                <div className="flex flex-wrap gap-4 pt-1">
                  {["deal.won", "deal.lost", "lead.created"].map((event) => (
                    <label key={event} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webhookTriggers.includes(event)}
                        onChange={() => handleTriggerChange(event)}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-accent focus:ring-accent"
                      />
                      <span className="font-mono text-[11px] text-slate-400">{event}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={createWebhookMutation.isPending || !webhookUrl.trim() || !webhookSecret.trim() || webhookTriggers.length === 0}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  {createWebhookMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Subscribe Endpoint</span>
                </button>
              </div>
            </form>

            {/* Subscriptions List */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Endpoint Subscriptions</h4>
              {isWebhooksLoading ? (
                <div className="py-4 text-center text-xs text-muted">Loading subscriptions...</div>
              ) : !webhookSubs || webhookSubs.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-900 rounded-xl text-xs text-slate-500">
                  No active webhook subscriptions found.
                </div>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {webhookSubs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-3 border border-slate-900 bg-slate-950/60 rounded-xl hover:border-slate-800 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                        <div className="font-mono text-xs text-slate-200 truncate font-semibold">{sub.target_url}</div>
                        <div className="flex flex-wrap gap-1">
                          {sub.event_triggers.map((trigger) => (
                            <span
                              key={trigger}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            >
                              {trigger}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void testWebhookMutation.mutate(sub.id)}
                          disabled={testWebhookMutation.isPending}
                          className="btn btn-secondary px-2.5 py-1 h-7 text-[11px] flex items-center gap-1 hover:border-accent/40"
                          title="Trigger mock payload dispatch test event"
                        >
                          {testWebhookMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 text-accent" />
                          )}
                          <span>Test</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteWebhookMutation.mutate(sub.id)}
                          className="btn btn-secondary p-1 h-7 w-7 justify-center hover:border-rose-500/40 group/del"
                          title="Delete Subscription"
                        >
                          <Trash2 className="w-3 h-3 text-slate-500 group-hover/del:text-rose-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Webhook Logs Strip */}
        <div className="card border border-slate-900 bg-slate-950/40 p-6 flex flex-col max-h-[750px] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <Terminal className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">Live Delivery Logs</h3>
              <p className="text-xs text-muted">Real-time trace of outgoing HTTP webhook delivery states.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {!webhookLogs || webhookLogs.length === 0 ? (
              <div className="h-48 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-xs text-slate-500">
                <Cpu className="w-8 h-8 mb-2 opacity-25 text-slate-500 animate-pulse" />
                Waiting for webhooks...
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {webhookLogs.map((log) => {
                  const isSuccess = log.response_status && log.response_status >= 200 && log.response_status < 300;
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="border border-slate-900 bg-slate-950/80 rounded-xl overflow-hidden hover:border-slate-800 transition-colors"
                    >
                      {/* Log Summary Row */}
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="w-full flex items-center justify-between p-3.5 text-left text-xs bg-slate-950/40 hover:bg-slate-950 transition-colors"
                      >
                        <div className="space-y-1 pr-4 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${
                                isSuccess
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}
                            >
                              {log.response_status || "ERR"}
                            </span>
                            <span className="font-mono text-slate-300 font-semibold truncate text-[11px]">
                              {log.event_type}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Log Collapsible Detail Panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-900 bg-slate-950 p-4 space-y-4 overflow-hidden"
                          >
                            {/* Request Payload */}
                            <div className="space-y-1.5">
                              <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Dispatched JSON Payload
                              </h5>
                              <pre className="p-3 bg-slate-900/60 rounded-lg border border-slate-900/80 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap select-all">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>

                            {/* Response Body */}
                            <div className="space-y-1.5">
                              <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                Receiver Response Payload
                              </h5>
                              <pre className="p-3 bg-slate-900/60 rounded-lg border border-slate-900/80 text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap select-all">
                                {log.response_body || "(Empty Response Body)"}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

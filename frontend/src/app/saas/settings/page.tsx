"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Play, Server, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { relTime, saasApi } from "@/lib/saas";
import { Button, Field, PageHeader, Panel, Skeleton, inputCls } from "@/components/saas/ui";
import { cn } from "@/lib/utils";

type Settings = {
  maintenance_mode: boolean;
  allow_new_registrations: boolean;
  require_email_verification: boolean;
  enable_ai_features: boolean;
  enable_custom_domains: boolean;
  stripe_public_key: string;
  support_email: string;
  lifecycle_emails_enabled: boolean;
  auto_suspend_enabled: boolean;
  suspend_grace_days: number;
  lifecycle_last_run?: string | null;
  updated_at?: string;
};

const KIND_LABELS: Record<string, string> = {
  trial_7d: "Trial ends in 7 days",
  trial_3d: "Trial ends in 3 days",
  trial_1d: "Trial ends tomorrow",
  trial_ended: "Trial ended",
  renewal_7d: "Plan renews in 7 days",
  renewal_1d: "Plan renews tomorrow",
  plan_expired: "Plan expired",
};

function LifecycleActivity({ lastRun }: { lastRun?: string | null }) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const { data } = useQuery({ queryKey: ["saas", "lifecycle-events"], queryFn: () => saasApi.lifecycleEvents({ page_size: 8 }) });
  const run = async () => {
    setRunning(true);
    try {
      const r = await saasApi.runLifecycle();
      toast.success(
        r.emails_enabled
          ? `Done: ${r.emails} email(s) sent${r.suspended.length ? `, ${r.suspended.length} suspended` : ""}`
          : `Checked. Emails are off${r.suspended.length ? `; ${r.suspended.length} suspended` : ""}.`,
      );
      void qc.invalidateQueries({ queryKey: ["saas"] });
    } catch {
      toast.error("Couldn't run automation");
    } finally {
      setRunning(false);
    }
  };
  return (
    <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12.5px] text-white/50">
          Runs daily automatically. Last run: <span className="text-white/80">{lastRun ? relTime(lastRun) : "never"}</span>
        </div>
        <Button size="sm" variant="secondary" loading={running} onClick={run}>
          {!running && <Play className="h-3.5 w-3.5" />} Run now
        </Button>
      </div>
      {data && data.results.length > 0 && (
        <ul className="mt-3 divide-y divide-white/[0.05] text-[12.5px]">
          {data.results.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2">
              <Mail className="h-3.5 w-3.5 text-white/30" />
              <span className="text-white/75">{e.company.name}</span>
              <span className="text-white/40">{KIND_LABELS[e.kind] || e.kind}</span>
              <span className="ml-auto text-[11.5px] text-white/30">{relTime(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Toggle({ title, desc, checked, onChange, danger, pending }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void; danger?: boolean; pending?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <div className={cn("flex items-center gap-2 text-[13.5px] font-medium", danger && checked ? "text-rose-300" : "text-white/90")}>
          {title}
          {pending && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10.5px] font-normal text-white/40">Saved only, not enforced yet</span>}
        </div>
        <div className="mt-0.5 max-w-lg text-[12.5px] text-white/40">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 ring-1 ring-inset transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9B97A]/60",
          checked ? (danger ? "bg-rose-500/80 ring-rose-400/40" : "bg-[#C9A35E] ring-[#E9D3A3]/40") : "bg-white/[0.08] ring-white/15",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

export default function SaasSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Settings>({ queryKey: ["saas", "settings"], queryFn: saasApi.settings });
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (isLoading || !form) return <div className="space-y-4"><Skeleton className="h-16 w-72" /><Skeleton className="h-72" /><Skeleton className="h-48" /></div>;

  const set = (patch: Partial<Settings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const dirty = JSON.stringify(form) !== JSON.stringify(data);
  const save = async () => {
    if (form.maintenance_mode && !data?.maintenance_mode && !confirm("Turn on maintenance mode? Every workspace loses access until you turn it off.")) return;
    if (form.auto_suspend_enabled && !data?.auto_suspend_enabled && !confirm(`Turn on auto-suspend? Workspaces whose trial or paid plan ended more than ${form.suspend_grace_days} days ago will be suspended on the next run.`)) return;
    setSaving(true);
    try {
      const { updated_at, lifecycle_last_run, ...body } = form;
      void updated_at;
      void lifecycle_last_run;
      await saasApi.updateSettings(body);
      toast.success("Platform settings saved");
      void qc.invalidateQueries({ queryKey: ["saas"] });
    } catch {
      toast.error("Couldn't save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Settings"
        description="Global switches that affect every workspace. Changes are recorded in the audit log."
        actions={<Button variant="gold" disabled={!dirty} loading={saving} onClick={save}>Save changes</Button>}
      />

      {form.maintenance_mode && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[0.08] px-5 py-3 text-[13px] text-rose-200">
          <ShieldAlert className="h-4 w-4" /> Maintenance mode is on. Tenants can&apos;t use the CRM.
        </div>
      )}

      <Panel title={<span className="flex items-center gap-2"><Server className="h-4 w-4 text-white/40" /> Access</span>}>
        <div className="divide-y divide-white/[0.05]">
          <Toggle danger title="Maintenance mode" desc="Show a maintenance page to every tenant. Super admins can still sign in." checked={form.maintenance_mode} onChange={(v) => set({ maintenance_mode: v })} />
          <Toggle title="Allow new sign-ups" desc="Let new companies create a workspace from the public sign-up page." checked={form.allow_new_registrations} onChange={(v) => set({ allow_new_registrations: v })} />
          <Toggle title="Require email verification" desc="New sign-ups get a confirmation link and can't sign in until they click it. Existing accounts aren't affected." checked={form.require_email_verification} onChange={(v) => set({ require_email_verification: v })} />
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#E9D3A3]" /> Features</span>}>
        <div className="divide-y divide-white/[0.05]">
          <Toggle title="AI features" desc="AI assistant, email drafts and AI performance analysis. Turning this off hides the assistant and blocks every AI request." checked={form.enable_ai_features} onChange={(v) => set({ enable_ai_features: v })} />
          <Toggle title="Custom domains" desc="Allow workspaces to use their own domain for portals." pending checked={form.enable_custom_domains} onChange={(v) => set({ enable_custom_domains: v })} />
        </div>
      </Panel>

      <div id="automation" />
      <Panel title={<span className="flex items-center gap-2"><Zap className="h-4 w-4 text-[#E9D3A3]" /> Lifecycle automation</span>}
        subtitle="Keeps trials converting and renewals on time. Every email is sent once per workspace and period.">
        <div className="divide-y divide-white/[0.05]">
          <Toggle title="Trial & renewal emails"
            desc="Emails workspace owners when a trial ends in 7, 3 and 1 days, when it has ended, 7 and 1 days before a paid plan ends, and when it has expired."
            checked={form.lifecycle_emails_enabled} onChange={(v) => set({ lifecycle_emails_enabled: v })} />
          <Toggle danger title="Auto-suspend lapsed workspaces"
            desc="Suspends workspaces whose trial or paid plan ended more than the grace period ago. Data is kept; you can reactivate anytime."
            checked={form.auto_suspend_enabled} onChange={(v) => set({ auto_suspend_enabled: v })} />
          <div className="flex items-center justify-between gap-6 py-4">
            <div>
              <div className="text-[13.5px] font-medium text-white/90">Grace period</div>
              <div className="mt-0.5 text-[12.5px] text-white/40">Days after a trial or plan ends before auto-suspend applies.</div>
            </div>
            <div className="flex w-32 shrink-0 items-center gap-2">
              <input type="number" min={0} max={90} aria-label="Grace period in days" className={`${inputCls} text-right`} value={form.suspend_grace_days}
                onChange={(e) => set({ suspend_grace_days: Math.max(0, Math.min(90, parseInt(e.target.value, 10) || 0)) })} />
              <span className="text-[12px] text-white/40">days</span>
            </div>
          </div>
        </div>
        <LifecycleActivity lastRun={data?.lifecycle_last_run} />
      </Panel>

      <Panel title="Contact & payments">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Support email" hint="Shown to tenants in emails and help screens.">
            <input type="email" className={inputCls} value={form.support_email} onChange={(e) => set({ support_email: e.target.value })} />
          </Field>
          <Field label="Payment gateway public key" hint="Publishable key only. Never paste a secret key here.">
            <input className={`${inputCls} font-mono`} value={form.stripe_public_key} onChange={(e) => set({ stripe_public_key: e.target.value })} />
          </Field>
        </div>
      </Panel>
      {data?.updated_at && <p className="text-[11.5px] text-white/30">Last saved {new Date(data.updated_at).toLocaleString()}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Server, ShieldAlert, Sparkles } from "lucide-react";
import { saasApi } from "@/lib/saas";
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
  updated_at?: string;
};

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
          "relative h-6 w-11 shrink-0 rounded-full border transition",
          checked ? (danger ? "border-rose-400/40 bg-rose-500/70" : "border-[#D9B97A]/50 bg-[#C9A35E]") : "border-white/10 bg-white/[0.06]",
        )}
      >
        <span className={cn("absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
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
    setSaving(true);
    try {
      const { updated_at, ...body } = form;
      void updated_at;
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
          <Toggle title="Require email verification" desc="New accounts must confirm their email address before signing in." pending checked={form.require_email_verification} onChange={(v) => set({ require_email_verification: v })} />
        </div>
      </Panel>

      <Panel title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#E9D3A3]" /> Features</span>}>
        <div className="divide-y divide-white/[0.05]">
          <Toggle title="AI features" desc="AI assistant, smart summaries and suggestions across the CRM." pending checked={form.enable_ai_features} onChange={(v) => set({ enable_ai_features: v })} />
          <Toggle title="Custom domains" desc="Allow workspaces to use their own domain for portals." pending checked={form.enable_custom_domains} onChange={(v) => set({ enable_custom_domains: v })} />
        </div>
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

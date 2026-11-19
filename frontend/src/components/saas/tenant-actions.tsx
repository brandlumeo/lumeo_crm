"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarPlus, Crown, LogIn, Pause, Play, ShieldAlert } from "lucide-react";
import { inr, saasApi, startImpersonation, type PlanKey, type TenantRow } from "@/lib/saas";
import { Button, Field, Modal, Segmented, inputCls } from "@/components/saas/ui";

const PLANS: { key: PlanKey; label: string; monthly: number; yearly: number }[] = [
  { key: "free", label: "Free Trial", monthly: 0, yearly: 0 },
  { key: "starter", label: "Starter", monthly: 599, yearly: 5999 },
  { key: "pro", label: "Pro", monthly: 1199, yearly: 13999 },
  { key: "enterprise", label: "Enterprise", monthly: 7999, yearly: 79990 },
];

function errorText(err: any, fallback: string) {
  const d = err?.response?.data;
  if (typeof d === "string") return d;
  return d?.detail || (d && Object.values(d)[0]) || fallback;
}

export function useTenantRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["saas"] });
  };
}

export function ChangePlanModal({ tenant, open, onOpenChange, prices }: { tenant: TenantRow; open: boolean; onOpenChange: (v: boolean) => void; prices?: Record<string, { monthly: number; yearly: number }> }) {
  const refresh = useTenantRefresh();
  const [plan, setPlan] = useState<PlanKey>(tenant.plan);
  const [period, setPeriod] = useState<"monthly" | "yearly">(tenant.billing_period === "yearly" ? "yearly" : "monthly");
  const [expires, setExpires] = useState(tenant.expires_at ? tenant.expires_at.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saasApi.tenantAction(tenant.id, "change-plan", { plan, billing_period: period, expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null });
      toast.success(`${tenant.name} is now on ${PLANS.find((p) => p.key === plan)?.label}`);
      refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err, "Couldn't change the plan"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Change plan" description={`${tenant.name} · currently ${tenant.plan_display} (${tenant.billing_period})`}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="gold" loading={saving} onClick={save}>Apply plan</Button></>}>
      <div className="space-y-5">
        <Segmented value={period} onChange={setPeriod} options={[{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }]} />
        <div className="grid grid-cols-2 gap-2">
          {PLANS.map((p) => {
            const price = prices?.[p.key] || { monthly: p.monthly, yearly: p.yearly };
            const amount = period === "yearly" ? price.yearly : price.monthly;
            return (
              <button key={p.key} type="button" onClick={() => setPlan(p.key)}
                className={`rounded-xl border p-3 text-left transition ${plan === p.key ? "border-[#D9B97A]/60 bg-[#D9B97A]/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
                <div className="flex items-center gap-1.5 text-[13px] text-white">
                  {p.key === "enterprise" && <Crown className="h-3.5 w-3.5 text-[#E9D3A3]" />}
                  {p.label}
                </div>
                <div className="mt-1 font-serif text-[20px] text-white/90">{amount ? inr(amount) : "Free"}</div>
                <div className="text-[11px] text-white/35">{amount ? (period === "yearly" ? "per year" : "per month") : "trial"}</div>
              </button>
            );
          })}
        </div>
        <Field label="Paid until (optional)" hint="Leave empty for no fixed end date.">
          <input type="date" className={inputCls} value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

export function ExtendTrialModal({ tenant, open, onOpenChange }: { tenant: TenantRow; open: boolean; onOpenChange: (v: boolean) => void }) {
  const refresh = useTenantRefresh();
  const [days, setDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await saasApi.tenantAction(tenant.id, "extend-trial", { days });
      toast.success(`Trial extended by ${days} days`);
      refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err, "Couldn't extend the trial"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Extend trial" description={tenant.trial_ends_at ? `Currently ends ${new Date(tenant.trial_ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : "No trial end date set"}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="gold" loading={saving} onClick={save}>Extend</Button></>}>
      <div className="flex flex-wrap gap-2">
        {[7, 14, 30, 60, 90].map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)}
            className={`rounded-xl border px-4 py-2 text-[13px] ${days === d ? "border-[#D9B97A]/60 bg-[#D9B97A]/10 text-white" : "border-white/10 text-white/60 hover:text-white"}`}>
            +{d} days
          </button>
        ))}
      </div>
      <Field label="Or a custom number of days">
        <input type="number" min={1} max={365} className={`${inputCls} mt-3`} value={days} onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value, 10) || 1)))} />
      </Field>
    </Modal>
  );
}

export function SuspendModal({ tenant, open, onOpenChange }: { tenant: TenantRow; open: boolean; onOpenChange: (v: boolean) => void }) {
  const refresh = useTenantRefresh();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await saasApi.tenantAction(tenant.id, "suspend", { reason });
      toast.success(`${tenant.name} suspended`);
      refresh();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err, "Couldn't suspend"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Suspend workspace" description="Members lose access until you reactivate it. No data is deleted."
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="danger" loading={saving} onClick={save}>Suspend {tenant.name}</Button></>}>
      <Field label="Reason (saved in the audit log)">
        <input className={inputCls} placeholder="e.g. Payment overdue" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function ImpersonateModal({ userId, userName, companyName, open, onOpenChange }: { userId: number; userName: string; companyName: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await startImpersonation(userId);
    } catch (err) {
      toast.error(errorText(err, "Couldn't start the session"));
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Log in as ${userName}`} description={companyName}
      footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="gold" loading={busy} onClick={go}><LogIn className="h-4 w-4" /> Start session</Button></>}>
      <div className="flex gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-[12.5px] text-amber-100/80">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div className="space-y-1.5">
          <p>You&apos;ll see the CRM exactly as {userName} does, and anything you change is done as them.</p>
          <p>The session lasts up to 2 hours and is recorded in the audit log. A banner lets you return to the admin panel at any time.</p>
        </div>
      </div>
    </Modal>
  );
}

/** Action buttons for one tenant (used in the 360 view header). */
export function TenantActionBar({ tenant, prices }: { tenant: TenantRow; prices?: Record<string, { monthly: number; yearly: number }> }) {
  const refresh = useTenantRefresh();
  const [modal, setModal] = useState<"plan" | "trial" | "suspend" | "login" | null>(null);
  const [busy, setBusy] = useState(false);

  const reactivate = async () => {
    setBusy(true);
    try {
      await saasApi.tenantAction(tenant.id, "reactivate");
      toast.success(`${tenant.name} reactivated`);
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Couldn't reactivate"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {tenant.owner && (
        <Button variant="secondary" size="sm" onClick={() => setModal("login")} title={`Log in as ${tenant.owner.email}`}>
          <LogIn className="h-3.5 w-3.5" /> Log in as owner
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={() => setModal("trial")}>
        <CalendarPlus className="h-3.5 w-3.5" /> Extend trial
      </Button>
      {tenant.status === "suspended" ? (
        <Button variant="secondary" size="sm" loading={busy} onClick={reactivate}>
          <Play className="h-3.5 w-3.5" /> Reactivate
        </Button>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setModal("suspend")}>
          <Pause className="h-3.5 w-3.5" /> Suspend
        </Button>
      )}
      <Button variant="gold" size="sm" onClick={() => setModal("plan")}>
        <Crown className="h-3.5 w-3.5" /> Change plan
      </Button>

      {modal === "plan" && <ChangePlanModal tenant={tenant} prices={prices} open onOpenChange={(v) => !v && setModal(null)} />}
      {modal === "trial" && <ExtendTrialModal tenant={tenant} open onOpenChange={(v) => !v && setModal(null)} />}
      {modal === "suspend" && <SuspendModal tenant={tenant} open onOpenChange={(v) => !v && setModal(null)} />}
      {modal === "login" && tenant.owner && (
        <ImpersonateModal userId={tenant.owner.id} userName={tenant.owner.name} companyName={tenant.name} open onOpenChange={(v) => !v && setModal(null)} />
      )}
    </>
  );
}

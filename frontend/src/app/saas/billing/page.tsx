"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Pencil, RotateCcw, Search, Wallet } from "lucide-react";
import { daysUntil, inr, saasApi, shortDate, type PlanRow, type TenantRow } from "@/lib/saas";
import { Badge, Button, Empty, Field, Kpi, Modal, PageHeader, Pagination, Panel, PlanBadge, Segmented, Select, Skeleton, StatusBadge, Table, Td, Th, inputCls } from "@/components/saas/ui";
import { ChangePlanModal } from "@/components/saas/tenant-actions";

type SubState = "" | "active" | "inactive" | "expiring";

const LIMIT_FIELDS: { key: keyof PlanRow["defaults"]; label: string; money?: boolean }[] = [
  { key: "price_monthly", label: "Price / month (₹)", money: true },
  { key: "price_yearly", label: "Price / year (₹)", money: true },
  { key: "max_users", label: "Seats" },
  { key: "max_leads_monthly", label: "Leads / month" },
  { key: "max_deals_monthly", label: "Deals / month" },
  { key: "max_leads_yearly", label: "Leads / year" },
  { key: "max_deals_yearly", label: "Deals / year" },
];

function fmtLimit(n: number) {
  return n >= 999999 ? "Unlimited" : n.toLocaleString("en-IN");
}

function PlanEditor({ plan, open, onOpenChange }: { plan: PlanRow; open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, plan[f.key]])));
  const [saving, setSaving] = useState(false);
  const save = async (reset = false) => {
    setSaving(true);
    try {
      await saasApi.updatePlans({ [plan.key]: reset ? null : values });
      toast.success(reset ? `${plan.name} restored to defaults` : `${plan.name} updated`);
      void qc.invalidateQueries({ queryKey: ["saas"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Couldn't save the plan");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal wide open={open} onOpenChange={onOpenChange} title={`Edit ${plan.name}`} description="Applies to every workspace on this plan, including the pricing page and checkout."
      footer={
        <>
          {plan.customised && <Button variant="ghost" className="mr-auto" loading={saving} onClick={() => save(true)}><RotateCcw className="h-3.5 w-3.5" /> Restore defaults</Button>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="gold" loading={saving} onClick={() => save(false)}>Save plan</Button>
        </>
      }>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LIMIT_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} hint={values[f.key] !== plan.defaults[f.key] ? `Default ${fmtLimit(plan.defaults[f.key])}` : undefined}>
            <input type="number" min={0} className={inputCls} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
          </Field>
        ))}
      </div>
      <p className="mt-4 text-[11.5px] text-white/35">Tip: 999999 means unlimited.</p>
    </Modal>
  );
}

export default function BillingPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [state, setState] = useState<SubState>("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [changing, setChanging] = useState<TenantRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, plan, state]);

  const params = { search: q, plan, status: state, page, page_size: 25 };
  const { data, isLoading } = useQuery({ queryKey: ["saas", "billing", params], queryFn: () => saasApi.billing(params), placeholderData: keepPreviousData });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}</div>
      </div>
    );
  }

  const s = data.summary;
  const prices = Object.fromEntries(data.plans.map((p) => [p.key, { monthly: p.price_monthly, yearly: p.price_yearly }]));
  const subs = data.subscriptions;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Revenue" title="Billing & plans" description="Recurring revenue, plan catalogue and every subscription on the platform. Yearly plans count as one-twelfth per month." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi tone="gold" label="MRR" value={inr(s.mrr, true)} hint={`ARR ${inr(s.arr, true)}`} icon={<Wallet className="h-4 w-4" />} />
        <Kpi label="Monthly plans" value={inr(s.monthly_mrr, true)} hint="per month" />
        <Kpi label="Yearly plans" value={inr(s.yearly_mrr, true)} hint="per month (spread)" />
        <Kpi label="Renewals in 30 days" value={s.expiring_30d} hint={`${s.paying} paying workspaces`} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((p) => (
          <Panel key={p.key} padded={false} className={p.key === "enterprise" ? "border-[#D9B97A]/25" : ""}>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[14px] font-medium text-white">
                  {p.key === "enterprise" && <Crown className="h-4 w-4 text-[#E9D3A3]" />}
                  {p.name}
                </span>
                {p.customised && <Badge className="border-[#D9B97A]/30 bg-[#D9B97A]/10 text-[#E9D3A3]">Custom</Badge>}
              </div>
              <div className="mt-4 font-serif text-[34px] leading-none text-white">{p.price_monthly ? inr(p.price_monthly) : "Free"}</div>
              <div className="mt-1 text-[12px] text-white/40">{p.price_monthly ? `per month · ${inr(p.price_yearly)} yearly` : "trial plan"}</div>
              <ul className="mt-4 space-y-1.5 text-[12.5px] text-white/60">
                <li className="flex justify-between"><span>Seats</span><span className="tabular-nums text-white/85">{fmtLimit(p.max_users)}</span></li>
                <li className="flex justify-between"><span>Leads / month</span><span className="tabular-nums text-white/85">{fmtLimit(p.max_leads_monthly)}</span></li>
                <li className="flex justify-between"><span>Deals / month</span><span className="tabular-nums text-white/85">{fmtLimit(p.max_deals_monthly)}</span></li>
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div className="text-[12px] text-white/45">
                  <span className="tabular-nums text-white/85">{p.tenants}</span> workspaces
                  {p.mrr > 0 && <span className="ml-1 text-white/35">· {inr(p.mrr, true)}/mo</span>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel padded={false} title="Subscriptions" subtitle="Sorted by revenue">
        <div className="mt-3 flex flex-col gap-3 border-b border-white/[0.06] px-4 pb-4 sm:px-5 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input className={`${inputCls} pl-9`} placeholder="Search workspace…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <Segmented<SubState> value={state} onChange={setState} options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "expiring", label: "Expiring 30d" }, { value: "inactive", label: "Inactive" }]} />
          </div>
          <div className="lg:ml-auto">
            <Select value={plan} onChange={setPlan} aria-label="Plan">
              <option value="">All plans</option>
              {data.plans.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </Select>
          </div>
        </div>
        {subs.results.length === 0 ? (
          <Empty title="No subscriptions match" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Workspace</Th>
                  <Th>Plan</Th>
                  <Th>Billing</Th>
                  <Th>Workspace status</Th>
                  <Th className="text-right">MRR</Th>
                  <Th>Paid until</Th>
                  <Th className="text-right">Manage</Th>
                </tr>
              </thead>
              <tbody>
                {subs.results.map((r) => {
                  const d = daysUntil(r.expires_at);
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <Td><Link href={`/saas/companies/${r.company.id}`} className="text-white/85 hover:text-[#E9D3A3]">{r.company.name}</Link></Td>
                      <Td><PlanBadge plan={r.plan} label={r.plan_display} /></Td>
                      <Td className="capitalize text-white/55">{r.plan === "free" ? "—" : r.billing_period}{r.razorpay && <Badge className="ml-2 border-white/10 text-white/45">Razorpay</Badge>}</Td>
                      <Td><StatusBadge status={r.is_active ? r.company.status : "suspended"} /></Td>
                      <Td className="text-right tabular-nums">{r.mrr ? inr(r.mrr) : <span className="text-white/25">—</span>}</Td>
                      <Td className={d !== null && d <= 7 ? "text-amber-300" : "text-white/45"}>{r.expires_at ? `${shortDate(r.expires_at)}${d !== null && d >= 0 ? ` · ${d}d` : ""}` : "No end date"}</Td>
                      <Td className="text-right">
                        <Button size="sm" variant="secondary" onClick={() => setChanging({
                          id: r.company.id, name: r.company.name, plan: r.plan, plan_display: r.plan_display, billing_period: r.billing_period, expires_at: r.expires_at,
                        } as TenantRow)}>Change plan</Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={subs.page} pageSize={subs.page_size} count={subs.count} onPage={setPage} />
          </>
        )}
      </Panel>

      {editing && <PlanEditor plan={editing} open onOpenChange={(v) => !v && setEditing(null)} />}
      {changing && <ChangePlanModal tenant={changing} prices={prices} open onOpenChange={(v) => !v && setChanging(null)} />}
    </div>
  );
}

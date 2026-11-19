"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Briefcase, CalendarClock, FileText, Globe, LogIn, Mail, MapPin, Receipt, Target, UserRound, Users } from "lucide-react";
import { daysUntil, inr, relTime, saasApi, shortDate, type SaasUser } from "@/lib/saas";
import { Avatar, Badge, ChartTooltip, Empty, HealthPill, Meter, Panel, PlanBadge, Skeleton, StatusBadge, Table, Td, Th, accent } from "@/components/saas/ui";
import { ImpersonateModal, TenantActionBar } from "@/components/saas/tenant-actions";

const RECORD_ICONS: Record<string, React.ReactNode> = {
  Lead: <Target className="h-3.5 w-3.5" />,
  Deal: <Briefcase className="h-3.5 w-3.5" />,
  Invoice: <Receipt className="h-3.5 w-3.5" />,
  Quote: <FileText className="h-3.5 w-3.5" />,
};

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">{label}</div>
      <div className="mt-2 font-serif text-[26px] leading-none tabular-nums text-white">{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-white/35">{sub}</div>}
    </div>
  );
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: t, isLoading, isError } = useQuery({ queryKey: ["saas", "tenant", id], queryFn: () => saasApi.tenant(id) });
  const { data: billing } = useQuery({ queryKey: ["saas", "billing", "plans"], queryFn: () => saasApi.billing({ page_size: 1 }) });
  const [loginAs, setLoginAs] = useState<SaasUser | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (isError || !t) return <Empty title="Tenant not found" hint="It may have been removed." />;

  const prices = billing ? Object.fromEntries(billing.plans.map((p) => [p.key, { monthly: p.price_monthly, yearly: p.price_yearly }])) : undefined;
  const trialDays = daysUntil(t.trial_ends_at);

  return (
    <div className="space-y-6">
      <Link href="/saas/companies" className="inline-flex items-center gap-1.5 text-[12.5px] text-white/45 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> All tenants
      </Link>

      <Panel padded={false} className="overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D9B97A]/[0.08] blur-3xl" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={t.name} size={60} />
            <div className="min-w-0">
              <h1 className="truncate font-serif text-[32px] leading-tight text-white sm:text-[38px]">{t.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-white/45">
                <StatusBadge status={t.status} />
                <PlanBadge plan={t.plan} label={`${t.plan_display}${t.plan !== "free" ? ` · ${t.billing_period}` : ""}`} />
                {t.subscription_expired && <Badge className="border-amber-300/25 bg-amber-300/10 text-amber-200">Plan expired</Badge>}
                <HealthPill health={t.health} />
                <span>· Joined {shortDate(t.created_at)}</span>
                {t.status === "trial" && trialDays !== null && (
                  <Badge className={trialDays <= 3 ? "border-rose-400/20 bg-rose-400/10 text-rose-300" : "border-sky-400/20 bg-sky-400/10 text-sky-300"}>
                    <CalendarClock className="h-3 w-3" /> {trialDays < 0 ? "Trial ended" : `${trialDays}d of trial left`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <TenantActionBar tenant={t} prices={prices} />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="MRR" value={t.mrr ? inr(t.mrr) : "—"} sub={t.mrr ? `${inr(t.mrr * 12, true)} a year` : t.subscription_expired ? `Paid period ended ${shortDate(t.expires_at)}` : t.plan === "free" ? "On free trial" : "Subscription inactive"} />
        <Stat label="Seats" value={<>{t.active_users}<span className="text-[16px] text-white/35"> / {t.max_users >= 999999 ? "∞" : t.max_users}</span></>} sub={`${t.active_users_30d} active in 30 days`} />
        <Stat label="Records (30d)" value={t.records_30d} sub="Leads, deals, customers, invoices, quotes" />
        <Stat label="Last active" value={<span className="text-[22px]">{relTime(t.last_active)}</span>} sub={t.last_login ? `Last login ${relTime(t.last_login)}` : t.last_active ? "Latest record created · no login tracked yet" : "No activity yet"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Activity" subtitle="New records per month">
          {t.activity.every((m) => !m.leads && !m.deals && !m.invoices) ? (
            <Empty title="No leads, deals or invoices in the last 6 months" hint="This workspace may need onboarding help." />
          ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={t.activity} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={3}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar isAnimationActive={false} dataKey="leads" name="Leads" fill={accent.gold} radius={[5, 5, 0, 0]} maxBarSize={14} />
                <Bar isAnimationActive={false} dataKey="deals" name="Deals" fill={accent.violet} radius={[5, 5, 0, 0]} maxBarSize={14} />
                <Bar isAnimationActive={false} dataKey="invoices" name="Invoices" fill={accent.teal} radius={[5, 5, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </Panel>

        <Panel title="Plan usage" subtitle={`${t.plan_display} limits`}>
          <div className="space-y-5">
            <Meter label="Active seats" used={t.limits.users.used} max={t.limits.users.max} />
            <Meter label="Leads this month" used={t.limits.leads_this_month.used} max={t.limits.leads_this_month.max} />
            <Meter label="Deals this month" used={t.limits.deals_this_month.used} max={t.limits.deals_this_month.max} />
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              {(["leads", "deals", "customers", "invoices", "quotes"] as const).map((k) => (
                <div key={k} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-2">
                  <div className="font-serif text-[18px] tabular-nums text-white">{t.usage[k].toLocaleString("en-IN")}</div>
                  <div className="text-[10.5px] capitalize text-white/35">{k}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={<span className="flex items-center gap-2"><Users className="h-4 w-4 text-white/40" /> Team ({t.team.length})</span>} padded={false}>
          {t.team.length === 0 ? (
            <Empty title="No users yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Person</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Last login</Th>
                  <Th className="text-right">Support</Th>
                </tr>
              </thead>
              <tbody>
                {t.team.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size={30} />
                        <div className="min-w-0">
                          <div className="truncate text-white/85">{u.name}</div>
                          <div className="truncate text-[11.5px] text-white/35">{u.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td className="capitalize text-white/60">{u.designation || u.role}</Td>
                    <Td><StatusBadge status={u.is_active ? "active" : "inactive"} /></Td>
                    <Td className="text-white/45">{relTime(u.last_login)}</Td>
                    <Td className="text-right">
                      {u.is_active && !u.is_superuser && !u.is_staff ? (
                        <button onClick={() => setLoginAs(u)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[12px] text-white/60 transition hover:border-[#D9B97A]/40 hover:text-[#E9D3A3]">
                          <LogIn className="h-3.5 w-3.5" /> Log in as
                        </button>
                      ) : (
                        <span className="text-[11.5px] text-white/25">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Workspace">
            <dl className="space-y-3 text-[12.5px]">
              {t.owner && (
                <div className="flex items-start gap-3"><UserRound className="mt-0.5 h-4 w-4 text-white/30" /><div><div className="text-white/80">{t.owner.name}</div><div className="text-white/35">{t.owner.email}</div></div></div>
              )}
              {t.contact.email && <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-white/30" /><span className="text-white/70">{t.contact.email}</span></div>}
              {t.contact.website && <div className="flex items-center gap-3"><Globe className="h-4 w-4 text-white/30" /><span className="truncate text-white/70">{t.contact.website}</span></div>}
              {t.contact.address && <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-white/30" /><span className="text-white/70">{t.contact.address}</span></div>}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {Object.entries(t.modules).map(([m, on]) => (
                  <Badge key={m} className={on ? "border-white/10 bg-white/[0.05] text-white/70" : "border-white/[0.05] text-white/25 line-through"}>{m}</Badge>
                ))}
              </div>
              {t.invoiced.length > 0 && (
                <div className="border-t border-white/[0.06] pt-3">
                  <div className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-white/35">Invoiced by this tenant</div>
                  {t.invoiced.map((r) => (
                    <div key={r.currency} className="flex justify-between tabular-nums">
                      <span className="text-white/45">{r.count} invoices</span>
                      <span className="text-white/80">{r.currency} {r.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="Recent records" padded={false}>
            <div className="px-3 pb-3">
              {t.recent_records.length === 0 ? (
                <Empty title="Nothing created yet" />
              ) : (
                t.recent_records.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2 text-[12.5px]">
                    <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-1.5 text-white/45">{RECORD_ICONS[r.type]}</span>
                    <span className="min-w-0 flex-1 truncate text-white/75">{r.title}</span>
                    <span className="text-[11px] text-white/30">{relTime(r.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Admin history" padded={false}>
            <div className="px-5 pb-5">
              {t.audit.length === 0 ? (
                <p className="text-[12px] text-white/35">No admin actions on this workspace yet.</p>
              ) : (
                <ol className="space-y-3 border-l border-white/[0.08] pl-4">
                  {t.audit.map((a) => (
                    <li key={a.id} className="relative text-[12px]">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[#D9B97A]/70" />
                      <div className="text-white/75">{a.summary}</div>
                      <div className="text-white/30">{a.actor} · {relTime(a.created_at)}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {loginAs && <ImpersonateModal userId={loginAs.id} userName={loginAs.name} companyName={t.name} open onOpenChange={(v) => !v && setLoginAs(null)} />}
    </div>
  );
}

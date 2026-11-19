"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, ArrowRight, Building2, HeartPulse, RefreshCw, RotateCcw, ShieldAlert, Sparkles, TrendingUp, Users, Wallet, Zap } from "lucide-react";
import { useCurrentUser } from "@/lib/queries";
import { daysUntil, inr, relTime, saasApi, shortDate, type TenantRow } from "@/lib/saas";
import { Avatar, Button, ChartTooltip, Delta, Empty, HealthPill, Kpi, PageHeader, Panel, PlanBadge, Skeleton, StatusBadge, accent } from "@/components/saas/ui";

const PLAN_COLORS: Record<string, string> = { free: "#475569", starter: "#38BDF8", pro: accent.violet, enterprise: accent.gold };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function TenantLine({ t, right }: { t: TenantRow; right: React.ReactNode }) {
  return (
    <Link href={`/saas/companies/${t.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.03]">
      <Avatar name={t.name} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-white/85 group-hover:text-white">{t.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-white/35">
          <span>{t.plan_display}</span>·<span>{t.users} users</span>
        </div>
      </div>
      <div className="shrink-0 text-right">{right}</div>
    </Link>
  );
}

export default function SaasOverview() {
  const { data: me } = useCurrentUser();
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["saas", "stats"], queryFn: saasApi.stats, refetchInterval: 120_000 });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-80" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const k = data.kpis;
  const planTotal = data.plan_mix.reduce((s, p) => s + p.tenants, 0) || 1;
  const firstName = me?.first_name || "there";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title={<>{greeting()}, <span className="italic text-[#E9D3A3]">{firstName}</span></>}
        description={`${k.total_tenants} workspaces · ${k.total_users} people · ${inr(k.mrr)} in monthly recurring revenue.`}
        actions={
          <>
            <Link href="/saas/settings#automation" className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-3 text-[12px] ${data.lifecycle.emails_enabled ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200" : "border-white/10 text-white/45 hover:text-white"}`}>
              <Zap className="h-3.5 w-3.5" /> Automation {data.lifecycle.emails_enabled ? "on" : "off"}
            </Link>
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              {!isFetching && <RefreshCw className="h-3.5 w-3.5" />} Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tone="gold" label="Monthly recurring" icon={<Wallet className="h-4 w-4" />} value={inr(k.mrr, true)}
          delta={k.new_mrr_30d > 0 ? <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[11px] text-emerald-300">+{inr(k.new_mrr_30d, true)} new</span> : undefined}
          hint={`ARR ${inr(k.arr, true)}`} />
        <Kpi label="Paying tenants" icon={<TrendingUp className="h-4 w-4" />} value={k.paying_tenants}
          hint={`${k.paid_share}% of all · ARPA ${inr(k.arpa, true)}`} />
        <Kpi label="Workspaces" icon={<Building2 className="h-4 w-4" />} value={k.total_tenants}
          delta={<span className="flex items-center gap-1.5"><Delta value={k.new_tenants_change} /><span>{k.new_tenants_30d} new in 30d</span></span>}
          hint={`${k.active_tenants} active · ${k.trial_tenants} trial`} />
        <Kpi label="People" icon={<Users className="h-4 w-4" />} value={k.total_users}
          delta={<Delta value={k.new_users_change} />}
          hint={`${k.new_users_30d} new · ${k.active_users_30d} active (30d)`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Recurring revenue" subtitle="MRR from current paid plans, by the month each subscription started">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent.gold} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={accent.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => inr(Number(v), true)} width={64} />
                <Tooltip content={<ChartTooltip format={(v) => inr(v)} />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                <Area isAnimationActive={false} type="monotone" dataKey="mrr" name="MRR" stroke={accent.gold} strokeWidth={2} fill="url(#mrrFill)" />
                <Area isAnimationActive={false} type="monotone" dataKey="new_mrr" name="New MRR" stroke={accent.violet} strokeWidth={1.5} fill="transparent" strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Plan mix" subtitle="Active subscriptions">
          <div className="flex items-center gap-4">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={data.plan_mix} dataKey="tenants" nameKey="label" innerRadius={54} outerRadius={76} paddingAngle={3} stroke="none">
                    {data.plan_mix.map((p) => <Cell key={p.plan} fill={PLAN_COLORS[p.plan]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip format={(v) => `${v} tenants`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-serif text-[28px] leading-none">{planTotal}</span>
                <span className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-white/35">tenants</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {data.plan_mix.map((p) => (
                <div key={p.plan}>
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-white/70">
                      <span className="h-2 w-2 rounded-full" style={{ background: PLAN_COLORS[p.plan] }} />
                      {p.label}
                    </span>
                    <span className="tabular-nums text-white/85">{p.tenants}</span>
                  </div>
                  <div className="mt-0.5 text-right text-[11px] tabular-nums text-white/35">{p.mrr ? `${inr(p.mrr, true)}/mo` : "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Growth" subtitle="New workspaces and people per month">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.series} margin={{ top: 10, right: 6, left: -18, bottom: 0 }} barGap={4}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar isAnimationActive={false} dataKey="new_tenants" name="Workspaces" fill={accent.gold} radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar isAnimationActive={false} dataKey="new_users" name="People" fill={accent.violet} radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Status" subtitle="Across all workspaces">
          <div className="space-y-4">
            {[
              { key: "active", label: "Active", color: "#34D399" },
              { key: "trial", label: "In trial", color: "#38BDF8" },
              { key: "suspended", label: "Suspended", color: "#FB7185" },
            ].map((s) => {
              const n = data.status_mix[s.key] || 0;
              const pct = k.total_tenants ? (n / k.total_tenants) * 100 : 0;
              return (
                <div key={s.key}>
                  <div className="mb-1.5 flex justify-between text-[12.5px]">
                    <span className="text-white/60">{s.label}</span>
                    <span className="tabular-nums text-white/85">
                      {n} <span className="text-white/35">· {pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[12px] text-white/45">
              <Sparkles className="mb-1 h-3.5 w-3.5 text-[#D9B97A]" />
              {k.trial_tenants} workspaces are trialling. {data.expiring_trials.length} trial{data.expiring_trials.length === 1 ? "" : "s"} end within 14 days.
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Revenue movements"
          subtitle={data.movements && data.movements.days > 0 ? `${shortDate(data.movements.from)} → ${shortDate(data.movements.to)} · from daily snapshots` : "Tracked daily from today. Movements appear once there are two snapshots."}>
          {!data.movements || data.movements.days === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["New", "Expansion", "Contraction", "Churned"].map((l) => (
                <div key={l} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">{l}</div>
                  <div className="mt-2 font-serif text-[24px] text-white/30">—</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { l: "New", v: data.movements.new, n: data.movements.new_count, c: "text-emerald-300", sign: "+" },
                  { l: "Expansion", v: data.movements.expansion, n: data.movements.expansion_count, c: "text-[#C9C0FF]", sign: "+" },
                  { l: "Contraction", v: data.movements.contraction, n: data.movements.contraction_count, c: "text-amber-300", sign: "−" },
                  { l: "Churned", v: data.movements.churned, n: data.movements.churned_count, c: "text-rose-300", sign: "−" },
                ].map((m) => (
                  <div key={m.l} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/35">{m.l}</div>
                    <div className={`mt-2 font-serif text-[24px] tabular-nums ${m.v ? m.c : "text-white/40"}`}>{m.v ? `${m.sign}${inr(m.v, true)}` : "₹0"}</div>
                    <div className="mt-1 text-[11px] text-white/35">{m.n} workspace{m.n === 1 ? "" : "s"}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.06] pt-4 text-[12.5px]">
                <div><span className="text-white/40">Net change </span><span className={`font-medium tabular-nums ${data.movements.net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{data.movements.net >= 0 ? "+" : "−"}{inr(Math.abs(data.movements.net))}</span></div>
                <div><span className="text-white/40">Revenue churn </span><span className="tabular-nums text-white/85">{data.movements.churn_rate === null ? "—" : `${data.movements.churn_rate}%`}</span></div>
                <div><span className="text-white/40">Trial → paid </span><span className="tabular-nums text-white/85">{data.movements.trial_conversion === null ? "—" : `${data.movements.trial_conversion}% (${data.movements.trials_converted}/${data.movements.trials_at_start})`}</span></div>
                {data.mrr_history.length >= 2 && (
                  <div className="ml-auto h-10 w-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.mrr_history}>
                        <Line isAnimationActive={false} type="monotone" dataKey="mrr" stroke={accent.gold} strokeWidth={1.5} dot={false} />
                        <Tooltip content={<ChartTooltip format={(v) => inr(v)} />} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>

        <Panel title={<span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-[#E9D3A3]" /> Win-back</span>} subtitle="Suspended, expired or ended trials, most-used first" padded={false}>
          <div className="p-3">
            {data.win_back.length === 0 ? (
              <Empty title="No lapsed workspaces" />
            ) : (
              data.win_back.slice(0, 6).map((t) => (
                <TenantLine key={t.id} t={t} right={
                  <span className="text-[11.5px] text-white/45">
                    {t.status === "suspended" ? "Suspended" : t.subscription_expired ? "Plan expired" : "Trial ended"}
                  </span>
                } />
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title={<span className="flex items-center gap-2"><AlarmClock className="h-4 w-4 text-sky-300" /> Trials ending soon</span>} padded={false}>
          <div className="p-3">
            {data.expiring_trials.length === 0 ? (
              <Empty title="No trials ending in 14 days" />
            ) : (
              data.expiring_trials.map((t) => {
                const d = daysUntil(t.trial_ends_at);
                return <TenantLine key={t.id} t={t} right={<span className={`text-[12px] tabular-nums ${d !== null && d <= 3 ? "text-rose-300" : "text-sky-300"}`}>{d === 0 ? "Today" : `${d}d left`}</span>} />;
              })
            )}
          </div>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-rose-300" /> At-risk workspaces</span>} padded={false}>
          <div className="p-3">
            {data.at_risk.length === 0 ? (
              <Empty title="Everyone looks healthy" hint="Health uses recent logins, adoption, usage and plan status." />
            ) : (
              data.at_risk.map((t) => <TenantLine key={t.id} t={t} right={<HealthPill health={t.health} />} />)
            )}
          </div>
        </Panel>
        <Panel title={<span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#E9D3A3]" /> Most active (30 days)</span>} padded={false}>
          <div className="p-3">
            {data.top_tenants.map((t) => (
              <TenantLine key={t.id} t={t} right={<span className="text-[12px] tabular-nums text-white/60">{t.records_30d} records</span>} />
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Newest workspaces" action={<Link href="/saas/companies" className="flex items-center gap-1 text-[12.5px] text-[#E9D3A3] hover:text-white">All tenants <ArrowRight className="h-3.5 w-3.5" /></Link>} padded={false}>
          <div className="divide-y divide-white/[0.04] px-3 pb-3">
            {data.recent_signups.map((t) => (
              <Link key={t.id} href={`/saas/companies/${t.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-white/[0.03]">
                <Avatar name={t.name} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] text-white/85">{t.name}</div>
                  <div className="text-[11.5px] text-white/35">{t.owner?.email || "No owner yet"}</div>
                </div>
                <div className="hidden sm:block"><PlanBadge plan={t.plan} label={t.plan_display} /></div>
                <StatusBadge status={t.status} />
                <span className="hidden w-24 text-right text-[12px] text-white/35 md:block">{shortDate(t.created_at)}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Recent logins" padded={false}>
            <div className="px-3 pb-3">
              {data.recent_logins.length === 0 ? (
                <Empty title="No logins recorded yet" hint="Login times are tracked from now on." />
              ) : (
                data.recent_logins.slice(0, 6).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-2 py-2">
                    <Avatar name={u.name} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] text-white/80">{u.name}</div>
                      <div className="truncate text-[11px] text-white/35">{u.company?.name || "Platform"}</div>
                    </div>
                    <span className="text-[11.5px] text-white/35">{relTime(u.last_login)}</span>
                  </div>
                ))
              )}
            </div>
          </Panel>
          <Panel title={<span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-white/40" /> Admin activity</span>} action={<Link href="/saas/audit" className="text-[12px] text-white/40 hover:text-white">View log</Link>} padded={false}>
            <div className="px-5 pb-5">
              {data.recent_audit.length === 0 ? (
                <p className="text-[12px] text-white/35">Plan changes, suspensions and impersonation will appear here.</p>
              ) : (
                <ol className="space-y-3 border-l border-white/[0.08] pl-4">
                  {data.recent_audit.map((a) => (
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
    </div>
  );
}

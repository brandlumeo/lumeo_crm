"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Bot, MousePointerClick, Zap, Crown, KeyRound, LogIn, Pause, Play, ScrollText, Search, Settings, UserCheck, UserX, CalendarPlus } from "lucide-react";
import { relTime, saasApi } from "@/lib/saas";
import { Empty, PageHeader, Pagination, Panel, Select, Skeleton, inputCls } from "@/components/saas/ui";

const ICONS: Record<string, React.ReactNode> = {
  "tenant.change-plan": <Crown className="h-3.5 w-3.5 text-[#E9D3A3]" />,
  "tenant.extend-trial": <CalendarPlus className="h-3.5 w-3.5 text-sky-300" />,
  "tenant.suspend": <Pause className="h-3.5 w-3.5 text-rose-300" />,
  "tenant.reactivate": <Play className="h-3.5 w-3.5 text-emerald-300" />,
  "user.activate": <UserCheck className="h-3.5 w-3.5 text-emerald-300" />,
  "user.deactivate": <UserX className="h-3.5 w-3.5 text-rose-300" />,
  "impersonation.start": <LogIn className="h-3.5 w-3.5 text-amber-300" />,
  "impersonation.end": <LogIn className="h-3.5 w-3.5 rotate-180 text-white/40" />,
  "plans.update": <KeyRound className="h-3.5 w-3.5 text-[#C9C0FF]" />,
  "settings.update": <Settings className="h-3.5 w-3.5 text-white/50" />,
  "impersonation.action": <MousePointerClick className="h-3.5 w-3.5 text-amber-300" />,
  "tenant.auto-suspend": <Bot className="h-3.5 w-3.5 text-rose-300" />,
  "lifecycle.run": <Zap className="h-3.5 w-3.5 text-[#E9D3A3]" />,
};

export default function AuditPage() {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, action]);

  const params = { search: q, action, page, page_size: 30 };
  const { data, isLoading } = useQuery({ queryKey: ["saas", "audit", params], queryFn: () => saasApi.audit(params), placeholderData: keepPreviousData });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform" title="Audit log" description="Every action taken from this admin panel: who did it, to which workspace, when and from where." />
      <Panel padded={false}>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input className={`${inputCls} pl-9`} placeholder="Search summary, admin or workspace…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="sm:ml-auto">
            <Select value={action} onChange={setAction} aria-label="Action type">
              <option value="">All actions</option>
              <option value="tenant.">Workspace changes</option>
              <option value="user.">User changes</option>
              <option value="impersonation.">Login as tenant</option>
              <option value="plans.">Plan pricing</option>
              <option value="settings.">Platform settings</option>
              <option value="lifecycle.">Automation runs</option>
            </Select>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-5">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !data || data.results.length === 0 ? (
          <Empty icon={<ScrollText className="h-5 w-5" />} title="No admin actions yet" hint="Plan changes, suspensions, impersonation and settings changes are recorded here." />
        ) : (
          <>
            <ol className="divide-y divide-white/[0.04]">
              {data.results.map((a) => (
                <li key={a.id} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                  <span className="mt-0.5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-2">{ICONS[a.action] || <ScrollText className="h-3.5 w-3.5 text-white/40" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-white/85">{a.summary}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-white/35">
                      <span>{a.actor}</span>
                      {a.company && <>·<Link href={`/saas/companies/${a.company.id}`} className="hover:text-[#E9D3A3]">{a.company.name}</Link></>}
                      {a.ip_address && <>·<span className="font-mono">{a.ip_address}</span></>}
                      ·<span className="font-mono text-white/25">{a.action}</span>
                    </div>
                  </div>
                  <time className="shrink-0 text-[11.5px] text-white/35" title={new Date(a.created_at).toLocaleString()}>{relTime(a.created_at)}</time>
                </li>
              ))}
            </ol>
            <Pagination page={data.page} pageSize={data.page_size} count={data.count} onPage={setPage} />
          </>
        )}
      </Panel>
    </div>
  );
}

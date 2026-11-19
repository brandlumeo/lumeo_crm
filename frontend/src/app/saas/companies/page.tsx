"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Download, Pause, Play, Search, X } from "lucide-react";
import { downloadCsv, inr, relTime, saasApi, shortDate } from "@/lib/saas";
import { Avatar, Button, Empty, HealthPill, PageHeader, Pagination, Panel, PlanBadge, Segmented, Select, Skeleton, StatusBadge, Table, Td, Th, inputCls } from "@/components/saas/ui";
import { useTenantRefresh } from "@/components/saas/tenant-actions";

type Status = "" | "active" | "trial" | "suspended";

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function TenantsPage() {
  const router = useRouter();
  const refresh = useTenantRefresh();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("");
  const [plan, setPlan] = useState("");
  const [health, setHealth] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const q = useDebounced(search);

  useEffect(() => setPage(1), [q, status, plan, health, ordering]);
  const params = { search: q, status, plan, health, ordering, page, page_size: 25 };
  const { data, isLoading, isFetching } = useQuery({ queryKey: ["saas", "tenants", params], queryFn: () => saasApi.tenants(params), placeholderData: keepPreviousData });
  const rows = data?.results || [];

  const sort = (key: string) => setOrdering((o) => (o === `-${key}` ? key : `-${key}`));
  const sortProps = (key: string) => ({ onClick: () => sort(key), active: ordering.replace("-", "") === key, dir: (ordering.startsWith("-") ? "desc" : "asc") as "asc" | "desc" });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  const bulk = async (action: "suspend" | "reactivate") => {
    if (action === "suspend" && !confirm(`Suspend ${selected.size} workspace(s)? Members lose access until reactivated.`)) return;
    setBulkBusy(true);
    try {
      const res = await saasApi.tenantBulk([...selected], action);
      toast.success(`${res.updated} workspace(s) ${action === "suspend" ? "suspended" : "reactivated"}`);
      setSelected(new Set());
      refresh();
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="Tenants"
        description="Every workspace on the platform: plan, revenue, adoption and health at a glance."
        actions={
          <Button variant="secondary" size="sm" onClick={() => downloadCsv("/saas/tenants/export/", { search: q, status, plan, health, ordering }, "tenants.csv").catch(() => toast.error("Export failed"))}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      <Panel padded={false}>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input className={`${inputCls} pl-9`} placeholder="Search name, slug, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <Segmented<Status> value={status} onChange={setStatus} options={[{ value: "", label: "All" }, { value: "active", label: "Active" }, { value: "trial", label: "Trial" }, { value: "suspended", label: "Suspended" }]} />
          </div>
          <div className="flex gap-2 lg:ml-auto">
            <Select value={plan} onChange={setPlan} aria-label="Plan">
              <option value="">All plans</option>
              <option value="free">Free Trial</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </Select>
            <Select value={health} onChange={setHealth} aria-label="Health">
              <option value="">Any health</option>
              <option value="healthy">Healthy</option>
              <option value="attention">Needs attention</option>
              <option value="at_risk">At risk</option>
            </Select>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#D9B97A]/[0.06] px-5 py-2.5 text-[12.5px] sm:px-6">
            <span className="text-white/80">{selected.size} selected</span>
            <Button size="sm" variant="secondary" loading={bulkBusy} onClick={() => bulk("reactivate")}><Play className="h-3.5 w-3.5" /> Reactivate</Button>
            <Button size="sm" variant="danger" loading={bulkBusy} onClick={() => bulk("suspend")}><Pause className="h-3.5 w-3.5" /> Suspend</Button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-white/45 hover:text-white">Clear</button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2 p-5">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <Empty icon={<Building2 className="h-5 w-5" />} title="No tenants match" hint="Try a different search or clear the filters." />
        ) : (
          <div className={isFetching ? "opacity-70 transition" : "transition"}>
            <Table>
              <thead>
                <tr>
                  <Th className="w-10"><input type="checkbox" className="accent-[#D9B97A]" checked={allSelected} onChange={toggleAll} aria-label="Select all" /></Th>
                  <Th {...sortProps("name")}>Workspace</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th {...sortProps("mrr")} className="text-right">MRR</Th>
                  <Th {...sortProps("users")}>Seats</Th>
                  <Th {...sortProps("health")}>Health</Th>
                  <Th {...sortProps("last_active")}>Last active</Th>
                  <Th {...sortProps("created_at")}>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => router.push(`/saas/companies/${t.id}`)} className="cursor-pointer transition hover:bg-white/[0.025]">
                    <Td className="w-10" >
                      <span onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="accent-[#D9B97A]" checked={selected.has(t.id)} onChange={() => toggle(t.id)} aria-label={`Select ${t.name}`} />
                      </span>
                    </Td>
                    <Td>
                      <Link href={`/saas/companies/${t.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-3">
                        <Avatar name={t.name} size={34} />
                        <span className="min-w-0">
                          <span className="block max-w-[240px] truncate text-[13.5px] text-white/90">{t.name}</span>
                          <span className="block max-w-[240px] truncate text-[11.5px] text-white/35">{t.owner?.email || t.slug}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td><PlanBadge plan={t.plan} label={t.plan_display} />{t.subscription_expired ? <span className="ml-1.5 text-[10.5px] text-amber-300/80">expired</span> : t.billing_period === "yearly" && t.plan !== "free" && <span className="ml-1.5 text-[10.5px] text-white/35">yearly</span>}</Td>
                    <Td><StatusBadge status={t.status} /></Td>
                    <Td className="text-right tabular-nums">{t.mrr ? <span className="text-white/90">{inr(t.mrr)}</span> : <span className="text-white/25">—</span>}</Td>
                    <Td className="tabular-nums">
                      <span className="text-white/85">{t.active_users}</span>
                      <span className="text-white/30"> / {t.max_users >= 999999 ? "∞" : t.max_users}</span>
                    </Td>
                    <Td><HealthPill health={t.health} /></Td>
                    <Td className="text-white/50">{relTime(t.last_active)}</Td>
                    <Td className="text-white/40">{shortDate(t.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data!.page} pageSize={data!.page_size} count={data!.count} onPage={setPage} />
          </div>
        )}
      </Panel>
    </div>
  );
}

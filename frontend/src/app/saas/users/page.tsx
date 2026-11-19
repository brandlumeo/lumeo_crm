"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, LogIn, Search, ShieldCheck, UserCheck, UserX, Users, X } from "lucide-react";
import { downloadCsv, relTime, saasApi, shortDate, type SaasUser } from "@/lib/saas";
import { Avatar, Badge, Button, Empty, PageHeader, Pagination, Panel, Segmented, Select, Skeleton, StatusBadge, Table, Td, Th, inputCls } from "@/components/saas/ui";
import { ImpersonateModal } from "@/components/saas/tenant-actions";

type State = "" | "active" | "inactive" | "dormant" | "admins";

export default function SaasUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [state, setState] = useState<State>("");
  const [role, setRole] = useState("");
  const [ordering, setOrdering] = useState("-date_joined");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loginAs, setLoginAs] = useState<SaasUser | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, state, role, ordering]);

  const params = { search: q, status: state, role, ordering, page, page_size: 30 };
  const { data, isLoading, isFetching } = useQuery({ queryKey: ["saas", "users", params], queryFn: () => saasApi.users(params), placeholderData: keepPreviousData });
  const rows = data?.results || [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["saas"] });

  const toggleActive = async (u: SaasUser) => {
    try {
      await saasApi.setUserActive(u.id, !u.is_active);
      toast.success(`${u.name} ${u.is_active ? "deactivated" : "activated"}`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Couldn't update the user");
    }
  };
  const bulk = async (action: "activate" | "deactivate") => {
    setBusy(true);
    try {
      const res = await saasApi.userBulk([...selected], action);
      toast.success(`${res.updated} user(s) ${action}d`);
      setSelected(new Set());
      refresh();
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBusy(false);
    }
  };
  const sortProps = (key: string) => ({
    onClick: () => setOrdering((o) => (o === `-${key}` ? key : `-${key}`)),
    active: ordering.replace("-", "") === key,
    dir: (ordering.startsWith("-") ? "desc" : "asc") as "asc" | "desc",
  });
  const selectable = rows.filter((u) => !u.is_superuser);
  const allSelected = selectable.length > 0 && selectable.every((u) => selected.has(u.id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customers"
        title="People"
        description="Everyone with an account across all workspaces."
        actions={
          <Button variant="secondary" size="sm" onClick={() => downloadCsv("/saas/users/export/", { search: q, status: state, role, ordering }, "users.csv").catch(() => toast.error("Export failed"))}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      <Panel padded={false}>
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input className={`${inputCls} pl-9`} placeholder="Name, email or company…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="overflow-x-auto">
            <Segmented<State> value={state} onChange={setState} options={[
              { value: "", label: "All" }, { value: "active", label: "Active" }, { value: "dormant", label: "Dormant 30d+" }, { value: "inactive", label: "Deactivated" }, { value: "admins", label: "Platform admins" },
            ]} />
          </div>
          <div className="lg:ml-auto">
            <Select value={role} onChange={setRole} aria-label="Role">
              <option value="">All roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </Select>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#D9B97A]/[0.06] px-5 py-2.5 text-[12.5px] sm:px-6">
            <span className="text-white/80">{selected.size} selected</span>
            <Button size="sm" variant="secondary" loading={busy} onClick={() => bulk("activate")}><UserCheck className="h-3.5 w-3.5" /> Activate</Button>
            <Button size="sm" variant="danger" loading={busy} onClick={() => bulk("deactivate")}><UserX className="h-3.5 w-3.5" /> Deactivate</Button>
            <button onClick={() => setSelected(new Set())} className="ml-auto text-white/45 hover:text-white">Clear</button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2 p-5">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : rows.length === 0 ? (
          <Empty icon={<Users className="h-5 w-5" />} title="No people match" hint="Try another search or filter." />
        ) : (
          <div className={isFetching ? "opacity-70 transition" : "transition"}>
            <Table>
              <thead>
                <tr>
                  <Th className="w-10"><input type="checkbox" className="accent-[#D9B97A]" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map((u) => u.id)))} aria-label="Select all" /></Th>
                  <Th {...sortProps("first_name")}>Person</Th>
                  <Th>Workspace</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th {...sortProps("last_login")}>Last login</Th>
                  <Th {...sortProps("date_joined")}>Joined</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <Td className="w-10">
                      {!u.is_superuser && (
                        <input type="checkbox" className="accent-[#D9B97A]" checked={selected.has(u.id)} aria-label={`Select ${u.name}`}
                          onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(u.id)) n.delete(u.id); else n.add(u.id); return n; })} />
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size={32} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-white/90">
                            {u.name}
                            {u.is_superuser && <ShieldCheck className="h-3.5 w-3.5 text-[#E9D3A3]" aria-label="Platform admin" />}
                          </div>
                          <div className="truncate text-[11.5px] text-white/35">{u.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>{u.company ? <Link href={`/saas/companies/${u.company.id}`} className="text-white/70 hover:text-[#E9D3A3]">{u.company.name}</Link> : <span className="text-white/30">—</span>}</Td>
                    <Td>{u.is_superuser ? <Badge className="border-[#D9B97A]/30 bg-[#D9B97A]/10 text-[#E9D3A3]">Super admin</Badge> : <span className="capitalize text-white/60">{u.role}</span>}</Td>
                    <Td><StatusBadge status={u.is_active ? "active" : "inactive"} /></Td>
                    <Td className="text-white/50">{relTime(u.last_login)}</Td>
                    <Td className="text-white/40">{shortDate(u.date_joined)}</Td>
                    <Td className="text-right">
                      {!u.is_superuser && (
                        <div className="inline-flex gap-1.5">
                          {u.is_active && !u.is_staff && u.company && (
                            <button onClick={() => setLoginAs(u)} title="Log in as this user" className="rounded-lg border border-white/10 p-1.5 text-white/50 transition hover:border-[#D9B97A]/40 hover:text-[#E9D3A3]">
                              <LogIn className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => toggleActive(u)} title={u.is_active ? "Deactivate" : "Activate"}
                            className={`rounded-lg border border-white/10 p-1.5 transition ${u.is_active ? "text-white/50 hover:border-rose-400/40 hover:text-rose-300" : "text-white/50 hover:border-emerald-400/40 hover:text-emerald-300"}`}>
                            {u.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={data!.page} pageSize={data!.page_size} count={data!.count} onPage={setPage} />
          </div>
        )}
      </Panel>

      {loginAs && <ImpersonateModal userId={loginAs.id} userName={loginAs.name} companyName={loginAs.company?.name || ""} open onOpenChange={(v) => !v && setLoginAs(null)} />}
    </div>
  );
}

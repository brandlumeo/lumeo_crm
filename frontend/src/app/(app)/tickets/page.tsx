"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Ticket as TicketIcon,
  Plus,
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  X,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  MoreHorizontal
} from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { useTickets, useCreateTicket, useUpdateTicket, useDeleteTicket } from "@/lib/queries";
import { Ticket, TicketInput } from "@/lib/types";

const PAGE_SIZE = 20;

const STATUS_META: Record<string, { label: string; chip: string; icon: React.ElementType }> = {
  open:        { label: "Open",        chip: "chip chip-warning",  icon: AlertCircle },
  in_progress: { label: "In Progress", chip: "chip chip-info",     icon: TrendingUp },
  waiting:     { label: "Waiting",     chip: "chip chip-neutral",  icon: Clock },
  resolved:    { label: "Resolved",    chip: "chip chip-positive", icon: CheckCircle2 },
  closed:      { label: "Closed",      chip: "chip chip-neutral",  icon: XCircle },
};

const PRIORITY_META: Record<string, { label: string; chip: string }> = {
  low:    { label: "Low",    chip: "bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-xs font-medium" },
  medium: { label: "Medium", chip: "bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-xs font-medium" },
  high:   { label: "High",   chip: "bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md text-xs font-medium" },
  urgent: { label: "Urgent", chip: "bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md text-xs font-medium" },
};

const STATUSES = Object.keys(STATUS_META);
const PRIORITIES = Object.keys(PRIORITY_META);

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4 animate-rise">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-muted mb-0.5">{label}</div>
        <div className="text-2xl font-semibold text-ink leading-none">{value}</div>
        {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Ticket detail slide-over ────────────────────────────────────────────────

function TicketDrawer({
  ticket,
  onClose,
  onStatusChange,
  onPriorityChange,
  onDelete,
}: {
  ticket: Ticket;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onPriorityChange: (id: number, priority: string) => void;
  onDelete: (id: number) => void;
}) {
  const statusMeta = STATUS_META[ticket.status] ?? STATUS_META.open;
  const priorityMeta = PRIORITY_META[ticket.priority] ?? PRIORITY_META.medium;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[500px] bg-paper border-l border-line shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-bone shrink-0">
          <div>
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Ticket #{ticket.id}</div>
            <div className="text-lg font-semibold text-ink truncate max-w-[300px]" title={ticket.subject}>{ticket.subject}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Status & Priority Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted mb-1.5 block">Status</label>
              <div className="relative">
                <select
                  value={ticket.status}
                  onChange={(e) => onStatusChange(ticket.id, e.target.value)}
                  className="input appearance-none pr-8 cursor-pointer font-medium"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted mb-1.5 block">Priority</label>
              <div className="relative">
                <select
                  value={ticket.priority}
                  onChange={(e) => onPriorityChange(ticket.id, e.target.value)}
                  className="input appearance-none pr-8 cursor-pointer font-medium"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Customer</div>
              <div className="text-sm font-medium text-ink">
                {ticket.customer ? `Customer ID: ${ticket.customer}` : "—"}
              </div>
            </div>
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Assignee</div>
              <div className="text-sm font-medium text-ink">
                {ticket.assigned_to ? (ticket.assigned_to.first_name || ticket.assigned_to.username) : "Unassigned"}
              </div>
            </div>
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Created</div>
              <div className="text-sm font-medium text-ink">
                {new Date(ticket.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Last Updated</div>
              <div className="text-sm font-medium text-ink">
                {new Date(ticket.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Description</div>
            <div className="surface-muted p-4 rounded-lg text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">
              {ticket.description || <span className="italic text-muted">No description provided.</span>}
            </div>
          </div>

          {/* Comments preview */}
          {ticket.comments && ticket.comments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-muted uppercase tracking-wider">Recent Activity</div>
              </div>
              <div className="space-y-3">
                {ticket.comments.map((comment, idx) => (
                  <div key={comment.id || idx} className="bg-bone border border-line rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="font-medium text-ink text-sm">
                        {comment.author ? (comment.author.first_name || comment.author.username) : "System"}
                        {comment.is_internal && (
                          <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Internal Note</span>
                        )}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(comment.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="text-sm text-ink-2 whitespace-pre-wrap">{comment.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-bone shrink-0 flex justify-between items-center">
          <button
            onClick={() => {
              if (confirm(`Delete ticket #${ticket.id}?`)) {
                onDelete(ticket.id);
                onClose();
              }
            }}
            className="btn btn-ghost text-red-500 hover:bg-red-50 hover:border-red-200 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button onClick={onClose} className="btn btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortColumn, setSortColumn] = useState("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // New ticket form
  const [newTicket, setNewTicket] = useState<TicketInput>({
    subject: "",
    description: "",
    priority: "medium",
  });

  useEffect(() => { setMounted(true); }, []);

  const params: any = {
    page,
    search: search || undefined,
    status: statusFilter || undefined,
    ordering: sortDirection === "desc" ? `-${sortColumn}` : sortColumn,
  };

  const { data, isLoading } = useTickets(params);
  const createMutation = useCreateTicket();
  const updateMutation = useUpdateTicket();
  const deleteMutation = useDeleteTicket();

  const tickets: Ticket[] = data?.results ?? [];
  const total = data?.count ?? 0;

  // Stats computed from all data (page 1 without status filter)
  const { data: allData } = useTickets({ page: 1 });
  const allTickets: Ticket[] = allData?.results ?? [];

  const stats = useMemo(() => {
    return {
      total: allData?.count ?? 0,
      open: allTickets.filter((t) => t.status === "open").length,
      inProgress: allTickets.filter((t) => t.status === "in_progress").length,
      resolved: allTickets.filter((t) => t.status === "resolved").length,
    };
  }, [allTickets, allData]);

  // Handlers
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newTicket, {
      onSuccess: () => {
        setIsModalOpen(false);
        setNewTicket({ subject: "", description: "", priority: "medium" });
        toast.success("Ticket created successfully.");
      },
      onError: () => toast.error("Failed to create ticket."),
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate(
      { id, payload: { status } },
      {
        onSuccess: (updated: any) => {
          toast.success(`Ticket status updated to ${STATUS_META[status]?.label}.`);
        },
        onError: () => toast.error("Failed to update status."),
      }
    );
  };

  const handlePriorityChange = (id: number, priority: string) => {
    updateMutation.mutate(
      { id, payload: { priority } },
      {
        onSuccess: (updated: any) => {
          toast.success(`Ticket priority updated to ${PRIORITY_META[priority]?.label}.`);
        },
        onError: () => toast.error("Failed to update priority."),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Ticket deleted."),
      onError: () => toast.error("Could not delete ticket."),
    });
  };

  const clearFilters = () => {
    setStatusFilter("");
    setSearch("");
    setPage(1);
  };

  return (
    <PageShell
      eyebrow="Customer Support"
      title="Support Tickets"
      description="Manage and resolve customer requests. Track issues, assign them to your team, and monitor progress."
    >
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={TicketIcon}
          label="Total Tickets"
          value={stats.total}
          sub="all time"
          color="bg-slate-100 text-slate-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Open"
          value={stats.open}
          sub="requires attention"
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={stats.inProgress}
          sub="being worked on"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={stats.resolved}
          sub="successfully closed"
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* ── Main card ── */}
      <div className="card animate-rise">
        {/* Card header */}
        <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="card-title">
            Ticket Inbox
            <span className="card-title-meta">{total} total</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto ml-auto">
            {/* Search */}
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input sm:w-[220px]"
              placeholder="Search by subject..."
            />
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="input pr-8 appearance-none cursor-pointer"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            </div>
            {/* Clear filters */}
            {(statusFilter || search) && (
              <button onClick={clearFilters} className="btn btn-ghost text-muted text-xs gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            {/* Add new */}
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary gap-2 text-sm ml-2">
              <Plus className="w-4 h-4" /> New Ticket
            </button>
          </div>
        </div>

        {/* Table */}
        {!mounted || (isLoading && !data) ? (
          <SkeletonTable columns={5} rows={8} />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            title={(statusFilter || search) ? "No tickets match your filters" : "Inbox Zero"}
            description={
              (statusFilter || search)
                ? "Try clearing the filters to see all tickets."
                : "You have no support tickets. Enjoy the silence!"
            }
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "id",
                header: "ID",
                sortable: true,
                className: "w-20",
                render: (ticket) => (
                  <div className="font-mono text-xs font-semibold text-muted uppercase tracking-wide">
                    #{ticket.id}
                  </div>
                ),
              },
              {
                key: "subject",
                header: "Subject & Customer",
                sortable: true,
                render: (ticket) => (
                  <div className="max-w-[300px]">
                    <div className="font-medium text-ink truncate group-hover:text-brand transition-colors">
                      {ticket.subject}
                    </div>
                    <div className="text-[11px] text-muted truncate mt-0.5 flex items-center gap-2">
                      {ticket.customer ? `Customer ID: ${ticket.customer}` : "No customer linked"}
                      {ticket.comments && ticket.comments.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.comments.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                sortable: true,
                render: (ticket) => {
                  const m = STATUS_META[ticket.status] ?? STATUS_META.open;
                  return <span className={m.chip}>{m.label}</span>;
                },
              },
              {
                key: "priority",
                header: "Priority",
                sortable: true,
                render: (ticket) => {
                  const p = PRIORITY_META[ticket.priority] ?? PRIORITY_META.medium;
                  return (
                    <span className={p.chip}>
                      {p.label}
                    </span>
                  );
                },
              },
              {
                key: "assigned_to",
                header: "Assignee",
                sortable: false,
                render: (ticket) => {
                  if (!ticket.assigned_to) {
                    return <span className="text-muted italic text-xs">Unassigned</span>;
                  }
                  return (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold">
                        {(ticket.assigned_to.first_name?.[0] ?? ticket.assigned_to.username?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-sm text-ink font-medium">{ticket.assigned_to.first_name || ticket.assigned_to.username}</span>
                    </div>
                  );
                },
              },
              {
                key: "created_at",
                header: "Created",
                sortable: true,
                render: (ticket) => (
                  <span className="text-muted text-sm">
                    {new Date(ticket.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
            ]}
            rows={tickets}
            count={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSortChange={(col, dir) => {
              setSortColumn(col);
              setSortDirection(dir);
            }}
            onRowClick={(ticket) => router.push(`/tickets/${ticket.id}`)}
            bulkActions={[
              {
                label: "Mark Resolved",
                onClick: (ids) => {
                  ids.forEach((id) => updateMutation.mutate({ id: parseInt(id), payload: { status: "resolved" } }));
                  toast.success(`Marked ${ids.length} ticket(s) as resolved.`);
                },
              },
              {
                label: "Mark Closed",
                onClick: (ids) => {
                  ids.forEach((id) => updateMutation.mutate({ id: parseInt(id), payload: { status: "closed" } }));
                  toast.success(`Closed ${ids.length} ticket(s).`);
                },
              },
              {
                label: "Delete",
                variant: "danger",
                onClick: (ids) => {
                  if (!confirm(`Delete ${ids.length} ticket(s)?`)) return;
                  ids.forEach((id) => deleteMutation.mutate(parseInt(id)));
                  toast.success(`Deleted ${ids.length} ticket(s).`);
                },
              },
            ]}
          />
        )}
      </div>

      {/* ── Create ticket modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form 
            onSubmit={handleCreate} 
            className="relative w-full max-w-xl bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/10 flex flex-col overflow-hidden animate-rise"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-bone shrink-0">
              <div>
                <div className="text-lg font-semibold text-ink">New Support Ticket</div>
                <div className="text-xs text-muted mt-0.5">Report an issue or request assistance.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 min-h-0">
                <label>
                  <span className="label">Subject *</span>
                  <input
                    required
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    className="input"
                    placeholder="Brief summary of the issue"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <span className="label">Priority</span>
                    <div className="relative">
                      <select
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="input appearance-none pr-8 cursor-pointer"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>{PRIORITY_META[p].label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  </label>
                  
                  {/* Status doesn't need to be set on creation typically, it defaults to Open, but we can add it if needed */}
                </div>

                <label>
                  <span className="label">Description *</span>
                  <textarea
                    required
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    rows={5}
                    placeholder="Provide all details, error messages, and context to help us resolve the issue faster..."
                    className="input resize-y"
                  />
                </label>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-line bg-bone flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn btn-primary text-sm gap-2"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                  ) : (
                    <><TicketIcon className="w-4 h-4" /> Create Ticket</>
                  )}
                </button>
              </div>
          </form>
        </div>
      )}
    </PageShell>
  );
}

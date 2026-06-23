"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Loader2,
  Trash2,
  Download,
  Package,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  X,
  PlusCircle,
  IndianRupee,
} from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { useOrders, useCreateOrder, useUpdateOrder, useDeleteOrder } from "@/lib/queries";
import { formatINR, toNumber, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

const STATUS_META: Record<string, { label: string; chip: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    chip: "chip chip-warning",  icon: Clock         },
  processing: { label: "Processing", chip: "chip chip-info",     icon: TrendingUp    },
  completed:  { label: "Completed",  chip: "chip chip-positive", icon: CheckCircle2  },
  cancelled:  { label: "Cancelled",  chip: "chip chip-neutral",  icon: XCircle       },
};

const STATUSES = Object.keys(STATUS_META);

interface LineItem {
  name: string;
  description: string;
  quantity: number;
  unit_price: string;
  tax_rate: string;
}

const emptyItem = (): LineItem => ({
  name: "",
  description: "",
  quantity: 1,
  unit_price: "",
  tax_rate: "0",
});

function itemSubtotal(item: LineItem) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unit_price) || 0;
  return qty * price;
}

function itemTax(item: LineItem) {
  return itemSubtotal(item) * ((Number(item.tax_rate) || 0) / 100);
}

function itemTotal(item: LineItem) {
  return itemSubtotal(item) + itemTax(item);
}

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

// ── Order detail slide-over ────────────────────────────────────────────────

function OrderDrawer({
  order,
  onClose,
  onStatusChange,
  onDelete,
}: {
  order: any;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const meta = STATUS_META[order.status] ?? STATUS_META.pending;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[480px] bg-paper border-l border-line shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-bone shrink-0">
          <div>
            <div className="font-mono text-xs text-muted uppercase tracking-wider mb-0.5">Order</div>
            <div className="text-lg font-semibold text-ink">{order.order_number}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={meta.chip}>{meta.label}</span>
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
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Customer</div>
              <div className="text-sm font-medium text-ink">{order.customer_name ?? "—"}</div>
            </div>
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Created</div>
              <div className="text-sm font-medium text-ink">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
            </div>
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Created By</div>
              <div className="text-sm font-medium text-ink">
                {order.created_by ? (order.created_by.first_name || order.created_by.username) : "—"}
              </div>
            </div>
            <div className="surface-muted p-3 rounded-lg">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Grand Total</div>
              <div className="text-sm font-medium text-ink font-serif">{formatINR(toNumber(order.total))}</div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wider mb-2">Notes</div>
              <div className="surface-muted p-3 rounded-lg text-sm text-ink leading-relaxed whitespace-pre-wrap">{order.notes}</div>
            </div>
          )}

          {/* Line items */}
          {order.items && order.items.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Line Items</div>
              <div className="border border-line rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-bone-2 border-b border-line text-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium">Item</th>
                      <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                      <th className="px-3 py-2.5 text-right font-medium">Rate</th>
                      <th className="px-3 py-2.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {order.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-bone-2/40 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-ink">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-muted mt-0.5">{item.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-muted">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">{formatINR(toNumber(item.unit_price))}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs font-medium text-ink">{formatINR(toNumber(item.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Totals footer */}
                <div className="bg-bone border-t border-line divide-y divide-line">
                  <div className="flex justify-between items-center px-3 py-2 text-xs text-muted">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatINR(toNumber(order.subtotal))}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 text-xs text-muted">
                    <span>Tax</span>
                    <span className="font-mono">{formatINR(toNumber(order.tax_amount))}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5 text-sm font-semibold text-ink bg-bone-2">
                    <span>Grand Total</span>
                    <span className="font-serif text-base">{formatINR(toNumber(order.total))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Change status */}
          <div>
            <div className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Change Status</div>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => {
                const m = STATUS_META[s];
                const Icon = m.icon;
                const active = order.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(order.id, s)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-bone hover:border-ink/30 text-ink"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-bone shrink-0 flex justify-between items-center">
          <button
            onClick={() => {
              if (confirm(`Delete order ${order.order_number}?`)) {
                onDelete(order.id);
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

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortColumn, setSortColumn] = useState("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // New order form
  const [form, setForm] = useState({ status: "pending", notes: "" });
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  useEffect(() => { setMounted(true); }, []);

  const params: any = {
    page,
    search: search || undefined,
    status: statusFilter || undefined,
    ordering: sortDirection === "desc" ? `-${sortColumn}` : sortColumn,
  };

  const { data, isLoading } = useOrders(params);
  const createMutation = useCreateOrder();
  const updateMutation = useUpdateOrder();
  const deleteMutation = useDeleteOrder();

  const orders: any[] = data?.results ?? [];
  const total = data?.count ?? 0;

  // ── Stats computed from all orders ──────────────────────────────────────
  // We do a separate all-orders query for stats
  const { data: allData } = useOrders({ page: 1, ordering: "-created_at" });
  const allOrders: any[] = allData?.results ?? [];

  const stats = useMemo(() => {
    return {
      total: allData?.count ?? 0,
      pending: allOrders.filter((o) => o.status === "pending").length,
      completed: allOrders.filter((o) => o.status === "completed").length,
      revenue: allOrders
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + toNumber(o.total), 0),
    };
  }, [allOrders, allData]);

  // ── Line item helpers ──────────────────────────────────────────────────
  const grandSubtotal = items.reduce((s, i) => s + itemSubtotal(i), 0);
  const grandTax = items.reduce((s, i) => s + itemTax(i), 0);
  const grandTotal = grandSubtotal + grandTax;

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: any) =>
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      items: items.filter((i) => i.name.trim()),
    };
    createMutation.mutate(payload, {
      onSuccess: () => {
        setIsModalOpen(false);
        setForm({ status: "pending", notes: "" });
        setItems([emptyItem()]);
        toast.success("Order created successfully.");
      },
      onError: () => toast.error("Failed to create order."),
    });
  };

  const handleStatusChange = (id: number, status: string) => {
    updateMutation.mutate(
      { id, payload: { status } },
      {
        onSuccess: (updated: any) => {
          setSelectedOrder(updated);
          toast.success(`Order moved to ${STATUS_META[status]?.label}.`);
        },
        onError: () => toast.error("Failed to update status."),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Order deleted."),
      onError: () => toast.error("Could not delete order."),
    });
  };

  const handleExport = () => {
    if (orders.length === 0) return toast.info("No orders to export.");
    const rows = [
      ["Order #", "Customer", "Status", "Subtotal", "Tax", "Total", "Created"],
      ...orders.map((o) => [
        o.order_number,
        o.customer_name ?? "",
        o.status,
        toNumber(o.subtotal).toFixed(2),
        toNumber(o.tax_amount).toFixed(2),
        toNumber(o.total).toFixed(2),
        new Date(o.created_at).toLocaleDateString("en-IN"),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported orders CSV.");
  };

  const hasFilters = statusFilter || dateFrom || dateTo || search;
  const clearFilters = () => {
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
  };

  return (
    <PageShell
      eyebrow="Sales Operations"
      title="Orders"
      description="Track and manage customer orders from placement to fulfilment. Click any row to view details or update status."
    >
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.total}
          sub="all time"
          color="bg-slate-100 text-slate-600"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          sub="awaiting action"
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          sub="fulfilled"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue"
          value={formatINR(stats.revenue)}
          sub="completed orders"
          color="bg-blue-50 text-blue-600"
        />
      </div>

      {/* ── Main card ── */}
      <div className="card animate-rise">
        {/* Card header */}
        <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="card-title">
            Order list
            <span className="card-title-meta">{total} total</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto ml-auto">
            {/* Search */}
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input sm:w-[220px]"
              placeholder="Search by order # or customer"
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
            {/* Date range */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="input text-sm"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="input text-sm"
              title="To date"
            />
            {/* Clear filters */}
            {hasFilters && (
              <button onClick={clearFilters} className="btn btn-ghost text-muted text-xs gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            {/* Export */}
            <button onClick={handleExport} className="btn btn-secondary gap-2 text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
            {/* Add new */}
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Order
            </button>
          </div>
        </div>

        {/* Table */}
        {!mounted || (isLoading && !data) ? (
          <SkeletonTable columns={6} rows={8} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={hasFilters ? "No orders match your filters" : "No orders yet"}
            description={
              hasFilters
                ? "Try clearing the filters to see all orders."
                : "Create your first order using the 'Add Order' button."
            }
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "order_number",
                header: "Order #",
                sortable: true,
                render: (order) => (
                  <div className="font-mono text-xs font-semibold text-ink uppercase tracking-wide">
                    {order.order_number}
                  </div>
                ),
              },
              {
                key: "customer",
                header: "Client",
                sortable: false,
                render: (order) =>
                  order.customer_name ? (
                    <div>
                      <div className="font-medium text-ink">{order.customer_name}</div>
                    </div>
                  ) : (
                    <span className="text-muted italic text-sm">No client</span>
                  ),
              },
              {
                key: "status",
                header: "Status",
                sortable: true,
                render: (order) => {
                  const m = STATUS_META[order.status] ?? STATUS_META.pending;
                  return <span className={m.chip}>{m.label}</span>;
                },
              },
              {
                key: "total",
                header: "Total",
                sortable: true,
                render: (order) => (
                  <div>
                    <div className="font-serif text-base text-ink">
                      {formatINR(toNumber(order.total))}
                    </div>
                    {toNumber(order.tax_amount) > 0 && (
                      <div className="text-[10px] text-muted">
                        incl. {formatINR(toNumber(order.tax_amount))} tax
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "items",
                header: "Items",
                sortable: false,
                render: (order) => (
                  <span className="chip chip-neutral">
                    {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                ),
              },
              {
                key: "created_at",
                header: "Order Date",
                sortable: true,
                render: (order) => (
                  <span className="text-muted text-sm">
                    {new Date(order.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
            ]}
            rows={orders}
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
            onRowClick={(order) => setSelectedOrder(order)}
            bulkActions={[
              {
                label: "Mark Completed",
                onClick: (ids) => {
                  ids.forEach((id) => updateMutation.mutate({ id: Number(id), payload: { status: "completed" } }));
                  toast.success(`Marked ${ids.length} order(s) as completed.`);
                },
              },
              {
                label: "Mark Cancelled",
                onClick: (ids) => {
                  ids.forEach((id) => updateMutation.mutate({ id: Number(id), payload: { status: "cancelled" } }));
                  toast.warning(`Cancelled ${ids.length} order(s).`);
                },
              },
              {
                label: "Delete",
                variant: "danger",
                onClick: (ids) => {
                  if (!confirm(`Delete ${ids.length} order(s)?`)) return;
                  ids.forEach((id) => deleteMutation.mutate(Number(id)));
                  toast.success(`Deleted ${ids.length} order(s).`);
                },
              },
            ]}
          />
        )}
      </div>

      {/* ── Order detail slide-over ── */}
      {selectedOrder && (
        <OrderDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {/* ── Create order modal ── */}
      {isModalOpen && (
        <>
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)} />
          <div className="modal-content animate-rise p-0 max-w-2xl w-full">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-bone shrink-0">
              <div>
                <div className="text-lg font-semibold text-ink">New Order</div>
                <div className="text-xs text-muted mt-0.5">Order number will be auto-generated.</div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col max-h-[80vh]">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Status + Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <span className="label">Status</span>
                    <div className="relative">
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="input appearance-none pr-8 cursor-pointer"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_META[s].label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  </label>
                </div>

                <label>
                  <span className="label">Notes (optional)</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    placeholder="Shipping instructions, special handling..."
                    className="input resize-none"
                  />
                </label>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="label mb-0">Line Items</span>
                    <button
                      type="button"
                      onClick={addItem}
                      className="btn btn-ghost text-xs gap-1 text-brand"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add item
                    </button>
                  </div>

                  <div className="border border-line rounded-lg overflow-hidden">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_64px_96px_80px_32px] gap-2 px-3 py-2 bg-bone-2 border-b border-line text-[10px] uppercase tracking-widest text-muted font-semibold">
                      <span>Item / Description</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Rate</span>
                      <span className="text-right">Tax %</span>
                      <span />
                    </div>

                    <div className="divide-y divide-line">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-[1fr_64px_96px_80px_32px] gap-2 px-3 py-3 items-start hover:bg-bone-2/30 transition-colors"
                        >
                          {/* Name + desc */}
                          <div className="space-y-1">
                            <input
                              required
                              value={item.name}
                              onChange={(e) => updateItem(idx, "name", e.target.value)}
                              className="input text-sm py-1.5"
                              placeholder="Item name"
                            />
                            <input
                              value={item.description}
                              onChange={(e) => updateItem(idx, "description", e.target.value)}
                              className="input text-xs py-1 text-muted"
                              placeholder="Description (optional)"
                            />
                          </div>
                          {/* Qty */}
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                            className="input text-sm py-1.5 text-right"
                          />
                          {/* Rate */}
                          <div className="relative">
                            <IndianRupee className="w-3 h-3 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(idx, "unit_price", e.target.value)}
                              className="input text-sm py-1.5 pl-6 text-right"
                              placeholder="0"
                            />
                          </div>
                          {/* Tax % */}
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(idx, "tax_rate", e.target.value)}
                            className="input text-sm py-1.5 text-right"
                          />
                          {/* Remove */}
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length === 1}
                            className="mt-2 text-muted hover:text-red-500 disabled:opacity-20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-line bg-bone divide-y divide-line">
                      <div className="flex justify-between px-3 py-2 text-xs text-muted">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatINR(grandSubtotal)}</span>
                      </div>
                      <div className="flex justify-between px-3 py-2 text-xs text-muted">
                        <span>Tax</span>
                        <span className="font-mono">{formatINR(grandTax)}</span>
                      </div>
                      <div className="flex justify-between px-3 py-3 text-sm font-semibold text-ink bg-bone-2">
                        <span>Grand Total</span>
                        <span className="font-serif text-base">{formatINR(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-line bg-bone flex items-center justify-end gap-3 shrink-0">
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
                    <><Package className="w-4 h-4" /> Create Order</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </PageShell>
  );
}

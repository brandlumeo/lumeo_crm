"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Package,
  IndianRupee,
  Plus,
  Search,
  X,
  Loader2,
  Trash2,
  Tag,
  CheckCircle2,
  Archive,
  BarChart2
} from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { createProduct } from "@/lib/api";
import { useProductPage, useUpdateProduct, useDeleteProduct } from "@/lib/queries";
import type { ProductInput, Product } from "@/lib/types";
import { formatINR, toNumber } from "@/lib/utils";

const PAGE_SIZE = 20;

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

// ── Product detail slide-over ────────────────────────────────────────────────

function ProductDrawer({
  product,
  onClose,
  onUpdateStatus,
  onDelete,
}: {
  product: Product;
  onClose: () => void;
  onUpdateStatus: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] bg-paper border-l border-line shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-bone shrink-0">
          <div>
            <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2">
              Catalog Item
              {product.is_active ? (
                <span className="chip chip-positive text-[10px] py-0 px-1.5">Active</span>
              ) : (
                <span className="chip chip-neutral text-[10px] py-0 px-1.5">Draft</span>
              )}
            </div>
            <div className="text-xl font-semibold text-ink truncate max-w-[300px]">{product.name}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Price Block */}
          <div className="surface-muted p-5 rounded-xl flex items-center gap-5">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-line shrink-0 text-ink">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-0.5 font-semibold">Unit Price</div>
              <div className="text-2xl font-serif text-ink">{formatINR(toNumber(product.price))}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="surface-muted p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1 font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> SKU
              </div>
              <div className="text-sm font-mono text-ink bg-white border border-line px-2 py-1 rounded w-fit mt-2">
                {product.sku || "—"}
              </div>
            </div>
            <div className="surface-muted p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1 font-semibold flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Tax Rate
              </div>
              <div className="text-lg font-medium text-ink mt-1">
                {toNumber(product.tax_rate)}%
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2 font-semibold">Description</div>
            <div className="surface-muted p-4 rounded-lg text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">
              {product.description || <span className="italic text-muted">No description provided.</span>}
            </div>
          </div>
          
          {/* Dates */}
          <div className="flex flex-col gap-2 pt-4 border-t border-line">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Created</span>
              <span className="font-medium text-ink">
                {new Date(product.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Last Modified</span>
              <span className="font-medium text-ink">
                {new Date(product.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-bone shrink-0 flex justify-between items-center">
          <button
            onClick={() => {
              if (confirm(`Delete product "${product.name}"?`)) {
                onDelete(product.id);
                onClose();
              }
            }}
            className="btn btn-ghost text-red-500 hover:bg-red-50 hover:border-red-200 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateStatus(product.id, !product.is_active)}
              className="btn btn-secondary text-sm"
            >
              Mark {product.is_active ? "Draft" : "Active"}
            </button>
            <button onClick={onClose} className="btn btn-primary text-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState<ProductInput>({
    name: "",
    sku: "",
    price: "",
    tax_rate: "0",
    description: "",
  });

  useEffect(() => { setMounted(true); }, []);

  const { data, isPending } = useProductPage({
    page,
    search: search || undefined,
    ordering: "-created_at",
  });

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      setForm({ name: "", sku: "", price: "", tax_rate: "0", description: "" });
      setIsModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["crm", "products"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
      toast.success("Product added to catalog.");
    },
    onError: () => toast.error("Failed to add product."),
  });

  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();

  const products: Product[] = data?.results ?? [];
  const total = data?.count ?? 0;

  // Stats computed from all data
  const { data: allData } = useProductPage({ page: 1, limit: 1000 });
  const allProducts: Product[] = allData?.results ?? [];

  const stats = useMemo(() => {
    return {
      total: allData?.count ?? 0,
      active: allProducts.filter((p) => p.is_active).length,
      draft: allProducts.filter((p) => !p.is_active).length,
    };
  }, [allProducts, allData]);

  // Handlers
  const handleUpdateStatus = (id: number, isActive: boolean) => {
    updateMut.mutate(
      { id, payload: { is_active: isActive } },
      {
        onSuccess: () => {
          if (selectedProduct?.id === id) {
            setSelectedProduct({ ...selectedProduct, is_active: isActive });
          }
          toast.success(`Product marked as ${isActive ? "Active" : "Draft"}.`);
        },
        onError: () => toast.error("Failed to update product status."),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success("Product deleted."),
      onError: () => toast.error("Could not delete product."),
    });
  };

  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };

  return (
    <PageShell
      eyebrow="Sales Operations"
      title="Product Catalog"
      description="Manage your services, subscriptions, and physical products. Used for quoting and invoicing."
    >
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats.total}
          sub="items in catalog"
          color="bg-slate-100 text-slate-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={stats.active}
          sub="available for sale"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Archive}
          label="Drafts"
          value={stats.draft}
          sub="not visible to sales"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Main card ── */}
      <div className="card animate-rise">
        {/* Card header */}
        <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="card-title">
            Products
            <span className="card-title-meta">{total} total items</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto ml-auto">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-9 sm:w-[260px]"
                placeholder="Search products by name or SKU..."
              />
            </div>
            {/* Clear filters */}
            {search && (
              <button onClick={clearFilters} className="btn btn-ghost text-muted text-xs gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            {/* Add new */}
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary gap-2 text-sm ml-2">
              <Plus className="w-4 h-4" /> New Product
            </button>
          </div>
        </div>

        {/* Table */}
        {!mounted || (isPending && !data) ? (
          <SkeletonTable columns={4} rows={8} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search ? "No products match your search" : "Your catalog is empty"}
            description={
              search
                ? "Try adjusting your search query."
                : "Add your first product to start quoting and invoicing."
            }
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Item & SKU",
                sortable: false,
                render: (product) => (
                  <div>
                    <div className="font-semibold text-ink group-hover:text-brand transition-colors">
                      {product.name}
                    </div>
                    {product.sku && (
                      <div className="text-[11px] text-muted font-mono uppercase mt-0.5">
                        {product.sku}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "price",
                header: "Price",
                sortable: false,
                render: (product) => (
                  <span className="font-serif text-[16px] text-ink">
                    {formatINR(toNumber(product.price))}
                  </span>
                ),
              },
              {
                key: "tax_rate",
                header: "Tax Rate",
                sortable: false,
                render: (product) => (
                  <span className="text-muted">{toNumber(product.tax_rate)}%</span>
                ),
              },
              {
                key: "is_active",
                header: "Status",
                sortable: false,
                render: (product) => (
                  <span className={product.is_active ? "chip chip-positive text-[10px]" : "chip chip-neutral text-[10px]"}>
                    {product.is_active ? "Active" : "Draft"}
                  </span>
                ),
              },
            ]}
            rows={products}
            count={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onRowClick={(product) => setSelectedProduct(product)}
            bulkActions={[
              {
                label: "Mark Active",
                onClick: (ids) => {
                  ids.forEach((id) => updateMut.mutate({ id: parseInt(id), payload: { is_active: true } }));
                  toast.success(`Marked ${ids.length} product(s) as Active.`);
                },
              },
              {
                label: "Mark Draft",
                onClick: (ids) => {
                  ids.forEach((id) => updateMut.mutate({ id: parseInt(id), payload: { is_active: false } }));
                  toast.success(`Marked ${ids.length} product(s) as Draft.`);
                },
              },
              {
                label: "Delete",
                variant: "danger",
                onClick: (ids) => {
                  if (!confirm(`Delete ${ids.length} product(s)?`)) return;
                  ids.forEach((id) => deleteMut.mutate(parseInt(id)));
                  toast.success(`Deleted ${ids.length} product(s).`);
                },
              },
            ]}
          />
        )}
      </div>

      {/* ── Product detail slide-over ── */}
      {selectedProduct && (
        <ProductDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
        />
      )}

      {/* ── Create product modal ── */}
      {isModalOpen && (
        <>
          <div className="modal-backdrop" onClick={() => setIsModalOpen(false)} />
          <div className="fixed left-[50%] top-[50%] z-[60] translate-x-[-50%] translate-y-[-50%] w-full max-w-lg bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/10 flex flex-col overflow-hidden animate-rise">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-bone shrink-0">
              <div>
                <div className="text-base font-semibold text-ink">New Catalog Item</div>
                <div className="text-xs text-muted mt-0.5">Add a service, subscription, or physical product.</div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="flex flex-col min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(90vh - 160px)" }}>

                {/* Product Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="label">Product Name *</label>
                  <input
                    required
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Consulting Hour"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="label">Description <span className="text-muted font-normal">(optional)</span></label>
                  <textarea
                    rows={2}
                    className="input resize-none"
                    value={form.description || ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Details shown on quotes and invoices..."
                  />
                </div>

                {/* Price + Tax Rate - side by side */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Price *</label>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        className="input pl-9"
                        value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Tax Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      className="input"
                      value={form.tax_rate}
                      onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                      placeholder="18"
                    />
                  </div>
                </div>

                {/* SKU */}
                <div className="flex flex-col gap-1.5">
                  <label className="label">SKU <span className="text-muted font-normal">(optional)</span></label>
                  <input
                    className="input font-mono uppercase text-[12px]"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="SVC-001"
                  />
                </div>

              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-line bg-bone flex items-center justify-between shrink-0">
                <div>
                  {createMut.isError && (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                      Could not create product. Please try again.
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMut.isPending}
                    className="btn btn-primary text-sm gap-2"
                  >
                    {createMut.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Package className="w-4 h-4" /> Add to Catalog</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </PageShell>
  );
}

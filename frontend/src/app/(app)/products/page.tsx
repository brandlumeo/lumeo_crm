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
  BarChart2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { createProduct } from "@/lib/api";
import { useProductPage, useUpdateProduct, useDeleteProduct } from "@/lib/queries";
import type { ProductInput, Product } from "@/lib/types";
import { formatINR, toNumber, cn } from "@/lib/utils";

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
    <div className="bg-paper border border-line rounded-2xl shadow-sm p-5 flex items-center gap-4 animate-rise">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.12em] font-semibold text-muted mb-0.5">{label}</div>
        <div className="text-2xl font-semibold text-ink leading-none">{value}</div>
        {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
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
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] bg-paper border-l border-line shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-bone shrink-0">
          <div>
            <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1.5 flex items-center gap-2">
              Catalog Item
              {product.is_active ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] py-0 px-1.5 font-medium">Active</span>
              ) : (
                <span className="bg-slate-100 text-slate-800 border border-slate-200 rounded text-[10px] py-0 px-1.5 font-medium">Draft</span>
              )}
            </div>
            <div className="text-xl font-semibold text-ink truncate max-w-[300px]">{product.name}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-bone-2 transition-colors border border-transparent hover:border-line"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Price Block */}
          <div className="bg-bone-2 p-5 rounded-xl flex items-center gap-5 border border-line/50">
            <div className="w-12 h-12 bg-paper rounded-full flex items-center justify-center shadow-sm border border-line shrink-0 text-ink">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted mb-0.5 font-semibold">Unit Price</div>
              <div className="text-2xl font-serif text-ink">{formatINR(toNumber(product.price))}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-bone-2 p-4 rounded-xl border border-line/50">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted mb-1 font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> SKU
              </div>
              <div className="text-sm font-mono text-ink bg-paper border border-line px-2 py-1 rounded-md w-fit mt-2 shadow-sm">
                {product.sku || "—"}
              </div>
            </div>
            <div className="bg-bone-2 p-4 rounded-xl border border-line/50">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted mb-1 font-semibold flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" /> Tax Rate
              </div>
              <div className="text-lg font-medium text-ink mt-1">
                {toNumber(product.tax_rate)}%
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted mb-2 font-semibold">Description</div>
            <div className="bg-bone p-4 rounded-xl text-sm text-ink-2 leading-relaxed whitespace-pre-wrap border border-line/50 min-h-[100px]">
              {product.description || <span className="italic text-muted">No description provided.</span>}
            </div>
          </div>
          
          {/* Dates */}
          <div className="flex flex-col gap-3 pt-6 border-t border-line">
            <div className="flex items-center justify-between text-xs bg-bone-2 px-3 py-2 rounded-lg">
              <span className="text-muted font-medium">Created</span>
              <span className="font-mono text-ink">
                {new Date(product.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs bg-bone-2 px-3 py-2 rounded-lg">
              <span className="text-muted font-medium">Last Modified</span>
              <span className="font-mono text-ink">
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
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateStatus(product.id, !product.is_active)}
              className="px-4 py-2 text-sm font-medium text-ink bg-paper border border-line hover:bg-bone-2 rounded-lg transition-colors shadow-sm"
            >
              Mark {product.is_active ? "Draft" : "Active"}
            </button>
            <button onClick={onClose} className="px-5 py-2 text-sm font-medium text-paper bg-ink hover:opacity-90 rounded-lg transition-opacity shadow-sm">
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
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
  const totalPages = Math.ceil(total / PAGE_SIZE);

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

  // Bulk action handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(products.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkStatus = (isActive: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    ids.forEach((id) => updateMut.mutate({ id, payload: { is_active: isActive } }));
    toast.success(`Marked ${ids.length} product(s) as ${isActive ? 'Active' : 'Draft'}.`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    
    if (!confirm(`Delete ${ids.length} product(s)? This action cannot be undone.`)) return;
    
    ids.forEach((id) => deleteMut.mutate(id));
    toast.success(`Deleted ${ids.length} product(s).`);
    setSelectedIds(new Set());
  };

  return (
    <PageShell
      eyebrow="Sales Operations"
      title="Product Catalog"
      description="Manage your services, subscriptions, and physical products. Used for quoting and invoicing."
    >
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats.total}
          sub="items in catalog"
          color="bg-slate-100 text-slate-600 border border-slate-200"
        />
        <StatCard
          icon={CheckCircle2}
          label="Active"
          value={stats.active}
          sub="available for sale"
          color="bg-emerald-100 text-emerald-700 border border-emerald-200"
        />
        <StatCard
          icon={Archive}
          label="Drafts"
          value={stats.draft}
          sub="not visible to sales"
          color="bg-amber-100 text-amber-700 border border-amber-200"
        />
      </div>

      {/* ── Main card ── */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm animate-rise flex flex-col">
        {/* Card header */}
        <div className="p-5 border-b border-line flex flex-col sm:flex-row sm:items-center sm:justify-between bg-bone-2 gap-4">
          <div>
            <div className="text-lg font-semibold text-ink flex items-center gap-2">
              Products
              <span className="text-xs font-medium bg-bone border border-line px-2 py-0.5 rounded-full text-muted">
                {total}
              </span>
            </div>
            
            {/* Bulk actions toolbar (visible when items selected) */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mt-3 animate-fade-in">
                <span className="text-sm font-medium text-ink mr-2">{selectedIds.size} selected</span>
                <button 
                  onClick={() => handleBulkStatus(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-paper border border-line rounded-md shadow-sm hover:bg-bone transition-colors"
                >
                  Mark Active
                </button>
                <button 
                  onClick={() => handleBulkStatus(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-paper border border-line rounded-md shadow-sm hover:bg-bone transition-colors"
                >
                  Mark Draft
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-md shadow-sm hover:bg-red-100 transition-colors ml-1"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full sm:w-[260px] pl-9 pr-3 py-2 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors shadow-sm"
                placeholder="Search products or SKU..."
              />
              {search && (
                <button onClick={clearFilters} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {/* Add new */}
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
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
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bone-2 border-b border-line text-xs uppercase tracking-[0.12em] text-muted font-medium">
                <tr>
                  <th className="px-6 py-4 w-[50px]">
                    <input 
                      type="checkbox" 
                      className="rounded border-line text-ink focus:ring-ink bg-paper cursor-pointer"
                      checked={products.length > 0 && selectedIds.size === products.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">Item & SKU</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Tax Rate</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => (
                  <tr 
                    key={product.id} 
                    className={cn(
                      "group transition-colors cursor-pointer",
                      selectedIds.has(product.id) ? "bg-bone-2/80" : "hover:bg-bone-2/50"
                    )}
                    onClick={(e) => {
                      // Don't trigger row click if clicking checkbox
                      if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                      setSelectedProduct(product);
                    }}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-line text-ink focus:ring-ink bg-paper cursor-pointer"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleSelectOne(product.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-ink group-hover:text-ink/80 transition-colors">
                          {product.name}
                        </div>
                        {product.sku && (
                          <div className="text-[11px] text-muted font-mono uppercase mt-0.5 tracking-wider bg-bone px-1.5 py-0.5 rounded inline-block border border-line/50">
                            {product.sku}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-serif text-[16px] text-ink">
                        {formatINR(toNumber(product.price))}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-muted font-medium">{toNumber(product.tax_rate)}%</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 text-[11px] font-medium rounded-full border",
                        product.is_active 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      )}>
                        {product.is_active ? "Active" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-line bg-bone-2 flex items-center justify-between">
            <div className="text-sm text-muted">
              Showing <span className="font-medium text-ink">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium text-ink">{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-medium text-ink">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-line rounded-lg bg-paper text-ink disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bone transition-colors shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-line rounded-lg bg-paper text-ink disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bone transition-colors shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
          <form 
            onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} 
            className="relative w-full max-w-lg bg-paper border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-rise"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-bone shrink-0">
              <div>
                <div className="text-lg font-semibold text-ink">New Catalog Item</div>
                <div className="text-sm text-muted mt-1">Add a service, subscription, or physical product.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-muted hover:text-ink hover:bg-bone-2 transition-colors border border-transparent hover:border-line"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-paper">
              {/* Product Name */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-ink">Product Name *</label>
                <input
                  required
                  className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Consulting Hour"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-ink flex items-center gap-2">
                  Description <span className="text-[11px] font-normal text-muted uppercase tracking-wider bg-bone px-1.5 rounded">Optional</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors resize-none"
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Details shown on quotes and invoices..."
                />
              </div>

              {/* Price + Tax Rate - side by side */}
              <div className="grid grid-cols-2 gap-4 bg-bone-2 p-4 rounded-xl border border-line/50">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-ink">Price *</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors font-mono"
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="5000"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-ink">Tax Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    className="w-full px-3 py-2 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors font-mono"
                    value={form.tax_rate}
                    onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                    placeholder="18"
                  />
                </div>
              </div>

              {/* SKU */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-ink flex items-center gap-2">
                  SKU <span className="text-[11px] font-normal text-muted uppercase tracking-wider bg-bone px-1.5 rounded">Optional</span>
                </label>
                <input
                  className="w-full px-3 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors font-mono uppercase"
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
                  <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md">
                    Could not create product. Please try again.
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 text-sm font-medium text-ink bg-paper border border-line hover:bg-bone-2 rounded-lg transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="px-5 py-2 text-sm font-medium text-paper bg-ink hover:opacity-90 rounded-lg transition-opacity flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
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
      )}
    </PageShell>
  );
}


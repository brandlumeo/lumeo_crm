"use client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck, Search, Building2, Phone, Mail, FileText, Globe, Landmark, MapPin } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";
import { VendorDetailsSlideover } from "@/components/vendor-details-slideover";
import { createVendor, updateVendor, deleteVendor } from "@/lib/api";
import { useVendorPage } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState<any>({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    tax_id: "",
    payment_terms: "",
    bank_details: "",
    custom_data: {},
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingVendor, setViewingVendor] = useState<any>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useVendorPage({
    page,
    search,
    ordering: sortDirection === "desc" ? `-${sortColumn}` : sortColumn,
  });

  const mutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      toast.success("Vendor created successfully.");
      setForm({ name: "", contact_name: "", email: "", phone: "", website: "", address: "", tax_id: "", payment_terms: "", bank_details: "", custom_data: {} });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.error) {
        // Extract first field error
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          toast.error(`${firstKey}: ${data[firstKey][0]}`);
          return;
        }
      }
      toast.error(data?.error || "Failed to create vendor");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateVendor(editingId!, data),
    onSuccess: () => {
      toast.success("Vendor updated successfully.");
      setForm({ name: "", contact_name: "", email: "", phone: "", website: "", address: "", tax_id: "", payment_terms: "", bank_details: "", custom_data: {} });
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err: any) => {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.error) {
        // Extract first field error
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          toast.error(`${firstKey}: ${data[firstKey][0]}`);
          return;
        }
      }
      toast.error(data?.error || "Failed to update vendor");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteVendor(Number(id))));
    },
    onSuccess: () => {
      toast.success("Vendors deleted successfully.");
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete vendors");
    },
  });

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Finance"
      title="Vendors & Suppliers"
      description="Manage the companies and contractors who supply you with goods or services."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_380px] gap-6 xl:gap-8">
        <div className="bg-paper border border-line rounded-2xl shadow-sm animate-rise overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-line flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between bg-bone/30">
            <div>
              <h2 className="font-serif text-[20px] text-ink flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted" />
                Vendor List
              </h2>
              <p className="text-xs text-muted mt-1 font-medium tracking-wide uppercase">{data?.count ?? 0} total vendors</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[260px] pl-9 pr-4 py-2 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors placeholder:text-muted/70 focus:bg-paper"
                placeholder="Search vendors..."
              />
            </div>
          </div>

          {!mounted || (isLoading && !data) ? (
            <SkeletonTable columns={4} rows={10} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No vendors found"
              description="Add your first supplier or contractor to start tracking your purchases."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Vendor",
                  sortable: true,
                  render: (vendor: any) => (
                    <div>
                      <div className="font-medium text-ink">{vendor.name}</div>
                      {vendor.contact_name && <div className="text-[12px] text-muted mt-0.5">Contact: {vendor.contact_name}</div>}
                      <div className="text-[12px] text-muted mt-0.5">{vendor.email || "No email"}</div>
                    </div>
                  ),
                },
                {
                  key: "phone",
                  header: "Phone",
                  sortable: true,
                  render: (vendor: any) => vendor.phone || "-",
                },
                {
                  key: "tax_id",
                  header: "Tax ID",
                  sortable: true,
                  render: (vendor: any) => vendor.tax_id || "-",
                },
                {
                  key: "created_at",
                  header: "Added",
                  sortable: true,
                  render: (vendor: any) => formatDateTime(vendor.created_at),
                },
              ]}
              rows={rows}
              count={data?.count ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSortChange={(col, dir) => {
                setSortColumn(col);
                setSortDirection(dir);
              }}
              bulkActions={[
                {
                  label: "Delete",
                  variant: "danger",
                  onClick: (ids) => deleteMutation.mutate(ids)
                }
              ]}
              onRowClick={(vendor) => {
                setViewingVendor(vendor);
              }}
            />
          )}
        </div>

        <div className="xl:col-start-2 xl:row-start-1">
          <div className="bg-paper border border-line rounded-2xl shadow-xl shadow-ink/5 animate-rise sticky top-6 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-line bg-bone flex items-center justify-between">
              <h3 className="font-serif text-[20px] text-ink">{editingId ? "Edit Vendor" : "New Vendor"}</h3>
              {editingId && (
                <button
                  type="button"
                  className="text-[13px] font-medium text-muted hover:text-ink transition-colors bg-bone-2 px-3 py-1.5 rounded-lg border border-line hover:bg-line"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: "", contact_name: "", email: "", phone: "", website: "", address: "", tax_id: "", payment_terms: "", bank_details: "", custom_data: {} });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
            <form
              className="p-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const payload = { ...form };
                if (payload.website && !payload.website.startsWith('http://') && !payload.website.startsWith('https://')) {
                  payload.website = `https://${payload.website}`;
                }
                if (editingId) {
                  updateMutation.mutate(payload);
                } else {
                  mutation.mutate(payload);
                }
              }}
            >
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1"><Building2 className="w-3.5 h-3.5 text-muted"/> Company Name *</label>
                <input
                  required
                  className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Apex Supplies"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1"><Mail className="w-3.5 h-3.5 text-muted"/> Email</label>
                  <input
                    type="email"
                    className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="sales@apex.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1"><Phone className="w-3.5 h-3.5 text-muted"/> Phone</label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="1-800-SUPPLY"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1">Contact Name</label>
                <input
                  className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all"
                  value={form.contact_name}
                  onChange={(event) => setForm({ ...form, contact_name: event.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1"><FileText className="w-3.5 h-3.5 text-muted"/> Tax / GST / VAT ID</label>
                <input
                  className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all"
                  value={form.tax_id}
                  onChange={(event) => setForm({ ...form, tax_id: event.target.value })}
                  placeholder="e.g. AB12345678"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1"><Globe className="w-3.5 h-3.5 text-muted"/> Website</label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all"
                    value={form.website}
                    onChange={(event) => setForm({ ...form, website: event.target.value })}
                    placeholder="https://apex.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1">Payment Terms</label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all"
                    value={form.payment_terms}
                    onChange={(event) => setForm({ ...form, payment_terms: event.target.value })}
                    placeholder="e.g. Net 30"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5 text-muted"/> Address</label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all min-h-[80px] resize-y"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder="Full physical address..."
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-ink flex items-center gap-1.5 mb-1"><Landmark className="w-3.5 h-3.5 text-muted"/> Bank Details</label>
                <textarea
                  className="w-full px-3.5 py-2.5 bg-bone border border-line rounded-lg text-sm outline-none focus:border-ink focus:bg-paper transition-all min-h-[80px] resize-y"
                  value={form.bank_details}
                  onChange={(event) => setForm({ ...form, bank_details: event.target.value })}
                  placeholder="Account Number, Routing, Wire Instructions..."
                />
              </div>

              <CustomFieldsFormInputs
                modelName="vendor"
                values={form.custom_data || {}}
                onChange={(custom_data) => setForm({ ...form, custom_data })}
              />

              <div className="pt-2">
                <button 
                  disabled={mutation.isPending || updateMutation.isPending} 
                  className="w-full flex items-center justify-center h-11 bg-ink text-paper text-sm font-medium rounded-lg hover:bg-ink-2 shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {mutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update vendor" : "Add vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <VendorDetailsSlideover 
        vendor={viewingVendor} 
        open={!!viewingVendor} 
        onOpenChange={(open) => {
          if (!open) setViewingVendor(null);
        }} 
        onEdit={(vendor) => {
          setViewingVendor(null);
          setEditingId(vendor.id);
          setForm({
            name: vendor.name || "",
            contact_name: vendor.contact_name || "",
            email: vendor.email || "",
            phone: vendor.phone || "",
            website: vendor.website || "",
            address: vendor.address || "",
            tax_id: vendor.tax_id || "",
            payment_terms: vendor.payment_terms || "",
            bank_details: vendor.bank_details || "",
            custom_data: vendor.custom_data || {},
          });
        }}
      />
    </PageShell>
  );
}

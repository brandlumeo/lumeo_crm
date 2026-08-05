"use client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Truck } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";
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
    email: "",
    phone: "",
    address: "",
    tax_id: "",
    custom_data: {},
  });
  const [editingId, setEditingId] = useState<number | null>(null);

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
      setForm({ name: "", email: "", phone: "", address: "", tax_id: "", custom_data: {} });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create vendor");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateVendor(editingId!, data),
    onSuccess: () => {
      toast.success("Vendor updated successfully.");
      setForm({ name: "", email: "", phone: "", address: "", tax_id: "", custom_data: {} });
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update vendor");
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
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_360px] gap-6">
        <div className="card animate-rise">
          <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="card-title">
              Vendor List
              <span className="card-title-meta">{data?.count ?? 0} total vendors</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="input sm:w-[220px]"
                placeholder="Search vendors"
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
                      <div className="text-[12px] text-muted mt-0.5">{vendor.email || "No email"}</div>
                    </div>
                  ),
                },
                {
                  key: "phone",
                  header: "Phone",
                  sortable: true,
                  render: (vendor) => vendor.phone || "-",
                },
                {
                  key: "tax_id",
                  header: "Tax ID",
                  sortable: true,
                  render: (vendor) => vendor.tax_id || "-",
                },
                {
                  key: "created_at",
                  header: "Added",
                  sortable: true,
                  render: (vendor) => formatDateTime(vendor.created_at),
                },
              ]}
              data={rows}
              totalCount={data?.count ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={(col, dir) => {
                setSortColumn(col);
                setSortDirection(dir);
              }}
              onDelete={(ids) => deleteMutation.mutate(ids)}
              rowAction={(vendor) => {
                setEditingId(vendor.id);
                setForm({
                  name: vendor.name || "",
                  email: vendor.email || "",
                  phone: vendor.phone || "",
                  address: vendor.address || "",
                  tax_id: vendor.tax_id || "",
                  custom_data: vendor.custom_data || {},
                });
              }}
            />
          )}
        </div>

        <div className="xl:col-start-2 xl:row-start-1">
          <div className="card animate-rise sticky top-6">
            <div className="card-head">
              <div className="card-title">{editingId ? "Edit vendor" : "New vendor"}</div>
              {editingId && (
                <button
                  className="text-xs text-muted hover:text-ink underline"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: "", email: "", phone: "", address: "", tax_id: "", custom_data: {} });
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
                if (editingId) {
                  updateMutation.mutate(form);
                } else {
                  mutation.mutate(form);
                }
              }}
            >
              <label>
                <span className="label">Company Name *</span>
                <input
                  required
                  className="input"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Apex Supplies"
                />
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className="label">Email</span>
                  <input
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="sales@apex.com"
                  />
                </label>
                <label>
                  <span className="label">Phone</span>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="1-800-SUPPLY"
                  />
                </label>
              </div>

              <label>
                <span className="label">Tax / GST / VAT ID</span>
                <input
                  className="input"
                  value={form.tax_id}
                  onChange={(event) => setForm({ ...form, tax_id: event.target.value })}
                  placeholder="AB12345678"
                />
              </label>
              
              <label>
                <span className="label">Address</span>
                <textarea
                  className="input min-h-[80px]"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder="123 Main St..."
                />
              </label>

              <CustomFieldsFormInputs
                modelName="vendor"
                value={form.custom_data || {}}
                onChange={(custom_data) => setForm({ ...form, custom_data })}
              />

              <button disabled={mutation.isPending || updateMutation.isPending} className="btn btn-primary w-full">
                {mutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update vendor" : "Add vendor"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

"use client";
import { toast } from "sonner";


import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Phone, UserCircle2 } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";
import { createCustomer, inviteCustomerToPortal, deleteCustomer } from "@/lib/api";
import { useCustomerPage, useResetCustomerPassword } from "@/lib/queries";
import type { CustomerInput } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [form, setForm] = useState<CustomerInput>({
    name: "",
    email: "",
    phone: "",
    custom_data: {},
  });

  const [mounted, setMounted] = useState(false);
  const [credentials, setCredentials] = useState<{email: string; password: string} | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useCustomerPage({
    page,
    search,
    email: emailFilter || undefined,
    ordering: sortDirection === "desc" ? `-${sortColumn}` : sortColumn,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      setForm({ name: "", email: "", phone: "", custom_data: {} });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-bundle"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: inviteCustomerToPortal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "customers"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteCustomer(id)));
    },
    onSuccess: () => {
      toast.success("Customers deleted successfully.");
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete customers");
    },
  });

  const resetPasswordMutation = useResetCustomerPassword();

  const handleInvite = (id: any) => {
    inviteMutation.mutate(id, {
      onSuccess: (data: any) => {
        setCredentials(data.credentials);
        toast.success("Portal access created!");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to create portal user");
      },
    });
  };

  const handleResetPassword = (id: any) => {
    resetPasswordMutation.mutate(id, {
      onSuccess: (data: any) => {
        setCredentials(data.credentials);
        toast.success("Password reset successfully!");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to reset password");
      },
    });
  };

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Customers"
      title="Your whole book."
      description="Closed business and live customer relationships belong here. Search by name or email, then add new accounts as they convert."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_360px] gap-6">
        <div className="card animate-rise">
          <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="card-title">
              Customer list
              <span className="card-title-meta">{data?.count ?? 0} total customers</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="input sm:w-[220px]"
                placeholder="Search customers"
              />
              <input
                value={emailFilter}
                onChange={(event) => {
                  setEmailFilter(event.target.value);
                  setPage(1);
                }}
                className="input sm:w-[220px]"
                placeholder="Exact email filter"
              />
            </div>
          </div>

          {!mounted || (isLoading && !data) ? (
            <SkeletonTable columns={4} rows={10} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={UserCircle2}
              title="No customers found"
              description="Converted accounts will show up here once you add them or loosen the current filter."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Customer",
                  sortable: true,
                  render: (customer) => (
                    <div>
                      <div className="font-medium text-ink">{customer.name}</div>
                      <div className="text-[12px] text-muted">{customer.email}</div>
                    </div>
                  ),
                },
                {
                  key: "phone",
                  header: "Phone",
                  sortable: true,
                  render: (customer) => customer.phone,
                },
                {
                  key: "created_at",
                  header: "Created",
                  sortable: true,
                  render: (customer) => formatDateTime(customer.created_at),
                },
                {
                  key: "portal_access",
                  header: "Client Portal",
                  sortable: false,
                  render: (customer) => {
                    if (customer.has_portal_access) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="chip chip-positive">Active User</span>
                          <button
                            onClick={() => handleResetPassword(customer.id)}
                            className="text-[10px] uppercase font-bold text-muted hover:text-ink transition-colors tracking-wider"
                            title="Reset Portal Password"
                            disabled={resetPasswordMutation.isPending}
                          >
                            Reset Pass
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => handleInvite(customer.id)}
                        className="btn btn-secondary text-xs py-1 px-2"
                        disabled={inviteMutation.isPending}
                      >
                        Invite
                      </button>
                    );
                  },
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
                  label: "Send Campaign",
                  onClick: (ids) => toast.success(`Drafting email to ${ids.length} customers...`),
                },
                {
                  label: "Assign Rep",
                  onClick: (ids) => toast.info(`Assigning ${ids.length} customers...`),
                },
                {
                  label: "Delete",
                  variant: "danger",
                  onClick: (ids) => deleteMutation.mutate(ids),
                },
              ]}
            />
          )}
        </div>

        <div className="card animate-rise">
          <div className="card-head">
            <div className="card-title">
              New customer
              <span className="card-title-meta">Organization account</span>
            </div>
          </div>
          <form
            className="p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(form);
            }}
          >
            <label>
              <span className="label">Customer name</span>
              <input
                required
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Northwind Trading"
              />
            </label>
            <label>
              <span className="label">Email</span>
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="ops@northwind.example"
              />
            </label>
            <label>
              <span className="label">Phone</span>
              <input
                required
                className="input"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+91 98765 43210"
              />
            </label>

            <CustomFieldsFormInputs
              modelName="customer"
              values={form.custom_data || {}}
              onChange={(custom_data) => setForm((current) => ({ ...current, custom_data }))}
            />

            {mutation.isError ? (
              <div className="chip chip-warning justify-center">
                Could not create customer. Check the data and try again.
              </div>
            ) : null}

            <button type="submit" disabled={mutation.isPending} className="btn btn-primary w-full justify-center">
              {mutation.isPending ? "Creating..." : "Create customer"}
            </button>

            <div className="surface-muted p-4 text-[12px] text-muted flex items-start gap-2">
              <Phone className="w-4 h-4 mt-0.5 text-ink-2" />
              Customer records represent active accounts. Connect them to leads and deals to capture the end-to-end customer journey.
            </div>
          </form>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className="relative w-full max-w-xl bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/10 flex flex-col overflow-hidden animate-rise" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="p-6 border-b border-line flex items-center justify-between shrink-0">
              <h3 className="font-serif text-[18px] text-ink flex items-center gap-2">
                <Upload className="w-5 h-5 text-accent" />
                Import Customers
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-bone-2 rounded-md border border-transparent hover:border-line text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImport} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="bg-bone-2 border border-line rounded-lg p-4 space-y-3">
                  <p className="text-sm text-ink-2">
                    Upload a CSV file to bulk import customers. Your CSV should have a header row and can contain the following columns:
                  </p>
                  <ul className="text-xs text-muted list-disc pl-4 space-y-1">
                    <li><strong>Name</strong> (Required)</li>
                    <li><strong>Email</strong> (Required)</li>
                    <li><strong>Phone</strong> (Optional)</li>
                    <li><strong>Company Name</strong> (Optional)</li>
                  </ul>
                  <a href="#" className="text-xs text-accent hover:underline flex items-center gap-1 inline-flex">
                    <Download className="w-3 h-3" /> Download template CSV
                  </a>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">CSV File *</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      required
                      className="hidden"
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-bone border-2 border-line border-dashed rounded-lg appearance-none cursor-pointer hover:border-accent hover:bg-bone-2 focus:outline-none"
                    >
                      <span className="flex items-center space-x-2">
                        <Upload className="w-6 h-6 text-muted" />
                        <span className="font-medium text-ink-2">
                          {importFile ? importFile.name : 'Click to drop a file or browse'}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-line bg-bone flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importMutation.isPending || !importFile}
                  className="btn btn-primary text-sm"
                >
                  {importMutation.isPending ? 'Importing...' : 'Start Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setCredentials(null)} />
          <div className="relative w-full max-w-md bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/10 flex flex-col overflow-hidden animate-rise" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-bone shrink-0">
              <div className="text-lg font-semibold text-ink">Portal Access Created</div>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <p className="text-sm text-muted">
                Share these credentials with the customer so they can log into the Client Portal.
              </p>
              <div className="p-4 bg-black text-white rounded border border-white/10 font-mono text-sm space-y-2">
                <div><strong>Email:</strong> {credentials.email}</div>
                <div><strong>Password:</strong> {credentials.password}</div>
              </div>
              <button
                onClick={() => setCredentials(null)}
                className="btn btn-primary w-full justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

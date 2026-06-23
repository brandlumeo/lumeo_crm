"use client";
import { toast } from "sonner";


import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Mail, Users, Download, Upload, X, Loader2 } from "lucide-react";

import { createLead, exportLeads } from "@/lib/api";
import { useCurrentUser, useLeadPage, useImportLeads, useCurrentCompany } from "@/lib/queries";
import type { LeadInput } from "@/lib/types";
import { formatDateTime, getDisplayName } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";

const PAGE_SIZE = 20;

const statusTone: Record<string, string> = {
  new: "chip chip-neutral",
  contacted: "chip chip-warning",
  qualified: "chip chip-positive",
  lost: "chip chip-neutral",
  won: "chip chip-positive",
};

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: company } = useCurrentCompany();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortColumn, setSortColumn] = useState("-updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [form, setForm] = useState<LeadInput>({
    name: "",
    email: "",
    status: company?.default_lead_status || "new",
    custom_data: {},
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (company?.default_lead_status) {
      setForm(f => ({ ...f, status: company.default_lead_status }));
    }
  }, [company]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const importMutation = useImportLeads();

  const handleExport = async () => {
    try {
      await exportLeads();
    } catch (err) {
      toast.error("Failed to export leads.");
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    importMutation.mutate(importFile, {
      onSuccess: (data: any) => {
        setShowImportModal(false);
        setImportFile(null);
        toast.success(`Successfully imported ${data.imported || 0} leads!`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || "Failed to import leads. Check CSV format.");
      }
    });
  };

  const { data, isLoading } = useLeadPage({
    page,
    search,
    status: status || undefined,
    ordering: sortDirection === "desc" ? (sortColumn.startsWith("-") ? sortColumn : `-${sortColumn}`) : sortColumn.replace("-", ""),
  });

  const mutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      setForm({ name: "", email: "", status: "new", custom_data: {} });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-bundle"] });
    },
  });

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Leads"
      title="Capture and qualify."
      description="Every inbound inquiry, manual prospect, and early-stage opportunity lands here first. Search, filter, and create leads without leaving the workspace."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_360px] gap-6">
        <div className="card animate-rise">
          <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="card-title">
              Lead list
              <span className="card-title-meta">{data?.count ?? 0} total leads</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="input sm:w-[220px]"
                placeholder="Search leads"
              />
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="select sm:w-[180px]"
              >
                <option value="">All statuses</option>
                {company?.lead_pipelines?.map((stage: any) => (
                  <option key={stage.id} value={stage.name.toLowerCase()}>
                    {stage.name}
                  </option>
                )) || (
                  <>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </>
                )}
              </select>
              <div className="h-6 w-px bg-line mx-1 hidden sm:block"></div>
              <button 
                onClick={() => setShowImportModal(true)} 
                className="btn bg-bone hover:bg-bone-2 text-ink border border-line p-2"
                title="Import CSV"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button 
                onClick={handleExport}
                className="btn bg-bone hover:bg-bone-2 text-ink border border-line p-2"
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!mounted || (isLoading && !data) ? (
            <SkeletonTable columns={4} rows={10} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No leads found"
              description="Create your first lead on the right, or widen the current search and status filters."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Lead",
                  sortable: true,
                  render: (lead) => (
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-medium text-ink hover:text-accent transition-colors hover:underline">
                        {lead.name}
                      </Link>
                      <div className="text-[12px] text-muted mt-0.5">{lead.email}</div>
                    </div>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  sortable: true,
                  render: (lead) => (
                    <span className={statusTone[lead.status] ?? "chip chip-neutral"}>
                      {lead.status.replaceAll("_", " ")}
                    </span>
                  ),
                },
                {
                  key: "owner",
                  header: "Owner",
                  render: (lead) => getDisplayName(lead.assigned_to),
                },
                {
                  key: "score",
                  header: "Predictive Score",
                  sortable: true,
                  render: (lead) => {
                    if (lead.score == null) return <span className="text-xs text-muted">Unscored</span>;
                    let color = "text-muted";
                    if (lead.score >= 80) color = "text-emerald-600 font-semibold";
                    else if (lead.score >= 50) color = "text-amber-600 font-semibold";
                    else color = "text-red-500 font-medium";
                    
                    return (
                      <div className="flex items-center gap-1.5" title={lead.score_rationale || ""}>
                        <span className={`text-sm ${color}`}>{lead.score}</span>
                        <span className="text-[10px] text-muted">/100</span>
                      </div>
                    );
                  },
                },
                {
                  key: "updated_at",
                  header: "Updated",
                  sortable: true,
                  render: (lead) => formatDateTime(lead.updated_at),
                },
              ]}
              rows={rows}
              count={data?.count ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              sortColumn={sortColumn.replace("-", "")}
              sortDirection={sortDirection}
              onSortChange={(col, dir) => {
                setSortColumn(col);
                setSortDirection(dir);
              }}
              bulkActions={[
                {
                  label: "Send Campaign",
                  onClick: (ids) => toast.success(`Drafting email to ${ids.length} leads...`),
                },
                {
                  label: "Change Status",
                  onClick: (ids) => toast.info(`Bulk updating status for ${ids.length} leads...`),
                },
                {
                  label: "Delete",
                  variant: "danger",
                  onClick: (ids) => toast.error(`Deleted ${ids.length} leads.`),
                },
              ]}
            />
          )}
        </div>

        <div className="card animate-rise" id="new-lead">
          <div className="card-head">
            <div className="card-title">
              New lead
              <span className="card-title-meta">Assigns to you by default</span>
            </div>
          </div>
          <form
            className="p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate({
                ...form,
                assigned_to_id: me?.id,
              });
            }}
          >
            <label>
              <span className="label">Lead name</span>
              <input
                required
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Apex Logistics"
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
                placeholder="buyer@apexlogistics.com"
              />
            </label>
            <label>
              <span className="label">Status</span>
              <select
                className="select"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                {company?.lead_pipelines?.map((stage: any) => (
                  <option key={stage.id} value={stage.name.toLowerCase()}>
                    {stage.name}
                  </option>
                )) || (
                  <>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                  </>
                )}
              </select>
            </label>

            <CustomFieldsFormInputs
              modelName="lead"
              values={form.custom_data || {}}
              onChange={(custom_data) => setForm((current) => ({ ...current, custom_data }))}
            />

            {mutation.isError ? (
              <div className="chip chip-warning justify-center">
                Could not create lead. Check the data and try again.
              </div>
            ) : null}

            <button type="submit" disabled={mutation.isPending} className="btn btn-primary w-full justify-center">
              {mutation.isPending ? "Creating..." : "Create lead"}
            </button>

            <div className="surface-muted p-4 text-[12px] text-muted flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 text-ink-2" />
              Leads stay strictly partitioned to your secure, dedicated workspace database.
            </div>
          </form>
        </div>
      </div>

      {showImportModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowImportModal(false)} />
          <div className="modal-content animate-rise">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <h3 className="font-serif text-[18px] text-ink flex items-center gap-2">
                <Upload className="w-5 h-5 text-accent" />
                Import Leads
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1.5 hover:bg-bone-2 rounded-md border border-transparent hover:border-line text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImport} className="p-6 space-y-4">
              <div className="bg-bone-2 border border-line rounded-lg p-4 space-y-3">
                <p className="text-sm text-ink-2">
                  Upload a CSV file to bulk import leads. Your CSV should have a header row and can contain the following columns:
                </p>
                <ul className="text-xs text-muted list-disc pl-4 space-y-1">
                  <li><strong>Name</strong> (Required)</li>
                  <li><strong>Email</strong> (Required)</li>
                  <li><strong>Phone</strong> (Optional)</li>
                  <li><strong>Status</strong> (Optional: new, contacted, qualified)</li>
                </ul>
              </div>

              <label className="block">
                <span className="label">CSV File</span>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-ink file:text-paper hover:file:bg-ink/90 file:cursor-pointer"
                />
              </label>

              <div className="border-t border-line pt-5 mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowImportModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || importMutation.isPending}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import Leads
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </PageShell>
  );
}

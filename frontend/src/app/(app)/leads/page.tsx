"use client";
import { toast } from "sonner";


import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Mail, Users, User, Download, Upload, X, Loader2 } from "lucide-react";

import { createLead, exportLeads, updateLead, sendEmail, fetchTeam } from "@/lib/api";
import { useCurrentUser, useLeadPage, useImportLeads, useCurrentCompany, useDeleteLead } from "@/lib/queries";
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
    mobile: "",
    source: "",
    status: company?.default_lead_status || "new",
    custom_data: {},
  });
  
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatusIds, setBulkStatusIds] = useState<number[]>([]);
  const [bulkStatusValue, setBulkStatusValue] = useState("");

  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignIds, setCampaignIds] = useState<number[]>([]);
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignIds, setAssignIds] = useState<number[]>([]);
  const [assignValue, setAssignValue] = useState<number | null>(null);

  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    enabled: !!me,
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
  const deleteMutation = useDeleteLead();

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
                  key: "mobile",
                  header: "Mobile",
                  render: (lead) => lead.mobile || <span className="text-muted text-xs">N/A</span>,
                },
                {
                  key: "source",
                  header: "Source",
                  render: (lead) => lead.source || <span className="text-muted text-xs">N/A</span>,
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
                  onClick: (ids) => {
                    setCampaignIds(ids.map(Number));
                    setShowCampaignModal(true);
                  },
                },
                {
                  label: "Assign To",
                  onClick: (ids) => {
                    setAssignIds(ids.map(Number));
                    setShowAssignModal(true);
                  },
                },
                {
                  label: "Change Status",
                  onClick: (ids) => {
                    setBulkStatusIds(ids.map(Number));
                    setShowBulkStatusModal(true);
                  }
                },
                {
                  label: "Delete",
                  variant: "danger",
                  onClick: async (ids) => {
                    const promises = ids.map(id => deleteMutation.mutateAsync(Number(id)));
                    toast.promise(Promise.all(promises), {
                      loading: `Deleting ${ids.length} leads...`,
                      success: () => {
                        return `Deleted ${ids.length} leads.`;
                      },
                      error: "Failed to delete leads.",
                    });
                  },
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
              <span className="label">Mobile</span>
              <input
                type="tel"
                className="input"
                value={form.mobile || ""}
                onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
                placeholder="+1 234 567 8900"
              />
            </label>
            <label>
              <span className="label">Source</span>
              <input
                type="text"
                className="input"
                value={form.source || ""}
                onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                placeholder="Website, Referral, etc."
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
          <div className="bg-paper border border-line-2 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-line-2 bg-bone/30">
              <h3 className="font-serif text-xl text-ink">Import Leads</h3>
              <button onClick={() => setShowImportModal(false)} className="text-muted hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleImport} className="p-4 flex flex-col gap-4">
              <p className="text-[13px] text-ink-2 leading-relaxed">
                Upload a CSV file containing your leads. The file must have columns matching standard lead fields 
                (e.g., <code>name</code>, <code>email</code>, <code>status</code>).
              </p>
              
              <div className="border-2 border-dashed border-line-2 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 bg-bone/20">
                <div className="w-10 h-10 rounded-full bg-bone-2 flex items-center justify-center text-ink-2">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <label className="btn btn-primary px-4 py-2 cursor-pointer inline-flex">
                    <span>Select CSV File</span>
                    <input 
                      type="file" 
                      accept=".csv"
                      className="hidden" 
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {importFile && (
                    <div className="mt-3 text-[12px] font-mono text-accent bg-accent/10 px-3 py-1.5 rounded-full inline-block">
                      {importFile.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowImportModal(false)} className="btn px-4 py-2 hover:bg-line-2/50 text-ink">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!importFile || importMutation.isPending}
                  className="btn btn-primary px-4 py-2"
                >
                  {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
          <div className="bg-paper border border-line-2 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-line-2 bg-bone/30">
              <h3 className="font-serif text-xl text-ink">Change Status</h3>
              <button onClick={() => setShowBulkStatusModal(false)} className="text-muted hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <p className="text-[13px] text-ink-2 leading-relaxed">Select a new status for {bulkStatusIds.length} leads.</p>
              <div>
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">New Status</label>
                <select
                  className="input flex-1"
                  value={bulkStatusValue}
                  onChange={(e) => setBulkStatusValue(e.target.value)}
                >
                  <option value="" disabled>Select a status</option>
                  {company?.lead_statuses?.map((s: string) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                  {!company?.lead_statuses && (
                    <>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="lost">Lost</option>
                      <option value="won">Won</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-line-2 bg-bone/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowBulkStatusModal(false)} className="btn px-4 py-2 hover:bg-line-2/50 text-ink">Cancel</button>
              <button 
                type="button" 
                disabled={!bulkStatusValue}
                onClick={async () => {
                  try {
                    const promises = bulkStatusIds.map(id => updateLead(id, { status: bulkStatusValue }));
                    toast.promise(Promise.all(promises), {
                      loading: `Updating ${bulkStatusIds.length} leads...`,
                      success: () => {
                        setShowBulkStatusModal(false);
                        setBulkStatusValue("");
                        void queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
                        return `Updated ${bulkStatusIds.length} leads to ${bulkStatusValue}.`;
                      },
                      error: "Failed to update leads."
                    });
                  } catch (e) {
                    toast.error("An error occurred");
                  }
                }} 
                className="btn btn-primary px-4 py-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
          <div className="bg-paper border border-line-2 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-line-2 bg-bone/30">
              <h3 className="font-serif text-xl text-ink">Send Email Campaign</h3>
              <button onClick={() => setShowCampaignModal(false)} className="text-muted hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <p className="text-[13px] text-ink-2 leading-relaxed">
                Compose an email to be sent individually to {campaignIds.length} selected leads.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Subject</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Enter email subject..."
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Message Body</label>
                <textarea
                  className="input w-full min-h-[150px] resize-y"
                  placeholder="Type your message here..."
                  value={campaignBody}
                  onChange={(e) => setCampaignBody(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t border-line-2 bg-bone/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCampaignModal(false)} className="btn px-4 py-2 hover:bg-line-2/50 text-ink">Cancel</button>
              <button 
                type="button" 
                disabled={!campaignSubject || !campaignBody}
                onClick={async () => {
                  try {
                    const promises = campaignIds.map(id => sendEmail({ subject: campaignSubject, body: campaignBody, lead_id: id }));
                    toast.promise(Promise.all(promises), {
                      loading: `Sending emails to ${campaignIds.length} leads...`,
                      success: () => {
                        setShowCampaignModal(false);
                        setCampaignSubject("");
                        setCampaignBody("");
                        return `Successfully sent to ${campaignIds.length} leads!`;
                      },
                      error: "Failed to send emails. Check your SMTP configuration."
                    });
                  } catch (e) {
                    toast.error("An error occurred");
                  }
                }} 
                className="btn btn-primary px-4 py-2 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" /> Send Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
          <div className="bg-paper border border-line-2 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-line-2 bg-bone/30">
              <h3 className="font-serif text-xl text-ink">Assign Leads</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-muted hover:text-ink transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <p className="text-[13px] text-ink-2 leading-relaxed">Select a team member to assign to {assignIds.length} leads.</p>
              <div>
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-2">Team Member</label>
                <select
                  className="select w-full"
                  value={assignValue || ""}
                  onChange={(e) => setAssignValue(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="" disabled>Select a team member</option>
                  <option value="unassigned">Unassigned</option>
                  {me && <option value={me.id}>Me ({me.email})</option>}
                  {teamData?.users?.map((u: any) => {
                    if (u.id === me?.id) return null;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-line-2 bg-bone/30 flex justify-end gap-3">
              <button type="button" onClick={() => setShowAssignModal(false)} className="btn px-4 py-2 hover:bg-line-2/50 text-ink">Cancel</button>
              <button 
                type="button" 
                disabled={assignValue === null}
                onClick={async () => {
                  try {
                    const assignedId = (assignValue as any) === "unassigned" ? null : assignValue;
                    const promises = assignIds.map(id => updateLead(id, { assigned_to_id: assignedId }));
                    toast.promise(Promise.all(promises), {
                      loading: `Assigning ${assignIds.length} leads...`,
                      success: () => {
                        setShowAssignModal(false);
                        setAssignValue(null);
                        void queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
                        return `Successfully assigned ${assignIds.length} leads!`;
                      },
                      error: "Failed to assign leads."
                    });
                  } catch (e) {
                    toast.error("An error occurred");
                  }
                }} 
                className="btn btn-primary px-4 py-2 flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

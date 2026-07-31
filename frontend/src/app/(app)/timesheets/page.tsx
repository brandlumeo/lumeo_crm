"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useTimesheets, useCreateTimesheet, useUpdateTimesheet, useDeleteTimesheet, useProjects, useCurrentUser } from "@/lib/queries";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { Clock, Plus, Filter, Calendar, Briefcase, FileText, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Timesheet, TimesheetInput } from "@/lib/types";
import { cn } from "@/lib/utils";

function getLocalAvatarTint(seed: string) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const index = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export default function TimesheetsPage() {
  const { data: user } = useCurrentUser();
  const [params, setParams] = useState<Record<string, string>>({});
  const { data, isLoading } = useTimesheets(params);
  const { data: projectsData } = useProjects({ limit: 100 });
  const projects = projectsData?.results || [];

  const createTimesheet = useCreateTimesheet();
  const updateTimesheet = useUpdateTimesheet();
  const deleteTimesheet = useDeleteTimesheet();

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<Timesheet | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form State
  const [projectId, setProjectId] = useState<number | "">("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hours, setHours] = useState<string>("");
  const [description, setDescription] = useState("");

  const isManager = user?.has_management_access || user?.role === "admin" || user?.role === "owner";

  const rows = data?.results ?? [];

  const openNewDrawer = () => {
    setEditingLog(null);
    setProjectId("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setHours("");
    setDescription("");
    setDrawerOpen(true);
  };

  const openEditDrawer = (t: Timesheet) => {
    setEditingLog(t);
    setProjectId(t.project_id ?? "");
    setDate(t.date);
    setHours(t.hours.toString());
    setDescription(t.description ?? "");
    setDrawerOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hours || isNaN(Number(hours)) || Number(hours) <= 0) {
      toast.error("Please enter a valid number of hours.");
      return;
    }

    const payload: TimesheetInput = {
      project_id: projectId ? Number(projectId) : null,
      date,
      hours: Number(hours),
      description: description || undefined,
    };

    if (editingLog) {
      updateTimesheet.mutate(
        { id: editingLog.id, payload },
        {
          onSuccess: () => {
            toast.success("Timesheet updated");
            setDrawerOpen(false);
          },
          onError: () => toast.error("Failed to update timesheet")
        }
      );
    } else {
      createTimesheet.mutate(payload, {
        onSuccess: () => {
          toast.success("Timesheet created");
          setDrawerOpen(false);
        },
        onError: () => toast.error("Failed to create timesheet")
      });
    }
  };

  const handleStatusChange = (id: number, status: "approved" | "rejected") => {
    updateTimesheet.mutate(
      { id, payload: { status } },
      {
        onSuccess: () => toast.success(`Timesheet ${status}`),
        onError: () => toast.error("Failed to update status")
      }
    );
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded text-[11px] font-bold shadow-sm uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded text-[11px] font-bold shadow-sm uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded text-[11px] font-bold shadow-sm uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" /> Submitted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-bone-2 text-ink border border-line px-2.5 py-1 rounded text-[11px] font-bold shadow-sm uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-muted" /> Draft
          </span>
        );
    }
  };

  return (
    <PageShell
      eyebrow="Work"
      title="Timesheets"
      description="Track and approve hours across projects and tasks."
      actions={
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              className="pl-9 pr-8 py-2 bg-paper border border-line rounded-lg text-[13px] font-medium text-ink shadow-sm appearance-none min-w-[140px] focus:outline-none focus:ring-2 focus:ring-accent/20"
              value={params.status || ""}
              onChange={(e) => setParams(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <Filter className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button 
            onClick={openNewDrawer}
            className="flex items-center gap-2 bg-ink text-paper px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-ink-2 shadow-sm transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Log Hours
          </button>
        </div>
      }
    >
      <div className="flex-1 flex flex-col pt-2">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-pulse text-muted text-[13px] font-medium">Loading timesheets...</div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No Timesheets"
            description="You haven't logged any hours yet."
            action={{ label: "Log Hours", onClick: openNewDrawer }}
          />
        ) : (
          <div className="card p-0 overflow-hidden border border-line bg-paper shadow-sm animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-bone-2/50 border-b border-line text-muted font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-6 py-4 min-w-[200px]">Staff Member</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Hours</th>
                    <th className="px-6 py-4 min-w-[250px]">Description</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAF9F7] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm", getLocalAvatarTint(row.user_display?.email || "?"))}>
                            {(row.user_display?.first_name?.[0] || row.user_display?.email?.[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-ink leading-none mb-1">
                              {row.user_display?.first_name} {row.user_display?.last_name}
                            </div>
                            <div className="text-[11px] text-muted">{row.user_display?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-ink-2 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-muted" />
                          {format(new Date(row.date), "MMM d, yyyy")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {row.project_name ? (
                          <div className="flex items-center gap-2 text-ink font-medium">
                            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                            {row.project_name}
                          </div>
                        ) : (
                          <span className="text-muted text-[12px] italic">General</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-ink bg-bone-2 px-2 py-0.5 rounded border border-line">
                          {row.hours}h
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-muted truncate max-w-[250px]" title={row.description || ""}>
                          {row.description || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {renderStatus(row.status)}
                      </td>
                      <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-2">
                          {isManager && row.status !== "approved" && (
                            <button
                              onClick={() => handleStatusChange(row.id, "approved")}
                              className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {isManager && row.status !== "rejected" && (
                            <button
                              onClick={() => handleStatusChange(row.id, "rejected")}
                              className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[11px] font-bold hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                          {(row.user_display.id === user?.id || isManager) && (
                            <>
                              <button
                                onClick={() => openEditDrawer(row)}
                                className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-[12px] font-semibold transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingId(row.id)}
                                className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-[12px] font-semibold transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in bg-ink/30 backdrop-blur-[2px]">
          <div 
            className="w-full max-w-md bg-paper h-full shadow-2xl flex flex-col border-l border-line animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-line bg-paper sticky top-0 z-10 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-[20px] font-medium text-ink">
                  {editingLog ? "Edit Timesheet" : "Log Hours"}
                </h3>
                <p className="text-[13px] text-muted mt-1">Record time spent on a project.</p>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bone transition-colors text-muted hover:text-ink"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <form id="timesheet-form" onSubmit={handleSave} className="flex flex-col gap-6">
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Project</label>
                  <select 
                    value={projectId} 
                    onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                  >
                    <option value="">General (No Project)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Hours *</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    required
                    placeholder="e.g. 4.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Description</label>
                  <textarea
                    rows={4}
                    placeholder="What did you work on?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow resize-none"
                  />
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-line bg-bone-2/30 flex justify-end gap-3 sticky bottom-0">
              <button 
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-bold text-ink-2 hover:bg-bone transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="timesheet-form"
                disabled={createTimesheet.isPending || updateTimesheet.isPending}
                className="px-6 py-2 rounded-lg text-[13px] font-bold bg-ink text-paper hover:bg-ink-2 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm flex items-center gap-2"
              >
                {(createTimesheet.isPending || updateTimesheet.isPending) && (
                  <div className="w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                )}
                {editingLog ? "Save Changes" : "Log Hours"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <ConfirmationModal
          title="Delete Timesheet"
          description="Are you sure you want to delete this timesheet entry? This action cannot be undone."
          confirmLabel="Delete Entry"
          isDestructive={true}
          onConfirm={() => {
            deleteTimesheet.mutate(deletingId, {
              onSuccess: () => {
                toast.success("Timesheet deleted");
                setDeletingId(null);
              },
              onError: () => toast.error("Failed to delete timesheet")
            });
          }}
          onCancel={() => setDeletingId(null)}
          isLoading={deleteTimesheet.isPending}
        />
      )}
    </PageShell>
  );
}

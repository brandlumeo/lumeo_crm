"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DailyReport, DailyReportInput } from "@/lib/types";
import { useCurrentUser } from "@/lib/queries";
import * as Dialog from "@radix-ui/react-dialog";
import { PlusCircle, Search, Calendar as CalendarIcon, User as UserIcon, Loader2, Smile, Meh, Frown, X, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";

export default function DailyReportsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Submit state
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<string>("Great");
  const [blockers, setBlockers] = useState("");
  const [nextDayPlan, setNextDayPlan] = useState("");

  // Edit state
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSentiment, setEditSentiment] = useState<string>("Great");
  const [editBlockers, setEditBlockers] = useState("");
  const [editNextDayPlan, setEditNextDayPlan] = useState("");

  // Delete state
  const [deletingReport, setDeletingReport] = useState<DailyReport | null>(null);

  const { data: reports, isLoading } = useQuery<DailyReport[]>({
    queryKey: ["daily-reports"],
    queryFn: async () => {
      const res = await api.get("/attendance/reports/");
      return res.data;
    },
  });

  const { data: todayReport } = useQuery<DailyReport>({
    queryKey: ["daily-reports", "today"],
    queryFn: async () => {
      const res = await api.get("/attendance/reports/today/");
      return res.data;
    },
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: DailyReportInput) => {
      const res = await api.post("/attendance/reports/", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Daily report submitted successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports", "today"] });
      setIsSubmitModalOpen(false);
      setContent("");
      setBlockers("");
      setNextDayPlan("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to submit report");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DailyReportInput> }) => {
      const res = await api.patch(`/attendance/reports/${id}/`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Daily report updated successfully! ✨");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports", "today"] });
      setEditingReport(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to update report");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/attendance/reports/${id}/`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Daily report deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports", "today"] });
      setDeletingReport(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to delete report");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Report content cannot be empty.");
      return;
    }
    submitMutation.mutate({
      content,
      sentiment,
      blockers,
      next_day_plan: nextDayPlan,
    });
  };

  const handleOpenEdit = (report: DailyReport) => {
    setEditingReport(report);
    setEditContent(report.content || "");
    setEditSentiment(report.sentiment || "Great");
    setEditBlockers(report.blockers || "");
    setEditNextDayPlan(report.next_day_plan || "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) {
      toast.error("Report content cannot be empty.");
      return;
    }
    if (!editingReport) return;
    updateMutation.mutate({
      id: editingReport.id,
      data: {
        content: editContent,
        sentiment: editSentiment,
        blockers: editBlockers,
        next_day_plan: editNextDayPlan,
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingReport) return;
    deleteMutation.mutate(deletingReport.id);
  };

  const isReportOwner = (report: DailyReport) => {
    if (!user) return false;
    return user.id === report.user || user.email?.toLowerCase() === report.user_email?.toLowerCase();
  };

  const filteredReports = reports?.filter(r => 
    r.user_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getSentimentIcon = (sent: string) => {
    switch (sent) {
      case "Great": return <Smile className="h-3.5 w-3.5 text-green-600" />;
      case "Okay": return <Meh className="h-3.5 w-3.5 text-amber-600" />;
      case "Struggling": return <Frown className="h-3.5 w-3.5 text-red-600" />;
      default: return null;
    }
  };

  const getSentimentColor = (sent: string) => {
    switch (sent) {
      case "Great": return "bg-green-50 text-green-700 border-green-200/50";
      case "Okay": return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "Struggling": return "bg-red-50 text-red-700 border-red-200/50";
      default: return "bg-neutral-50 text-neutral-700 border-line";
    }
  };

  return (
    <PageShell title="Daily Reports">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="search"
            placeholder="Search reports..."
            className="input w-full pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Dialog.Root open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
          <Dialog.Trigger asChild>
            <button 
              className="btn btn-primary h-10 shadow-sm"
              disabled={!!todayReport}
            >
              {todayReport ? "Submitted for Today" : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Submit Wrap-Up
                </>
              )}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
            <Dialog.Content className="fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-xl h-[100dvh] md:h-auto md:max-h-[85vh] flex flex-col bg-paper shadow-2xl md:rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-line shrink-0">
                <div>
                  <Dialog.Title className="text-lg font-bold text-ink">Submit Daily Wrap-Up</Dialog.Title>
                  <Dialog.Description className="text-[13px] text-muted mt-1">
                    Write down what you accomplished today. This will be shared with your team.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors shrink-0 ml-4">
                    <X className="h-4 w-4" />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">How was your day?</label>
                    <select 
                      value={sentiment} 
                      onChange={(e) => setSentiment(e.target.value)}
                      className="select w-full h-10"
                    >
                      <option value="Great">Great & Productive</option>
                      <option value="Okay">Okay / Average</option>
                      <option value="Struggling">Struggling / Hard Day</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">What did you accomplish today?</label>
                    <textarea 
                      required
                      placeholder="I closed 2 deals, sent 10 emails, and finished the presentation..."
                      className="input w-full min-h-[120px] resize-y py-2.5"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Any blockers or challenges? (Optional)</label>
                    <textarea 
                      placeholder="I am waiting on approval for..."
                      className="input w-full min-h-[80px] resize-y py-2.5"
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Main focus for tomorrow? (Optional)</label>
                    <input 
                      type="text"
                      placeholder="Focusing on the XYZ project..."
                      className="input w-full h-10"
                      value={nextDayPlan}
                      onChange={(e) => setNextDayPlan(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-4 md:p-5 border-t border-line flex justify-end gap-3 shrink-0 bg-paper">
                  <Dialog.Close asChild>
                    <button type="button" className="btn btn-secondary h-10">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button 
                    type="submit" 
                    className="btn btn-primary h-10"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Wrap-Up"}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted" />
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState 
          icon={FileText}
          title="No daily reports yet"
          description="Your team's daily wrap-ups will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((report) => {
            const isOwner = isReportOwner(report);

            return (
              <div key={report.id} className="bg-paper border border-line rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-line bg-surface/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                        {report.user_avatar ? (
                          <img src={report.user_avatar} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          getInitials(report.user_full_name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold text-ink truncate">{report.user_full_name}</h3>
                        <p className="text-xs text-muted flex items-center mt-0.5">
                          <CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
                          {format(new Date(report.date), "EEEE, MMMM do, yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {report.sentiment && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide border ${getSentimentColor(report.sentiment)}`}>
                          {getSentimentIcon(report.sentiment)}
                          {report.sentiment}
                        </span>
                      )}

                      {/* Edit and Delete options - strictly visible to the report author only */}
                      {isOwner && (
                        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-line">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(report)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-line transition-all"
                            title="Edit report"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingReport(report)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200/50 transition-all"
                            title="Delete report"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Accomplishments</h4>
                      <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink/90">
                        {report.content}
                      </div>
                    </div>
                    
                    {(report.blockers || report.next_day_plan) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-line/60">
                        {report.blockers && (
                          <div className="bg-red-50 dark:bg-red-500/10 p-3.5 rounded-lg border border-red-100 dark:border-red-500/20">
                            <h4 className="text-[12px] font-bold text-red-700 dark:text-red-400 mb-1 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>
                              Blockers & Challenges
                            </h4>
                            <p className="text-[13.5px] text-red-900/80 dark:text-red-200/80 mt-1.5 leading-relaxed">{report.blockers}</p>
                          </div>
                        )}
                        {report.next_day_plan && (
                          <div className="bg-blue-50 dark:bg-blue-500/10 p-3.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                            <h4 className="text-[12px] font-bold text-blue-700 dark:text-blue-400 mb-1 flex items-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2"></span>
                              Tomorrow's Focus
                            </h4>
                            <p className="text-[13.5px] text-blue-900/80 dark:text-blue-200/80 mt-1.5 leading-relaxed">{report.next_day_plan}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Daily Report Modal */}
      <Dialog.Root open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-xl h-[100dvh] md:h-auto md:max-h-[85vh] flex flex-col bg-paper shadow-2xl md:rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-line shrink-0">
              <div>
                <Dialog.Title className="text-lg font-bold text-ink">Edit Daily Wrap-Up</Dialog.Title>
                <Dialog.Description className="text-[13px] text-muted mt-1">
                  {editingReport && `Modifying report for ${format(new Date(editingReport.date), "EEEE, MMMM do, yyyy")}`}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors shrink-0 ml-4">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">How was your day?</label>
                  <select 
                    value={editSentiment} 
                    onChange={(e) => setEditSentiment(e.target.value)}
                    className="select w-full h-10"
                  >
                    <option value="Great">Great & Productive</option>
                    <option value="Okay">Okay / Average</option>
                    <option value="Struggling">Struggling / Hard Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">What did you accomplish today?</label>
                  <textarea 
                    required
                    placeholder="I closed 2 deals, sent 10 emails, and finished the presentation..."
                    className="input w-full min-h-[120px] resize-y py-2.5"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">Any blockers or challenges? (Optional)</label>
                  <textarea 
                    placeholder="I am waiting on approval for..."
                    className="input w-full min-h-[80px] resize-y py-2.5"
                    value={editBlockers}
                    onChange={(e) => setEditBlockers(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">Main focus for tomorrow? (Optional)</label>
                  <input 
                    type="text"
                    placeholder="Focusing on the XYZ project..."
                    className="input w-full h-10"
                    value={editNextDayPlan}
                    onChange={(e) => setEditNextDayPlan(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 md:p-5 border-t border-line flex justify-end gap-3 shrink-0 bg-paper">
                <button 
                  type="button" 
                  onClick={() => setEditingReport(null)}
                  className="btn btn-secondary h-10"
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary h-10"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <Dialog.Root open={!!deletingReport} onOpenChange={(open) => !open && setDeletingReport(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-paper shadow-2xl rounded-2xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200 border border-line">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-ink">Delete Daily Report</Dialog.Title>
                <p className="text-xs text-muted">This action cannot be undone.</p>
              </div>
            </div>

            <Dialog.Description className="text-sm text-ink/80 leading-relaxed mb-6">
              Are you sure you want to delete your daily report for{" "}
              <strong className="text-ink font-semibold">
                {deletingReport && format(new Date(deletingReport.date), "MMMM do, yyyy")}
              </strong>
              ? Your submission will be permanently removed.
            </Dialog.Description>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingReport(null)}
                className="btn btn-secondary h-9 text-xs px-4"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="btn bg-rose-600 hover:bg-rose-700 text-white border-transparent h-9 text-xs px-4 shadow-sm"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Report"
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PageShell>
  );
}

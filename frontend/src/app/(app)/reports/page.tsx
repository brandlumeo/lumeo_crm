"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  DailyReport, 
  DailyReportInput, 
  DailyReportMatrixResponse, 
  AIMonthlyPerformanceResponse,
  PerformerRanking 
} from "@/lib/types";
import { 
  useCurrentUser, 
  useReportMonthlyMatrix, 
  useAIMonthlyAnalysis, 
  useGenerateAIMonthlyAnalysis 
} from "@/lib/queries";
import * as Dialog from "@radix-ui/react-dialog";
import { 
  PlusCircle, 
  Search, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Loader2, 
  Smile, 
  Meh, 
  Frown, 
  X, 
  FileText, 
  Pencil, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Trophy,
  Medal,
  Award,
  Sparkles,
  Check,
  CheckCircle2,
  Clock,
  PlaneTakeoff,
  CalendarOff,
  Star,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Info,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";

export default function DailyReportsPage() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  // Tab State: 'feed' | 'matrix' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<"feed" | "matrix" | "leaderboard">("feed");

  // Feed search & modals
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Submit wrap-up state
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<string>("Great");
  const [blockers, setBlockers] = useState("");
  const [nextDayPlan, setNextDayPlan] = useState("");

  // Edit wrap-up state
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSentiment, setEditSentiment] = useState<string>("Great");
  const [editBlockers, setEditBlockers] = useState("");
  const [editNextDayPlan, setEditNextDayPlan] = useState("");

  // Delete state
  const [deletingReport, setDeletingReport] = useState<DailyReport | null>(null);

  // Month navigation for Matrix & AI Leaderboard
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  // Selected cell detail modal for Matrix
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{
    userName: string;
    userRole: string;
    date: string;
    status: string;
    sentiment?: string;
    snippet?: string;
    label?: string;
  } | null>(null);

  // Selected performer detail modal for Leaderboard
  const [selectedPerformer, setSelectedPerformer] = useState<PerformerRanking | null>(null);

  // Permission Check: Primary Admin (owner/admin) or Secondary Admin (manager/has_management_access)
  const isLeaderboardAllowed = !!(
    user?.is_superuser ||
    user?.role === "owner" ||
    user?.role === "admin" ||
    user?.role === "manager" ||
    user?.has_management_access
  );

  // 1. Reports Feed Query
  const { data: reports, isLoading: isReportsLoading } = useQuery<DailyReport[]>({
    queryKey: ["daily-reports"],
    queryFn: async () => {
      const res = await api.get("/attendance/reports/");
      return res.data;
    },
  });

  // 2. Monthly Matrix Query
  const { 
    data: matrixData, 
    isLoading: isMatrixLoading,
    refetch: refetchMatrix 
  } = useReportMonthlyMatrix(selectedDate.month, selectedDate.year);

  // 3. AI Monthly Leaderboard Query (only fetched if user has permission)
  const { 
    data: aiData, 
    isLoading: isAILoading 
  } = useAIMonthlyAnalysis(selectedDate.month, selectedDate.year);

  // 4. Generate AI Monthly Analysis Mutation
  const generateAIMutation = useGenerateAIMonthlyAnalysis();

  const handleRunAIAnalysis = async () => {
    try {
      toast.info("Gemini AI is analyzing monthly reports & velocity...", { duration: 4000 });
      await generateAIMutation.mutateAsync({
        month: selectedDate.month,
        year: selectedDate.year,
      });
      toast.success("AI monthly evaluation completed! Rankings updated. 🏆");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to generate AI analysis");
    }
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (data: DailyReportInput) => {
      const res = await api.post("/attendance/reports/", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Daily report submitted successfully! 🎉");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports", "today"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports-matrix"] });
      setIsSubmitModalOpen(false);
      setContent("");
      setBlockers("");
      setNextDayPlan("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to submit report");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DailyReportInput> }) => {
      const res = await api.patch(`/attendance/reports/${id}/`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Daily report updated successfully! ✨");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports-matrix"] });
      setEditingReport(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to update report");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/attendance/reports/${id}/`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Daily report deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-reports-matrix"] });
      setDeletingReport(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to delete report");
    },
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

  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 1) {
        m = 12;
        y--;
      }
      return { month: m, year: y };
    });
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 12) {
        m = 1;
        y++;
      }
      return { month: m, year: y };
    });
  };

  const getMonthName = (m: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString("default", { month: "long" });
  };

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

  const getMatrixStatusBadge = (item: any) => {
    if (!item) return <div className="w-7 h-7" />;
    switch (item.status) {
      case "submitted":
        return (
          <button 
            type="button"
            onClick={() => setSelectedMatrixCell({
              userName: item.userName || "Team Member",
              userRole: item.userRole || "",
              date: item.date,
              status: item.status,
              sentiment: item.sentiment,
              snippet: item.snippet,
            })}
            title={`Submitted: ${item.snippet || "Click to view"}`}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white shadow-sm hover:scale-110 hover:ring-2 hover:ring-emerald-400 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        );
      case "covered":
        return (
          <button 
            type="button"
            onClick={() => setSelectedMatrixCell({
              userName: item.userName || "Team Member",
              userRole: item.userRole || "",
              date: item.date,
              status: item.status,
              sentiment: item.sentiment,
              snippet: item.snippet,
              label: item.label || "Covered in subsequent wrap-up",
            })}
            title={item.label || "Covered in next report (Credited)"}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-500 text-white shadow-sm hover:scale-110 hover:ring-2 hover:ring-teal-400 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          </button>
        );
      case "leave":
        return (
          <button
            type="button"
            onClick={() => setSelectedMatrixCell({
              userName: item.userName || "Team Member",
              userRole: item.userRole || "",
              date: item.date,
              status: item.status,
              label: "On Approved Leave (Excused from daily wrap-up)",
            })}
            title="On Approved Leave (Excused)"
            className="flex items-center justify-center w-7 h-7 rounded-full bg-[#378ADD] text-white shadow-sm hover:scale-110 hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer"
          >
            <PlaneTakeoff className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        );
      case "holiday":
        return (
          <div title="Company Holiday" className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 text-white shadow-sm">
            <Star className="w-3.5 h-3.5 stroke-[2.5] fill-white" />
          </div>
        );
      case "day_off":
        return (
          <div title="Day Off" className="flex items-center justify-center w-7 h-7 rounded-full bg-rose-500 text-white shadow-sm">
            <CalendarOff className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        );
      case "missed":
        return (
          <button
            type="button"
            onClick={() => setSelectedMatrixCell({
              userName: item.userName || "Team Member",
              userRole: item.userRole || "",
              date: item.date,
              status: item.status,
              label: "Wrap-up was not submitted on this working day",
            })}
            title="Missed Daily Wrap-Up"
            className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent border border-rose-300 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        );
      case "future":
        return <div className="w-7 h-7" />;
      default:
        return <div className="w-7 h-7 text-xs text-muted">-</div>;
    }
  };

  const exportMatrixCSV = () => {
    if (!matrixData || !matrixData.matrix.length) {
      toast.error("No matrix data available to export");
      return;
    }
    const daysHeader = Array.from({ length: matrixData.days_in_month }, (_, i) => `Day ${i + 1}`);
    const headers = ["Employee", "Email", "Role", "Designation", ...daysHeader, "Submitted", "Approved Leaves", "Missed", "Compliance Rate (%)"];
    
    const rows = matrixData.matrix.map((row) => {
      const dayValues = Array.from({ length: matrixData.days_in_month }, (_, i) => {
        const item = row.days[String(i + 1)];
        return item ? item.status : "-";
      });
      return [
        `"${row.name.replace(/"/g, '""')}"`,
        `"${row.email}"`,
        `"${row.role}"`,
        `"${row.designation}"`,
        ...dayValues,
        row.counts.submitted,
        row.counts.leave,
        row.counts.missed,
        `"${row.compliance_rate}%"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_reports_attendance_${matrixData.year}_${matrixData.month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Daily reports attendance CSV exported! 📥");
  };

  return (
    <PageShell title="Daily Reports & AI Leaderboard">
      {/* Top Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-line pb-4">
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-line w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("feed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "feed"
                ? "bg-paper text-ink shadow-sm border border-line/60"
                : "text-muted hover:text-ink hover:bg-paper/50"
            }`}
          >
            <FileText className="h-4 w-4 text-primary" />
            <span>Reports Feed</span>
            {reports && reports.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                {reports.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "matrix"
                ? "bg-paper text-ink shadow-sm border border-line/60"
                : "text-muted hover:text-ink hover:bg-paper/50"
            }`}
          >
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span>Attendance Matrix</span>
          </button>

          {isLeaderboardAllowed && (
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "leaderboard"
                  ? "bg-paper text-ink shadow-sm border border-line/60"
                  : "text-muted hover:text-ink hover:bg-paper/50"
              }`}
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>AI Leaderboard</span>
              <span className="flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            </button>
          )}
        </div>

        {/* Action: Submit Wrap-Up Modal Trigger */}
        <Dialog.Root open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
          <Dialog.Trigger asChild>
            <button className="btn btn-primary h-10 shadow-sm shrink-0">
              <PlusCircle className="mr-2 h-4 w-4" />
              Submit Wrap-Up
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
            <Dialog.Content className="fixed inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-xl h-[100dvh] md:h-auto md:max-h-[85vh] flex flex-col bg-paper shadow-2xl md:rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-line shrink-0">
                <div>
                  <Dialog.Title className="text-lg font-bold text-ink">Submit Daily Wrap-Up</Dialog.Title>
                  <Dialog.Description className="text-[13px] text-muted mt-1">
                    Write down what you accomplished today. Approved leaves do not require wrap-ups.
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
                      placeholder="I completed project milestones, resolved customer tickets, wrote new features..."
                      className="input w-full min-h-[120px] resize-y py-2.5"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Any blockers or challenges? (Optional)</label>
                    <textarea 
                      placeholder="Waiting for client feedback, missing assets, etc..."
                      className="input w-full min-h-[80px] resize-y py-2.5"
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Main focus for tomorrow? (Optional)</label>
                    <input 
                      type="text"
                      placeholder="Continue development on module X..."
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

      {/* ========================================================================= */}
      {/* TAB 1: REPORTS FEED                                                       */}
      {/* ========================================================================= */}
      {activeTab === "feed" && (
        <div className="space-y-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="search"
              placeholder="Search reports by team member or content..."
              className="input w-full pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isReportsLoading ? (
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
                              {report.created_at && (
                                <span className="ml-1.5 opacity-80">
                                  • {format(new Date(report.created_at), "h:mm a")}
                                </span>
                              )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY REPORT ATTENDANCE MATRIX                                     */}
      {/* ========================================================================= */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-paper p-4 rounded-xl border border-line shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink">Daily Report Attendance Matrix</h2>
                <p className="text-xs text-muted">
                  Monthly submission calendar. Staff on approved leave are excused.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-surface border border-line rounded-lg overflow-hidden p-1">
                <button 
                  onClick={handlePrevMonth} 
                  className="p-1.5 hover:bg-paper rounded transition-colors text-muted hover:text-ink"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1 font-semibold text-xs min-w-[130px] text-center text-ink">
                  {getMonthName(selectedDate.month)} {selectedDate.year}
                </div>
                <button 
                  onClick={handleNextMonth} 
                  className="p-1.5 hover:bg-paper rounded transition-colors text-muted hover:text-ink"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={exportMatrixCSV}
                className="btn btn-secondary h-9 text-xs px-3 shadow-sm inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Legend Banner */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-surface/50 border border-line rounded-lg text-xs text-muted">
            <span className="font-semibold text-ink text-[11px] uppercase tracking-wider">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span>Submitted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span>Covered in Next Report (Credited)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#378ADD] text-white flex items-center justify-center">
                <PlaneTakeoff className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span>On Leave (Excused)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-rose-300 text-rose-500 flex items-center justify-center">
                <X className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span>Missed Wrap-Up</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center">
                <Star className="w-3 h-3 stroke-[2.5] fill-white" />
              </div>
              <span>Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <CalendarOff className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span>Day Off</span>
            </div>
          </div>

          {/* Matrix Table */}
          {isMatrixLoading ? (
            <div className="flex justify-center items-center h-64 bg-paper rounded-xl border border-line">
              <Loader2 className="h-8 w-8 animate-spin text-muted" />
            </div>
          ) : !matrixData || !matrixData.matrix.length ? (
            <EmptyState
              icon={BarChart3}
              title="No Team Members Found"
              description="No active staff members are registered under your workspace."
            />
          ) : (
            <div className="bg-paper border border-line rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-surface/60 border-b border-line text-[11px] font-semibold text-muted uppercase tracking-wider">
                      <th className="py-3.5 px-4 sticky left-0 bg-surface/90 backdrop-blur z-10 min-w-[200px] border-r border-line">
                        Team Member
                      </th>
                      {Array.from({ length: matrixData.days_in_month }, (_, i) => {
                        const dayNum = i + 1;
                        const dateObj = new Date(matrixData.year, matrixData.month - 1, dayNum);
                        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "narrow" });
                        return (
                          <th key={dayNum} className="py-2.5 px-1.5 text-center min-w-[36px]">
                            <div className="font-mono text-ink text-[12px]">{dayNum}</div>
                            <div className="text-[9px] text-muted font-normal">{dayName}</div>
                          </th>
                        );
                      })}
                      <th className="py-3.5 px-3 text-center min-w-[80px] border-l border-line text-emerald-700 dark:text-emerald-400">
                        Submitted
                      </th>
                      <th className="py-3.5 px-3 text-center min-w-[70px] text-blue-700 dark:text-blue-400">
                        Leave
                      </th>
                      <th className="py-3.5 px-3 text-center min-w-[70px] text-rose-700 dark:text-rose-400">
                        Missed
                      </th>
                      <th className="py-3.5 px-4 text-center min-w-[100px] border-l border-line">
                        Compliance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {matrixData.matrix.map((row) => {
                      const compliance = row.compliance_rate;
                      const complianceBadgeColor = 
                        compliance >= 85 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : compliance >= 65
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                          : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";

                      return (
                        <tr key={row.id} className="hover:bg-surface/30 transition-colors">
                          <td className="py-3 px-4 sticky left-0 bg-paper hover:bg-surface/30 z-10 border-r border-line">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                {row.avatar ? (
                                  <img src={row.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  getInitials(row.name)
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-ink truncate text-[13px]">{row.name}</div>
                                <div className="text-[11px] text-muted truncate capitalize">
                                  {row.designation || row.role}
                                </div>
                              </div>
                            </div>
                          </td>

                          {Array.from({ length: matrixData.days_in_month }, (_, i) => {
                            const dayStr = String(i + 1);
                            const dayItem = row.days[dayStr];
                            return (
                              <td key={dayStr} className="py-2.5 px-1 text-center align-middle">
                                <div className="flex items-center justify-center">
                                  {getMatrixStatusBadge({
                                    ...dayItem,
                                    userName: row.name,
                                    userRole: row.designation || row.role,
                                  })}
                                </div>
                              </td>
                            );
                          })}

                          <td className="py-3 px-3 text-center font-semibold text-emerald-600 border-l border-line">
                            {row.counts.submitted}
                          </td>
                          <td className="py-3 px-3 text-center text-blue-600 font-medium">
                            {row.counts.leave}
                          </td>
                          <td className="py-3 px-3 text-center text-rose-600 font-medium">
                            {row.counts.missed}
                          </td>
                          <td className="py-3 px-4 text-center border-l border-line">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${complianceBadgeColor}`}>
                              {compliance}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI MONTHLY LEADERBOARD (PRIMARY ADMIN / MANAGER ACCESS ONLY)       */}
      {/* ========================================================================= */}
      {activeTab === "leaderboard" && (
        <div className="space-y-6">
          {!isLeaderboardAllowed ? (
            <div className="p-8 text-center bg-paper rounded-2xl border border-line shadow-sm max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Access Restricted</h3>
              <p className="text-sm text-muted leading-relaxed">
                Only the Primary Admin (Owner / Admin) and Managers / Secondary Admins have permission to access the AI Monthly Leaderboard.
              </p>
            </div>
          ) : (
            <>
              {/* Header with Month Nav & AI Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent p-5 rounded-2xl border border-amber-500/20 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 text-white shadow-sm">
                      <Trophy className="w-4 h-4" />
                    </span>
                    <h2 className="text-lg font-bold text-ink">AI Monthly Best Performer Leaderboard</h2>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    Powered by Gemini AI. Evaluates daily wrap-ups, problem-solving, and consistency in ranking order.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-paper border border-line rounded-lg overflow-hidden p-1 shadow-sm">
                    <button 
                      onClick={handlePrevMonth} 
                      className="p-1.5 hover:bg-surface rounded transition-colors text-muted hover:text-ink"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="px-3 py-1 font-semibold text-xs min-w-[130px] text-center text-ink">
                      {getMonthName(selectedDate.month)} {selectedDate.year}
                    </div>
                    <button 
                      onClick={handleNextMonth} 
                      className="p-1.5 hover:bg-surface rounded transition-colors text-muted hover:text-ink"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAIAnalysis}
                    disabled={generateAIMutation.isPending}
                    className="btn bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-transparent h-10 px-4 text-xs font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    {generateAIMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing Team Velocity...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Run / Refresh AI Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Leaderboard Content */}
              {isAILoading ? (
                <div className="flex flex-col items-center justify-center h-64 bg-paper rounded-2xl border border-line">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
                  <p className="text-xs text-muted">Retrieving monthly performance data...</p>
                </div>
              ) : !aiData || !aiData.has_analysis ? (
                <div className="p-10 text-center bg-paper rounded-2xl border border-line shadow-sm space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-base font-bold text-ink">No AI Evaluation for {getMonthName(selectedDate.month)} {selectedDate.year}</h3>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      Click the button below to have Gemini AI analyze all team daily wrap-ups, completed tasks, and contributions for this month to select and rank best performers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAIAnalysis}
                    disabled={generateAIMutation.isPending}
                    className="btn btn-primary h-10 px-5 text-xs shadow-sm inline-flex items-center gap-2"
                  >
                    {generateAIMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Run AI Analysis for {getMonthName(selectedDate.month)}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Executive Summary Card */}
                  {aiData.executive_summary && (
                    <div className="p-5 bg-paper rounded-2xl border border-amber-500/30 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            AI Executive Performance Brief
                          </h3>
                        </div>
                        {aiData.generated_at && (
                          <span className="text-[11px] text-muted">
                            Generated {format(new Date(aiData.generated_at), "MMM d, yyyy • h:mm a")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-ink/90 leading-relaxed font-normal">
                        {aiData.executive_summary}
                      </p>
                    </div>
                  )}

                  {/* Top 3 Podium Spotlight */}
                  {aiData.rankings && aiData.rankings.length >= 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Rank 2 - Silver */}
                      <div className="order-2 md:order-1 bg-paper p-5 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-slate-400">
                          <Medal className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            #2 SILVER
                          </span>
                          <h4 className="text-base font-bold text-ink mt-2">{aiData.rankings[1].name}</h4>
                          <p className="text-xs text-muted capitalize">{aiData.rankings[1].role}</p>

                          <div className="my-3 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-ink">{aiData.rankings[1].score}</span>
                            <span className="text-xs text-muted font-medium">/ 100</span>
                          </div>

                          {aiData.rankings[1].badge && (
                            <span className="inline-block text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md mb-2">
                              {aiData.rankings[1].badge}
                            </span>
                          )}

                          {aiData.rankings[1].highlights && (
                            <ul className="text-xs text-muted space-y-1 mt-2">
                              {aiData.rankings[1].highlights.slice(0, 2).map((h, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPerformer(aiData.rankings![1])}
                          className="mt-4 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-ink text-left"
                        >
                          View Full Evaluation →
                        </button>
                      </div>

                      {/* Rank 1 - Gold Champion */}
                      <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-paper to-paper p-6 rounded-2xl border-2 border-amber-500 shadow-md flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-amber-500">
                          <Trophy className="w-8 h-8" />
                        </div>
                        <div>
                          <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm">
                            🏆 #1 TOP PERFORMER
                          </span>
                          <h4 className="text-lg font-extrabold text-ink mt-2.5">{aiData.rankings[0].name}</h4>
                          <p className="text-xs text-muted capitalize">{aiData.rankings[0].role}</p>

                          <div className="my-3 flex items-baseline gap-1">
                            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                              {aiData.rankings[0].score}
                            </span>
                            <span className="text-xs text-muted font-medium">/ 100</span>
                          </div>

                          {aiData.rankings[0].badge && (
                            <span className="inline-block text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-md mb-2">
                              {aiData.rankings[0].badge}
                            </span>
                          )}

                          {aiData.rankings[0].highlights && (
                            <ul className="text-xs text-muted space-y-1.5 mt-2">
                              {aiData.rankings[0].highlights.slice(0, 3).map((h, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2 text-ink/90 font-medium">{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPerformer(aiData.rankings![0])}
                          className="mt-4 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline text-left"
                        >
                          View Champion Breakdown →
                        </button>
                      </div>

                      {/* Rank 3 - Bronze */}
                      <div className="order-3 bg-paper p-5 rounded-2xl border border-amber-800/30 shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-amber-700">
                          <Award className="w-7 h-7" />
                        </div>
                        <div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            #3 BRONZE
                          </span>
                          <h4 className="text-base font-bold text-ink mt-2">{aiData.rankings[2].name}</h4>
                          <p className="text-xs text-muted capitalize">{aiData.rankings[2].role}</p>

                          <div className="my-3 flex items-baseline gap-1">
                            <span className="text-2xl font-black text-ink">{aiData.rankings[2].score}</span>
                            <span className="text-xs text-muted font-medium">/ 100</span>
                          </div>

                          {aiData.rankings[2].badge && (
                            <span className="inline-block text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md mb-2">
                              {aiData.rankings[2].badge}
                            </span>
                          )}

                          {aiData.rankings[2].highlights && (
                            <ul className="text-xs text-muted space-y-1 mt-2">
                              {aiData.rankings[2].highlights.slice(0, 2).map((h, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPerformer(aiData.rankings![2])}
                          className="mt-4 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-ink text-left"
                        >
                          View Full Evaluation →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Complete Rankings Order Table */}
                  <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-line flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">Complete Monthly Rankings</h3>
                      <span className="text-xs text-muted">
                        {aiData.rankings?.length || 0} Team Members Ranked
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface/60 border-b border-line text-[11px] font-semibold text-muted uppercase tracking-wider">
                            <th className="py-3 px-4 w-16 text-center">Rank</th>
                            <th className="py-3 px-4 min-w-[180px]">Team Member</th>
                            <th className="py-3 px-4 w-32 text-center">AI Score</th>
                            <th className="py-3 px-4 min-w-[160px]">AI Recognition Badge</th>
                            <th className="py-3 px-4 min-w-[220px]">Key Accomplishments</th>
                            <th className="py-3 px-4 w-28 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {aiData.rankings?.map((item) => (
                            <tr key={item.rank} className="hover:bg-surface/30 transition-colors">
                              <td className="py-3.5 px-4 text-center">
                                {item.rank === 1 ? (
                                  <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-extrabold flex items-center justify-center mx-auto text-xs shadow-sm">
                                    1
                                  </span>
                                ) : item.rank === 2 ? (
                                  <span className="w-6 h-6 rounded-full bg-slate-400 text-white font-bold flex items-center justify-center mx-auto text-xs">
                                    2
                                  </span>
                                ) : item.rank === 3 ? (
                                  <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center mx-auto text-xs">
                                    3
                                  </span>
                                ) : (
                                  <span className="font-mono text-muted font-medium">#{item.rank}</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-ink text-[13px]">{item.name}</div>
                                <div className="text-[11px] text-muted capitalize">{item.role}</div>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="font-bold text-sm text-ink">{item.score}</span>
                                  <div className="w-14 h-2 bg-surface rounded-full overflow-hidden border border-line">
                                    <div 
                                      className={`h-full rounded-full ${
                                        item.score >= 90 ? "bg-emerald-500" : item.score >= 75 ? "bg-amber-500" : "bg-blue-500"
                                      }`}
                                      style={{ width: `${Math.min(item.score, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                {item.badge ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface border border-line text-ink">
                                    {item.badge}
                                  </span>
                                ) : (
                                  <span className="text-muted text-[11px]">-</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-muted">
                                {item.highlights && item.highlights.length > 0 ? (
                                  <span className="line-clamp-1">{item.highlights[0]}</span>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPerformer(item)}
                                  className="btn btn-secondary h-8 px-2.5 text-[11px] font-semibold"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MATRIX DAY CELL REPORT DETAIL                                      */}
      {/* ========================================================================= */}
      <Dialog.Root open={!!selectedMatrixCell} onOpenChange={(open) => !open && setSelectedMatrixCell(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg bg-paper shadow-2xl rounded-2xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200 border border-line">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
              <div>
                <Dialog.Title className="text-base font-bold text-ink">
                  {selectedMatrixCell?.userName}
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted mt-0.5">
                  {selectedMatrixCell?.date && format(new Date(selectedMatrixCell.date), "EEEE, MMMM do, yyyy")}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-medium">Status:</span>
                {selectedMatrixCell?.status === "submitted" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-3.5 h-3.5" /> Submitted
                  </span>
                )}
                {selectedMatrixCell?.status === "covered" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Catch-Up Credited (In Next Report)
                  </span>
                )}
                {selectedMatrixCell?.status === "leave" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <PlaneTakeoff className="w-3.5 h-3.5" /> Approved Leave (Excused)
                  </span>
                )}
                {selectedMatrixCell?.status === "missed" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <X className="w-3.5 h-3.5" /> Missed Wrap-Up
                  </span>
                )}
                {selectedMatrixCell?.sentiment && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getSentimentColor(selectedMatrixCell.sentiment)}`}>
                    {getSentimentIcon(selectedMatrixCell.sentiment)}
                    {selectedMatrixCell.sentiment}
                  </span>
                )}
              </div>

              {selectedMatrixCell?.snippet && (
                <div className="p-4 bg-surface/50 rounded-xl border border-line">
                  <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Accomplishment Snippet</h4>
                  <p className="text-xs text-ink/90 leading-relaxed whitespace-pre-wrap">
                    {selectedMatrixCell.snippet}
                  </p>
                </div>
              )}

              {selectedMatrixCell?.label && (
                <p className="text-xs text-muted italic">
                  {selectedMatrixCell.label}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMatrixCell(null)}
                className="btn btn-secondary h-9 text-xs px-4"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ========================================================================= */}
      {/* MODAL: PERFORMER AI EVALUATION DETAIL                                     */}
      {/* ========================================================================= */}
      <Dialog.Root open={!!selectedPerformer} onOpenChange={(open) => !open && setSelectedPerformer(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg bg-paper shadow-2xl rounded-2xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200 border border-line">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm border border-amber-500/20">
                  #{selectedPerformer?.rank}
                </div>
                <div>
                  <Dialog.Title className="text-base font-bold text-ink">
                    {selectedPerformer?.name}
                  </Dialog.Title>
                  <p className="text-xs text-muted capitalize">{selectedPerformer?.role}</p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Monthly Performance Score
                  </div>
                  <div className="text-2xl font-black text-ink mt-0.5">
                    {selectedPerformer?.score} <span className="text-xs text-muted font-normal">/ 100</span>
                  </div>
                </div>
                {selectedPerformer?.badge && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
                    {selectedPerformer.badge}
                  </span>
                )}
              </div>

              {selectedPerformer?.highlights && selectedPerformer.highlights.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Key Accomplishments</h4>
                  <ul className="space-y-1.5 text-xs text-ink/90">
                    {selectedPerformer.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-surface/50 border border-line">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedPerformer?.strengths && selectedPerformer.strengths.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Demonstrated Strengths</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPerformer.strengths.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface border border-line text-ink">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPerformer?.feedback && (
                <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                  <h4 className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">
                    AI Growth Tip & Constructive Feedback
                  </h4>
                  <p className="text-xs text-blue-900/90 dark:text-blue-200 leading-relaxed">
                    {selectedPerformer.feedback}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPerformer(null)}
                className="btn btn-secondary h-9 text-xs px-4"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ========================================================================= */}
      {/* MODAL: EDIT DAILY REPORT                                                  */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION                                                */}
      {/* ========================================================================= */}
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

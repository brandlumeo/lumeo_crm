"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Paperclip,
  Plus,
  Search,
  Filter,
  UserCheck,
  CalendarDays,
  ShieldAlert,
  FileText,
  Users,
  User,
  ArrowRight,
  X,
  AlertTriangle,
  HeartPulse,
  Coffee,
  HelpCircle,
} from "lucide-react";
import {
  useLeaves,
  useSubmitLeave,
  useApproveLeave,
  useCurrentUser,
} from "@/lib/queries";
import { cn, getMediaUrl } from "@/lib/utils";
import { LeaveRequest } from "@/lib/types";

const getAvatarTint = (name: string) => {
  const char = name ? name[0].toUpperCase() : "?";
  const tints = [
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-rose-100 text-rose-800 border-rose-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
  ];
  return tints[char.charCodeAt(0) % tints.length];
};

const getLeaveTypeDisplay = (type: string) => {
  switch (type) {
    case "annual":
    case "paid":
      return "Annual Leave";
    case "casual":
      return "Casual Leave";
    case "sick":
      return "Sick / Medical";
    case "half_day":
      return "Half Day";
    case "unpaid":
      return "Unpaid Leave (LOP)";
    default:
      return type;
  }
};

const getLeaveTypeBadgeClass = (type: string) => {
  switch (type) {
    case "sick":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "half_day":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "unpaid":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "casual":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "annual":
    case "paid":
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
};

export default function LeavesPage() {
  const { data: user } = useCurrentUser();
  const isManager = Boolean(user?.has_management_access);

  // Queries
  const { data: myLeaves = [], isLoading: myLeavesLoading } = useLeaves(false);
  const { data: companyLeaves = [], isLoading: companyLeavesLoading } = useLeaves(true);

  const submitLeaveMutation = useSubmitLeave();
  const approveLeaveMutation = useApproveLeave();

  // Active view tab: for managers, default to "all" (All Team Leaves), for regular staff "my"
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Leave Form state
  const [leaveType, setLeaveType] = useState<
    "annual" | "paid" | "sick" | "casual" | "half_day" | "unpaid"
  >("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Review states
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});
  const [payDecisions, setPayDecisions] = useState<Record<string, "paid" | "unpaid">>({});

  // Calculate day difference for the form
  const daysSelected = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // Relevant data based on tab & manager status
  const currentList = useMemo(() => {
    const list = isManager && activeTab === "all" ? companyLeaves : myLeaves;
    return list.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      // Type filter
      if (typeFilter !== "all" && item.leave_type !== typeFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (item.user_full_name || "").toLowerCase().includes(q);
        const emailMatch = (item.user_email || "").toLowerCase().includes(q);
        const reasonMatch = (item.reason || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !reasonMatch) return false;
      }
      return true;
    });
  }, [isManager, activeTab, companyLeaves, myLeaves, statusFilter, typeFilter, searchQuery]);

  // Aggregate stats across company (or personal if regular employee)
  const stats = useMemo(() => {
    const source = isManager ? companyLeaves : myLeaves;
    const pending = source.filter((l) => l.status === "pending").length;
    const approved = source.filter((l) => l.status === "approved").length;
    const sick = source.filter((l) => l.leave_type === "sick").length;
    const unpaid = source.filter((l) => l.pay_status === "unpaid" || l.leave_type === "unpaid").length;
    return { pending, approved, sick, unpaid, total: source.length };
  }, [isManager, companyLeaves, myLeaves]);

  // Submit Handler
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !leaveReason.trim()) {
      toast.error("Please fill in start date, end date, and reason.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    submitLeaveMutation.mutate(
      {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: leaveReason.trim(),
        attachment,
      },
      {
        onSuccess: () => {
          toast.success("Leave request submitted successfully.");
          setLeaveReason("");
          setStartDate("");
          setEndDate("");
          setAttachment(null);
          setShowApplyModal(false);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail ?? "Failed to submit leave request.");
        },
      }
    );
  };

  // Review Handler
  const handleReviewLeave = (
    id: string,
    decision: "approved" | "rejected",
    defaultPayStatus: "paid" | "unpaid" = "paid"
  ) => {
    const decisionPay = payDecisions[id] ?? defaultPayStatus;
    const note = managerNotes[id] ?? "";

    approveLeaveMutation.mutate(
      {
        id,
        payload: {
          status: decision,
          manager_notes: note || undefined,
          pay_status: decisionPay,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Leave request ${decision} successfully.`);
          setManagerNotes((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail ?? "Failed to review leave.");
        },
      }
    );
  };

  const isLoading = isManager && activeTab === "all" ? companyLeavesLoading : myLeavesLoading;

  return (
    <div className="p-6 md:p-8 pb-16 max-w-[1440px] mx-auto flex flex-col gap-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line/60 pb-6">
        <div>
          <div className="text-[12px] font-mono uppercase tracking-wider text-muted mb-1 flex items-center gap-2">
            <span>HR</span>
            <span>/</span>
            <span className="text-ink font-semibold">Leaves &amp; Absence</span>
          </div>
          <h1 className="font-serif text-[28px] md:text-[32px] text-ink font-normal tracking-tight">
            Leave &amp; Absence Management
          </h1>
          <p className="text-[13.5px] text-muted mt-1 max-w-2xl">
            Submit leave applications, track personal time-off balances, and review company-wide team absence requests.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="btn btn-primary self-start md:self-auto h-11 px-5 rounded-lg shadow-sm font-medium flex items-center gap-2 bg-ink text-paper hover:bg-ink/90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div className="card p-5 border border-line bg-paper/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-muted font-medium">
              Pending Approval
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-serif font-medium text-ink">{stats.pending}</div>
            <p className="text-[11.5px] text-muted mt-0.5">
              {isManager ? "Awaiting manager review" : "Your pending requests"}
            </p>
          </div>
          {stats.pending > 0 && (
            <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
          )}
        </div>

        {/* Approved Card */}
        <div className="card p-5 border border-line bg-paper/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-muted font-medium">
              Approved Leaves
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-serif font-medium text-ink">{stats.approved}</div>
            <p className="text-[11.5px] text-muted mt-0.5">Approved time-off records</p>
          </div>
        </div>

        {/* Medical Card */}
        <div className="card p-5 border border-line bg-paper/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-muted font-medium">
              Medical / Sick
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-serif font-medium text-ink">{stats.sick}</div>
            <p className="text-[11.5px] text-muted mt-0.5">Health and sick absences</p>
          </div>
        </div>

        {/* Unpaid / LOP Card */}
        <div className="card p-5 border border-line bg-paper/80 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-mono uppercase tracking-wider text-muted font-medium">
              Loss of Pay (LOP)
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[28px] font-serif font-medium text-ink">{stats.unpaid}</div>
            <p className="text-[11.5px] text-muted mt-0.5">Unpaid leave instances</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-6">
        {/* Navigation Tabs (for Managers/Admins) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/70 pb-3">
          <div className="flex items-center gap-2">
            {isManager && (
              <button
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-4 py-2 text-[13.5px] font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === "all"
                    ? "bg-ink text-paper shadow-xs"
                    : "text-muted hover:text-ink hover:bg-bone"
                )}
              >
                <Users className="w-4 h-4" />
                <span>All Team Leaves</span>
                {companyLeaves.filter((l) => l.status === "pending").length > 0 && (
                  <span className="bg-amber-500 text-white text-[10.5px] font-bold px-2 py-0.2 rounded-full font-mono">
                    {companyLeaves.filter((l) => l.status === "pending").length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab("my")}
              className={cn(
                "px-4 py-2 text-[13.5px] font-medium rounded-lg transition-all flex items-center gap-2 cursor-pointer",
                activeTab === "my"
                  ? "bg-ink text-paper shadow-xs"
                  : "text-muted hover:text-ink hover:bg-bone"
              )}
            >
              <User className="w-4 h-4" />
              <span>My Leaves</span>
              {myLeaves.length > 0 && (
                <span className="text-[11px] font-mono text-muted">
                  ({myLeaves.length})
                </span>
              )}
            </button>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isManager && activeTab === "all" ? "Search staff name, email, reason..." : "Search reason..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 pr-3 py-1.5 text-xs w-full bg-bone-2 border border-line rounded-lg focus:outline-none focus:border-accent placeholder:text-muted/60"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs py-1.5 px-3 bg-bone-2 border border-line rounded-lg font-medium text-ink focus:outline-none focus:border-accent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="select text-xs py-1.5 px-3 bg-bone-2 border border-line rounded-lg font-medium text-ink focus:outline-none focus:border-accent"
            >
              <option value="all">All Types</option>
              <option value="annual">Annual Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick / Medical</option>
              <option value="half_day">Half Day</option>
              <option value="unpaid">Unpaid Leave (LOP)</option>
            </select>
          </div>
        </div>

        {/* Leaves List */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="card h-24 bg-bone-2/50 animate-pulse rounded-lg border border-line" />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="card p-12 text-center border border-line border-dashed bg-bone/40 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-bone-2 flex items-center justify-center text-muted border border-line">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-[18px] text-ink font-medium">No leave requests found</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "No leaves match your active filters. Try adjusting your search or filters."
                  : activeTab === "all"
                  ? "There are currently no leave requests recorded for your company."
                  : "You haven't submitted any leave requests yet."}
              </p>
            </div>
            <button
              onClick={() => setShowApplyModal(true)}
              className="btn btn-outline text-xs mt-2 font-medium"
            >
              Apply for Leave
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {currentList.map((leave) => {
              const defaultPay = leave.leave_type === "unpaid" ? "unpaid" : "paid";
              const currentDecision = payDecisions[leave.id] ?? defaultPay;
              const isPending = leave.status === "pending";

              return (
                <div
                  key={leave.id}
                  className={cn(
                    "card p-5 border rounded-xl bg-paper transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5",
                    isPending
                      ? "border-amber-300/80 shadow-xs bg-amber-50/10"
                      : "border-line hover:border-line-2"
                  )}
                >
                  {/* Left Column: Staff Info & Leave Details */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* User Avatar */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0",
                        getAvatarTint(leave.user_full_name || leave.user_email || "?")
                      )}
                    >
                      {(leave.user_full_name || leave.user_email || "?")[0].toUpperCase()}
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5">
                      {/* Name, Email, Leave Type, Pay Status */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-[14px] text-ink">
                          {leave.user_full_name || "Team Member"}
                        </span>
                        <span className="text-muted text-xs font-mono">
                          {leave.user_email}
                        </span>

                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border",
                            getLeaveTypeBadgeClass(leave.leave_type)
                          )}
                        >
                          {getLeaveTypeDisplay(leave.leave_type)}
                        </span>

                        {leave.status === "approved" && (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                              leave.pay_status === "unpaid"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}
                          >
                            {leave.pay_status === "unpaid" ? "Unpaid (LOP)" : "Paid"}
                          </span>
                        )}
                      </div>

                      {/* Dates & Duration */}
                      <div className="flex items-center gap-2 text-xs text-ink/80 font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-muted" />
                        <span>
                          {leave.start_date === leave.end_date
                            ? leave.start_date
                            : `${leave.start_date} → ${leave.end_date}`}
                        </span>
                      </div>

                      {/* Reason */}
                      {leave.reason && (
                        <p className="text-xs text-muted italic bg-bone/40 p-2 rounded-md border border-line/40 max-w-2xl">
                          "{leave.reason}"
                        </p>
                      )}

                      {/* Attachment & Manager Notes */}
                      <div className="flex items-center gap-4 flex-wrap mt-0.5">
                        {leave.attachment && (
                          <a
                            href={getMediaUrl(leave.attachment)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-blue-700 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100/70 px-2.5 py-1 rounded-md border border-blue-200/80 transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>View Supporting Document</span>
                          </a>
                        )}

                        {leave.approved_by_name && (
                          <span className="text-[11px] text-muted">
                            Reviewed by <strong>{leave.approved_by_name}</strong>
                          </span>
                        )}

                        {leave.manager_notes && (
                          <span className="text-[11px] text-ink-2 bg-bone px-2 py-0.5 rounded border border-line">
                            <strong>Note:</strong> {leave.manager_notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Status Badge or Review Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 self-end lg:self-center">
                    {/* If Pending and User is Manager in "All Team Leaves" tab: show quick review desk */}
                    {isPending && isManager && activeTab === "all" ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-paper p-2.5 rounded-lg border border-line shadow-xs">
                        {/* Segmented Paid / Unpaid */}
                        <div className="flex items-center bg-bone p-0.5 rounded-md border border-line text-xs font-medium">
                          <button
                            type="button"
                            onClick={() =>
                              setPayDecisions((prev) => ({ ...prev, [leave.id]: "paid" }))
                            }
                            className={cn(
                              "px-2.5 py-1 rounded transition-all cursor-pointer font-semibold",
                              currentDecision === "paid"
                                ? "bg-emerald-700 text-white shadow-xs"
                                : "text-muted hover:text-ink"
                            )}
                          >
                            Paid
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPayDecisions((prev) => ({ ...prev, [leave.id]: "unpaid" }))
                            }
                            className={cn(
                              "px-2.5 py-1 rounded transition-all cursor-pointer font-semibold",
                              currentDecision === "unpaid"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-muted hover:text-ink"
                            )}
                          >
                            Unpaid (LOP)
                          </button>
                        </div>

                        {/* Note Input */}
                        <input
                          type="text"
                          placeholder="Review note..."
                          value={managerNotes[leave.id] || ""}
                          onChange={(e) =>
                            setManagerNotes({
                              ...managerNotes,
                              [leave.id]: e.target.value,
                            })
                          }
                          className="input h-8 text-xs w-36 bg-bone-2 border-line"
                        />

                        {/* Approve Button */}
                        <button
                          onClick={() => handleReviewLeave(leave.id, "approved", defaultPay)}
                          disabled={approveLeaveMutation.isPending}
                          className="btn h-8 px-3 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer transition-all shadow-xs"
                        >
                          Approve
                        </button>

                        {/* Reject Button */}
                        <button
                          onClick={() => handleReviewLeave(leave.id, "rejected", defaultPay)}
                          disabled={approveLeaveMutation.isPending}
                          className="btn h-8 px-3 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded cursor-pointer transition-all shadow-xs"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      /* Status Pill */
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full border shadow-2xs",
                            leave.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : leave.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {leave.status === "approved" && (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {leave.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                          {leave.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                          <span className="capitalize">{leave.status}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply for Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="card p-6 md:p-8 bg-paper border border-line rounded-2xl w-full max-w-xl shadow-2xl relative flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-[20px] font-medium text-ink">
                    Apply for Absence / Leave
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Submit your leave request for management approval.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-bone flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleLeaveSubmit} className="flex flex-col gap-4">
              {/* Leave Type */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-ink">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="select w-full bg-bone-2 text-sm"
                  required
                >
                  <option value="annual">Annual Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="sick">Medical / Sick Leave</option>
                  <option value="half_day">Half Day Leave</option>
                  <option value="unpaid">Unpaid Leave (Loss of Pay / LOP)</option>
                </select>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-medium text-ink">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input w-full bg-bone-2 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12.5px] font-medium text-ink">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input w-full bg-bone-2 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Days duration badge */}
              {daysSelected !== null && (
                <div className="text-[12px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Duration: <strong>{daysSelected}</strong> calendar day{daysSelected > 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-ink">
                  Reason for Absence
                </label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Describe the reason for leave (medical, family, travel...)"
                  className="textarea w-full bg-bone-2 text-sm"
                />
              </div>

              {/* Supporting Document */}
              <div className="space-y-1.5">
                <label className="text-[12.5px] font-medium text-ink flex items-center justify-between">
                  <span>Supporting Document (Optional)</span>
                  <span className="text-[11px] text-muted">Max 5MB</span>
                </label>
                <div className="border border-line border-dashed rounded-lg p-3 bg-bone/30 hover:bg-bone/60 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Paperclip className="w-4 h-4 text-accent" />
                    <span>{attachment ? attachment.name : "Click to upload medical certificate or proof"}</span>
                  </div>
                  <input
                    type="file"
                    id="leave-attachment"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="leave-attachment"
                    className="btn btn-outline text-xs px-3 py-1 cursor-pointer"
                  >
                    {attachment ? "Change" : "Browse"}
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="btn btn-outline text-xs px-4 h-9"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLeaveMutation.isPending}
                  className="btn btn-primary text-xs px-5 h-9 bg-ink text-paper hover:bg-ink/90 flex items-center gap-2 cursor-pointer"
                >
                  {submitLeaveMutation.isPending ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

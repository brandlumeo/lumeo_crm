"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Coffee,
  CheckCircle,
  FileText,
  MapPin,
  Calendar,
  AlertCircle,
  UserCheck,
  Users,
  Play,
  LogOut,
  Paperclip,
} from "lucide-react";
import {
  useAttendanceStatus,
  usePunchIn,
  usePunchOut,
  useStartBreak,
  useEndBreak,
  useShiftHistory,
  useLeaves,
  useSubmitLeave,
  useApproveLeave,
  useCurrentUser,
} from "@/lib/queries";
import {
  cn,
  formatLongDate,
  formatCompactINR,
  getMediaUrl,
} from "@/lib/utils";

export default function AttendancePage() {
  const { data: user } = useCurrentUser();
  const { data: status, isLoading: statusLoading } = useAttendanceStatus();
  const { data: history = [], isLoading: historyLoading } = useShiftHistory();
  const { data: leaves = [], isLoading: leavesLoading } = useLeaves();
  const { data: companyLeaves = [], isLoading: companyLeavesLoading } = useLeaves(true); // for managers


  const punchInMutation = usePunchIn();
  const punchOutMutation = usePunchOut();
  const startBreakMutation = useStartBreak();
  const endBreakMutation = useEndBreak();
  const submitLeaveMutation = useSubmitLeave();
  const approveLeaveMutation = useApproveLeave();

  // Component states
  const [mounted, setMounted] = useState(false);
  const [workLocation, setWorkLocation] = useState<"office" | "wfh" | "onsite" | "field">("office");
  const [notes, setNotes] = useState("");
  const [breakReason, setBreakReason] = useState("");

  // Leave Form states
  const [leaveType, setLeaveType] = useState<"paid" | "sick" | "casual" | "unpaid">("paid");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Manager Approval Note states
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
  };

  if (!mounted || statusLoading) {
    return (
      <div className="p-7 pb-16 max-w-[1400px]">
        <div className="flex flex-col gap-8">
           <div className="h-10 bg-bone-2 rounded-lg w-1/4 animate-pulse" />
           <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
             <div className="card h-[320px] bg-bone-2/30 animate-pulse" />
             <div className="card h-[320px] bg-bone-2/30 animate-pulse" />
           </div>
        </div>
      </div>
    );
  }

  const isManager = user?.role === "owner" || user?.role === "admin";

  // Punch actions
  const handlePunchIn = () => {
    // Audit location telemetry optional capture
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          punchInMutation.mutate({
            work_location: workLocation,
            notes: notes || undefined,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setNotes("");
        },
        () => {
          punchInMutation.mutate({
            work_location: workLocation,
            notes: notes || undefined,
          });
          setNotes("");
        }
      );
    } else {
      punchInMutation.mutate({
        work_location: workLocation,
        notes: notes || undefined,
      });
      setNotes("");
    }
  };

  const handlePunchOut = () => {
    punchOutMutation.mutate({
      notes: notes || undefined,
    });
    setNotes("");
  };

  const handleStartBreak = () => {
    startBreakMutation.mutate({ reason: breakReason || undefined });
    setBreakReason("");
  };

  const handleEndBreak = () => {
    endBreakMutation.mutate();
  };

  // Leave Form Submit
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !leaveReason.trim()) {
      toast.error("All fields are required.");
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
        reason: leaveReason,
        attachment: attachment || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Leave request submitted successfully.");
          setStartDate("");
          setEndDate("");
          setLeaveReason("");
          setAttachment(null);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail ?? "Failed to submit leave claim.");
        },
      }
    );
  };

  // Manager Approve/Reject
  const handleReviewLeave = (id: string, decision: "approved" | "rejected") => {
    approveLeaveMutation.mutate({
      id,
      payload: {
        status: decision,
        manager_notes: managerNotes[id] || undefined,
      },
    });
  };

  // Duration Helper
  const calcDuration = (inTime: string, outTime: string | null) => {
    if (!outTime) return "Ongoing";
    const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const calcBreakDuration = (breaks?: any[]) => {
    if (!breaks || breaks.length === 0) return "—";
    let totalMs = 0;
    breaks.forEach((b) => {
      const start = new Date(b.start_time).getTime();
      const end = b.end_time ? new Date(b.end_time).getTime() : Date.now();
      totalMs += (end - start);
    });
    const mins = Math.round(totalMs / 60000);
    if (mins === 0) return "< 1m";
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="p-7 pb-16 max-w-[1400px] flex flex-col gap-8 animate-rise">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[32px] tracking-tight">Attendance & Absence</h1>
        <p className="text-[13.5px] text-muted">
          Manage shifts, register work-from-home options, capture breaks, and track personal absences.
        </p>
      </div>

      {/* Grid: Toggles & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        
        {/* Attendance Console */}
        <div className="card p-6 flex flex-col gap-5 border border-line bg-paper">
          <div className="flex items-center gap-2 border-b border-line-2 pb-4">
            <Clock className="w-5 h-5 text-ink-2" />
            <h2 className="font-serif text-[20px]">Shift Controller</h2>
          </div>

          {!status?.is_clocked_in ? (
            /* CLOCKED OUT STATE */
            <div className="flex flex-col gap-4">
              <div className="bg-bone border border-line rounded-lg p-5 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase tracking-wider text-muted font-medium">Work Location</label>
                    <select
                      value={workLocation}
                      onChange={(e) => setWorkLocation(e.target.value as any)}
                      className="bg-paper border border-line rounded-md px-3 py-2 text-[13px] text-ink focus:border-ink outline-none"
                    >
                      <option value="office">🏢 Office</option>
                      <option value="wfh">🏠 Work From Home</option>
                      <option value="onsite">🚜 On-site Client</option>
                      <option value="field">🚗 Field / Travel</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase tracking-wider text-muted font-medium">Duty Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="bg-paper border border-line rounded-md px-3 py-2 text-[13px] text-ink focus:border-ink outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handlePunchIn}
                disabled={punchInMutation.isPending}
                className="w-full bg-ink hover:opacity-90 text-paper py-3 rounded-lg text-sm font-medium transition-all"
              >
                {punchInMutation.isPending ? "PUNCHING IN..." : "PUNCH IN SHIFT"}
              </button>
            </div>
          ) : (
            /* CLOCKED IN STATE */
            <div className="flex flex-col gap-6">
              <div className="relative bg-gradient-to-b from-bone/50 to-bone/10 border border-line rounded-2xl p-8 flex flex-col items-center justify-center gap-5 text-center shadow-inner overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col items-center gap-2 z-10">
                  <div className="flex items-center gap-2.5 px-3 py-1 bg-white rounded-full border border-line shadow-sm mb-2">
                    <span className={cn("w-2 h-2 rounded-full shadow-sm", status.is_on_break ? "bg-gold animate-pulse" : "bg-emerald-500 animate-pulse")} />
                    <span className="text-[10px] uppercase tracking-widest text-ink-2 font-semibold">
                      {status.is_on_break ? "Currently On Break" : "Active Shift Running"}
                    </span>
                  </div>

                  <span className="text-[11px] uppercase tracking-widest text-muted font-medium mt-2">Clocked In At</span>
                  <div className="font-serif text-[56px] leading-[1] text-ink select-none tracking-tight text-shadow-sm">
                    {formatTime(status.active_log?.clock_in)}
                  </div>
                  {status.is_on_break && (
                    <div className="text-[12px] text-gold font-medium mt-1">
                      Break started at: {formatTime(status.active_break?.start_time)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-line/50 px-4 py-1.5 rounded-full text-[12px] text-ink-2 font-medium z-10">
                  <MapPin className="w-3.5 h-3.5 text-muted" />
                  <span>Logged in via <strong className="text-ink tracking-wide uppercase">{status.active_log?.work_location}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Break control */}
                {!status.is_on_break ? (
                  <div className="flex flex-col gap-2 border border-line rounded-lg p-3 bg-bone/40">
                    <input
                      type="text"
                      placeholder="Break details (e.g. Lunch)"
                      value={breakReason}
                      onChange={(e) => setBreakReason(e.target.value)}
                      className="bg-paper border border-line rounded px-2.5 py-1.5 text-xs focus:border-ink outline-none"
                    />
                    <button
                      onClick={handleStartBreak}
                      disabled={startBreakMutation.isPending}
                      className="bg-paper border border-line hover:bg-bone-2 text-ink py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Coffee className="w-3.5 h-3.5 text-muted" />
                      Take Break
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 justify-end border border-line rounded-lg p-3 bg-gold/5">
                    <p className="text-[11px] text-muted select-none italic text-center mb-1">
                      Reason: "{status.active_break?.reason ?? "Not specified"}"
                    </p>
                    <button
                      onClick={handleEndBreak}
                      disabled={endBreakMutation.isPending}
                      className="bg-ink text-paper hover:opacity-90 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Resume Shift
                    </button>
                  </div>
                )}

                {/* Clock Out */}
                <div className="flex flex-col gap-2 border border-line rounded-lg p-3 bg-bone/40">
                  <input
                    type="text"
                    placeholder="Sign-off notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-paper border border-line rounded px-2.5 py-1.5 text-xs focus:border-ink outline-none"
                  />
                  <button
                    onClick={handlePunchOut}
                    disabled={punchOutMutation.isPending}
                    className="bg-accent hover:opacity-95 text-white py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Punch Out Shift
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leaves Balance & Request Form */}
        <div className="card p-6 flex flex-col gap-5 border border-line bg-paper">
          <div className="flex items-center gap-2 border-b border-line-2 pb-4">
            <Calendar className="w-5 h-5 text-ink-2" />
            <h2 className="font-serif text-[20px]">Absence Request</h2>
          </div>

          <form onSubmit={handleLeaveSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="bg-bone border border-line rounded px-2.5 py-2 text-[12.5px] text-ink outline-none"
                >
                  <option value="paid">Paid Annual</option>
                  <option value="sick">Sick / Medical</option>
                  <option value="casual">Casual Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Reason</label>
                <input
                  type="text"
                  placeholder="Medical, family..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="bg-bone border border-line rounded px-2.5 py-2 text-[12.5px] text-ink outline-none focus:border-ink"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-bone border border-line rounded px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-bone border border-line rounded px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-ink"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <label className="text-[11px] uppercase tracking-wider text-muted font-medium flex items-center justify-between">
                <span>Supporting Document (Optional)</span>
                <span className="text-[9px] text-muted/60 lowercase tracking-normal">max 5mb</span>
              </label>
              <label className="border border-dashed border-line-2 hover:border-ink/50 hover:bg-bone-2 transition-all cursor-pointer rounded-lg p-4 flex flex-col items-center justify-center gap-2 group bg-bone/30">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setAttachment(file);
                  }}
                />
                <Paperclip className={`w-5 h-5 transition-colors ${attachment ? 'text-emerald-600' : 'text-muted group-hover:text-ink-2'}`} strokeWidth={1.5} />
                <span className={`text-[12px] font-medium text-center ${attachment ? 'text-emerald-700' : 'text-muted group-hover:text-ink'}`}>
                  {attachment ? attachment.name : "Click to upload medical sheet or proof"}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitLeaveMutation.isPending}
              className="btn btn-primary w-full mt-1"
            >
              {submitLeaveMutation.isPending ? "SUBMITTING..." : "SUBMIT LEAVE APPLICATION"}
            </button>
          </form>
        </div>
      </div>

      {/* Manager Leave Approval panel */}
      {isManager && companyLeaves.some((l) => l.status === "pending") && (
        <div className="card p-6 border border-line bg-paper flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-line-2 pb-3">
            <UserCheck className="w-5 h-5 text-accent" />
            <h2 className="font-serif text-[20px]">Company Absence Requests Approval Desk</h2>
          </div>

          <div className="flex flex-col gap-3.5">
            {companyLeaves
              .filter((l) => l.status === "pending")
              .map((leave) => (
                <div key={leave.id} className="border border-line rounded-lg p-4 bg-bone flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13.5px]">{leave.user_full_name}</span>
                      <span className="text-muted text-xs font-mono">({leave.user_email})</span>
                      <span className="text-[10px] uppercase font-bold bg-ink text-paper px-2 py-0.5 rounded-full font-mono">
                        {leave.leave_type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-ink-2 mt-0.5 leading-snug">
                      <strong>Dates</strong>: {leave.start_date} to {leave.end_date}
                    </p>
                    <p className="text-xs text-ink-2 italic">
                      <strong>Reason</strong>: "{leave.reason}"
                    </p>
                    {leave.attachment && (
                      <div className="mt-1">
                        <a href={getMediaUrl(leave.attachment)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors border border-emerald-200">
                          <Paperclip className="w-3 h-3" />
                          View Supporting Document
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      placeholder="Review notes..."
                      value={managerNotes[leave.id] || ""}
                      onChange={(e) =>
                        setManagerNotes({ ...managerNotes, [leave.id]: e.target.value })
                      }
                      className="bg-paper border border-line rounded px-2.5 py-1.5 text-xs outline-none focus:border-ink w-[180px]"
                    />
                    <button
                      onClick={() => handleReviewLeave(leave.id, "approved")}
                      disabled={approveLeaveMutation.isPending}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded text-xs font-semibold transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewLeave(leave.id, "rejected")}
                      disabled={approveLeaveMutation.isPending}
                      className="bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded text-xs font-semibold transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}


      {/* Double Column: History lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Leave History */}
        <div className="card p-0 border border-line bg-paper flex flex-col gap-0">
          <div className="card-head">
            <h2 className="card-title">
              <FileText className="w-4 h-4 text-ink-2" />
              My Leave Requests
            </h2>
          </div>

          <div className="overflow-x-auto p-0">
            {leavesLoading ? (
              <p className="text-xs text-muted">Loading leave logs...</p>
            ) : leaves.length === 0 ? (
              <p className="text-xs text-muted italic">No leave applications lodged yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider">
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Dates</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Manager Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l.id} className="border-b border-line-2 last:border-0 table-row-hover">
                      <td className="py-3 px-4 font-medium capitalize font-mono text-[11px]">{l.leave_type}</td>
                      <td className="py-2.5 text-muted">
                        {l.start_date} to {l.end_date}
                        {l.attachment && (
                          <div className="mt-1">
                            <a href={getMediaUrl(l.attachment)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline">
                              <Paperclip className="w-3 h-3" /> Document Attached
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            l.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : l.status === "rejected"
                              ? "bg-red-50 text-red-800 border border-red-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          )}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted italic">{l.manager_notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Shifts Logs */}
        <div className="card p-0 border border-line bg-paper flex flex-col gap-0">
          <div className="card-head">
            <h2 className="card-title">
              <Clock className="w-4 h-4 text-ink-2" />
              Recent Shift Telemetry
            </h2>
          </div>

          <div className="overflow-x-auto p-0">
            {historyLoading ? (
              <p className="text-xs text-muted">Loading shifts...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted italic">No shifts recorded yet.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider">
                    <th className="py-2 font-medium">Shift Date</th>
                    <th className="py-2 font-medium">Location</th>
                    <th className="py-2 font-medium">Timestamps</th>
                    <th className="py-2 font-medium">Break Time</th>
                    <th className="py-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((log) => (
                    <tr key={log.id} className="border-b border-line-2 last:border-0 table-row-hover">
                      <td className="py-3 px-4 font-medium">{formatLongDate(new Date(log.clock_in))}</td>
                      <td className="py-2.5 capitalize font-mono text-[11px]">{log.work_location}</td>
                      <td className="py-2.5 text-muted leading-tight">
                        In: {new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {log.clock_out && (
                          <>
                            <br />
                            Out: {new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </>
                        )}
                      </td>
                      <td className="py-2.5 font-mono text-muted">{calcBreakDuration(log.breaks)}</td>
                      <td className="py-2.5 font-semibold text-ink-2">
                        {calcDuration(log.clock_in, log.clock_out)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

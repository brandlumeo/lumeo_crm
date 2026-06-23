"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Timer, Loader2, CheckCircle, XCircle, Shield, 
  IndianRupee, Keyboard, BellRing, Clock, MailCheck, Check
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function TimeLogSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [requireTimeLogApproval, setRequireTimeLogApproval] = useState(company?.require_time_log_approval ?? false);
  const [allowManualTimeEntry, setAllowManualTimeEntry] = useState(company?.allow_manual_time_entry ?? true);
  const [defaultBillableRate, setDefaultBillableRate] = useState(company?.default_billable_rate?.toString() ?? "0.00");
  const [stopTimerAfterShift, setStopTimerAfterShift] = useState(company?.timelog_stop_timer_after_shift ?? false);
  const [sendTrackerReminders, setSendTrackerReminders] = useState(company?.timelog_send_tracker_reminders ?? false);
  const [sendDailyReport, setSendDailyReport] = useState(company?.timelog_send_daily_report ?? false);
  const [reportRoles, setReportRoles] = useState<string[]>(company?.timelog_report_roles || []);

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Time log settings updated successfully." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update time log settings. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-teal-600/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const handleToggleRole = (roleId: string) => {
    if (!isAdmin) return;
    const updatedRoles = reportRoles.includes(roleId)
      ? reportRoles.filter(r => r !== roleId)
      : [...reportRoles, roleId];
    setReportRoles(updatedRoles);
  };

  const handleSave = () => {
    mutation.mutate({
      require_time_log_approval: requireTimeLogApproval,
      allow_manual_time_entry: allowManualTimeEntry,
      default_billable_rate: defaultBillableRate,
      timelog_stop_timer_after_shift: stopTimerAfterShift,
      timelog_send_tracker_reminders: sendTrackerReminders,
      timelog_send_daily_report: sendDailyReport,
      timelog_report_roles: reportRoles
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center border border-teal-500/20 shadow-inner shrink-0">
            <Timer className="w-7 h-7 text-teal-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1 font-serif">Time Log Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure how timesheets, daily work hours, automatic reminders, and email reports are scheduled and governed.
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="btn bg-ink hover:bg-ink-2 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-medium flex items-center gap-2 shrink-0 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can modify time log settings.</span>
        </div>
      )}

      {msg && (
        <div className={cn(
          "flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise",
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        )}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
          {msg.text}
        </div>
      )}

      <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 via-emerald-500 to-green-500"></div>
        
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          
          {/* Section: Timesheet Approvals & Toggles */}
          <div>
            <h4 className="text-[14px] font-bold uppercase tracking-wider text-muted mb-4">Timesheet Policies</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Require Timesheet Approval Toggle */}
              <div className="flex items-center justify-between p-4 border border-line bg-bone/20 rounded-xl hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-[13.5px] font-semibold text-ink block">Require Timesheet Approval</label>
                    <span className="text-[11.5px] text-muted block mt-0.5">Managers must approve hours to make them billable</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={requireTimeLogApproval}
                    disabled={!isAdmin || mutation.isPending}
                    onChange={(e) => setRequireTimeLogApproval(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 shadow-inner"></div>
                </label>
              </div>

              {/* Allow Manual Time Entry */}
              <div className="flex items-center justify-between p-4 border border-line bg-bone/20 rounded-xl hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                    <Keyboard className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-[13.5px] font-semibold text-ink block">Allow Manual Entry</label>
                    <span className="text-[11.5px] text-muted block mt-0.5">Allow employees to log past hours manually</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={allowManualTimeEntry}
                    disabled={!isAdmin || mutation.isPending}
                    onChange={(e) => setAllowManualTimeEntry(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600 peer-checked:border-teal-600 shadow-inner"></div>
                </label>
              </div>

            </div>
          </div>

          {/* Section: Automation & Reminders */}
          <div>
            <h4 className="text-[14px] font-bold uppercase tracking-wider text-muted mb-4">Automation & Notification Reminders</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Stop Timer Automatically after Shift */}
              <div className="flex items-center justify-between p-4 border border-line bg-bone/20 rounded-xl hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-[13.5px] font-semibold text-ink block">Auto-Stop Timer</label>
                    <span className="text-[11.5px] text-muted block mt-0.5">Stop timesheet timer automatically after shift end time</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={stopTimerAfterShift}
                    disabled={!isAdmin || mutation.isPending}
                    onChange={(e) => setStopTimerAfterShift(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500 shadow-inner"></div>
                </label>
              </div>

              {/* Send Tracker Reminders */}
              <div className="flex items-center justify-between p-4 border border-line bg-bone/20 rounded-xl hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-[13.5px] font-semibold text-ink block">Time Tracker Reminders</label>
                    <span className="text-[11.5px] text-muted block mt-0.5">Send alerts if employees forget to turn on tracker</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={sendTrackerReminders}
                    disabled={!isAdmin || mutation.isPending}
                    onChange={(e) => setSendTrackerReminders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500 shadow-inner"></div>
                </label>
              </div>

            </div>
          </div>

          {/* Section: Rates and Daily Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            
            {/* Default Billable Rate */}
            <div className="space-y-2">
              <label className="text-[13.5px] font-semibold text-ink flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-muted" /> Default Billable Rate / Hour
              </label>
              <div className="relative max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="text-muted font-medium">₹</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultBillableRate}
                  onChange={(e) => setDefaultBillableRate(e.target.value)}
                  disabled={!isAdmin}
                  className="input w-full h-11 pl-8 bg-bone/30 focus:bg-white font-mono text-sm"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted/80">Default rupee value charged per tracked hour.</p>
            </div>

            {/* Daily report toggle */}
            <div className="flex flex-col justify-end">
              <div className="flex items-center justify-between p-4 border border-line bg-bone/20 rounded-xl hover:bg-white transition-colors max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <MailCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-[13.5px] font-semibold text-ink block">Send Daily Timelog Report</label>
                    <span className="text-[11.5px] text-muted block mt-0.5">Send a digest report of logged hours daily</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
                  <input
                    type="checkbox"
                    checked={sendDailyReport}
                    disabled={!isAdmin || mutation.isPending}
                    onChange={(e) => setSendDailyReport(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500 peer-checked:border-rose-500 shadow-inner"></div>
                </label>
              </div>
            </div>

          </div>

          {/* Section: Email Report Roles Selection */}
          {sendDailyReport && (
            <div className="space-y-3 pt-4 border-t border-line animate-rise">
              <div>
                <label className="text-[13.5px] font-semibold text-ink block">Choose Roles for Daily Email Report</label>
                <p className="text-xs text-muted mt-0.5">Logged hours summary report will be emailed to members belonging to these selected workspace roles.</p>
              </div>

              {/* Roles Badges Multi-select */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                {company.roles?.map((role: any) => {
                  const isSelected = reportRoles.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleToggleRole(role.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                        isSelected 
                          ? "bg-teal-50 border-teal-200 text-teal-800 shadow-sm" 
                          : "bg-white hover:bg-bone/40 border-line text-muted"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                      {role.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
        
        <div className="bg-bone/40 px-8 py-4 border-t border-line mt-auto flex items-center justify-between">
          <div className="text-[12.5px] text-muted flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
            Timesheet guidelines standardize global billable hours and workflow reports.
          </div>
        </div>
      </div>
    </div>
  );
}

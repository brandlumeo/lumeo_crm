"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CheckSquare, Loader2, CheckCircle, XCircle, Shield, 
  BellRing, Eye, Settings2, Sliders, Check
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

const CLIENT_VISIBLE_FIELDS = [
  { id: "task_category", label: "Task Category" },
  { id: "project", label: "Project" },
  { id: "start_date", label: "Start Date" },
  { id: "due_date", label: "Due Date" },
  { id: "assigned_to", label: "Assigned To" },
  { id: "description", label: "Description" },
  { id: "label", label: "Label" },
  { id: "assigned_by", label: "Assigned By" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "make_private", label: "Make Private" },
  { id: "time_estimate", label: "Time Estimate" },
  { id: "comment", label: "Comment" },
  { id: "add_file", label: "Add File" },
  { id: "sub_task", label: "Sub Task" },
  { id: "timesheet", label: "Timesheet" },
  { id: "notes", label: "Notes" },
  { id: "history", label: "History" },
  { id: "hours_logged", label: "Hours Logged" },
  { id: "custom_fields", label: "Custom Fields" },
  { id: "copy_task_link", label: "Copy Task Link" },
];

export function TaskSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [taskDefaultPriority, setTaskDefaultPriority] = useState(company?.task_default_priority ?? "medium");
  const [taskRequireDueDate, setTaskRequireDueDate] = useState(company?.task_require_due_date ?? false);
  const [taskAllowSubtasks, setTaskAllowSubtasks] = useState(company?.task_allow_subtasks ?? true);
  const [taskAutoAssignCreator, setTaskAutoAssignCreator] = useState(company?.task_auto_assign_creator ?? true);

  const [reminderBeforeDays, setReminderBeforeDays] = useState(company?.task_reminder_before_days ?? 0);
  const [reminderOnDueDay, setReminderOnDueDay] = useState(company?.task_reminder_on_due_day ?? true);
  const [reminderAfterDays, setReminderAfterDays] = useState(company?.task_reminder_after_days ?? 0);
  const [defaultStatusFilter, setDefaultStatusFilter] = useState(company?.task_default_status_filter ?? "incomplete");
  const [boardDefaultLength, setBoardDefaultLength] = useState(company?.task_board_default_length ?? 10);
  const [clientVisibleFields, setClientVisibleFields] = useState<Record<string, boolean>>(
    company?.task_client_visible_fields || {
      task_category: true,
      project: true,
      start_date: true,
      due_date: true,
      assigned_to: true,
      description: true,
      label: true,
      assigned_by: true,
      status: true,
      priority: true,
      make_private: true,
      time_estimate: true,
      comment: true,
      add_file: true,
      sub_task: true,
      timesheet: true,
      notes: true,
      history: true,
      hours_logged: true,
      custom_fields: true,
      copy_task_link: true,
    }
  );

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Task settings saved successfully." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to save task settings. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-600/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const handleToggleClientField = (fieldId: string) => {
    if (!isAdmin) return;
    setClientVisibleFields(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const handleSave = () => {
    mutation.mutate({
      task_default_priority: taskDefaultPriority,
      task_require_due_date: taskRequireDueDate,
      task_allow_subtasks: taskAllowSubtasks,
      task_auto_assign_creator: taskAutoAssignCreator,
      task_reminder_before_days: Number(reminderBeforeDays),
      task_reminder_on_due_day: reminderOnDueDay,
      task_reminder_after_days: Number(reminderAfterDays),
      task_default_status_filter: defaultStatusFilter,
      task_board_default_length: Number(boardDefaultLength),
      task_client_visible_fields: clientVisibleFields,
    });
  };

  const priorities = [
    { id: "low", label: "Low", color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200", ring: "ring-blue-400" },
    { id: "medium", label: "Medium", color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200", ring: "ring-amber-400" },
    { id: "high", label: "High", color: "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200", ring: "ring-orange-400" },
    { id: "urgent", label: "Urgent", color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200", ring: "ring-red-400" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center border border-violet-500/20 shadow-inner shrink-0">
            <CheckSquare className="w-7 h-7 text-violet-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1 font-serif">Task Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure your team's task workflow, reminder alerts, board rules, and client visibility policies.
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
          <span className="font-medium">Read-only mode: Only Workspace Owners and Admins can modify task settings.</span>
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

      {/* Main Card */}
      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-400" />

        <div className="p-6 sm:p-8 space-y-10 pt-9">

          {/* Section: Task Reminders */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-muted mb-5 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-violet-500" /> Send Reminders
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Reminder Before Days */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Send reminder before due date</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={reminderBeforeDays}
                    onChange={(e) => setReminderBeforeDays(Number(e.target.value))}
                    disabled={!isAdmin}
                    className="input w-full h-11 pr-16 text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-muted">
                    Days
                  </div>
                </div>
                <p className="text-[11px] text-muted">Days prior to due date to dispatch reminder</p>
              </div>

              {/* Reminder On Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Reminder on day of due date</label>
                <div className="flex gap-2 h-11 items-center">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setReminderOnDueDay(true)}
                    className={cn(
                      "flex-1 h-full rounded-xl border text-xs font-semibold transition-all",
                      reminderOnDueDay 
                        ? "bg-violet-50 border-violet-300 text-violet-800" 
                        : "bg-bone/10 border-line text-muted hover:bg-bone/30"
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setReminderOnDueDay(false)}
                    className={cn(
                      "flex-1 h-full rounded-xl border text-xs font-semibold transition-all",
                      !reminderOnDueDay 
                        ? "bg-violet-50 border-violet-300 text-violet-800" 
                        : "bg-bone/10 border-line text-muted hover:bg-bone/30"
                    )}
                  >
                    No
                  </button>
                </div>
                <p className="text-[11px] text-muted">Send alert notification on due date</p>
              </div>

              {/* Reminder After Days */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Send reminder after due date</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={reminderAfterDays}
                    onChange={(e) => setReminderAfterDays(Number(e.target.value))}
                    disabled={!isAdmin}
                    className="input w-full h-11 pr-16 text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-muted">
                    Days
                  </div>
                </div>
                <p className="text-[11px] text-muted">Send alerts for overdue items</p>
              </div>

            </div>
          </div>

          <hr className="border-line" />

          {/* Section: Taskboard Defaults */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-muted mb-5 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-500" /> Default Configurations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              
              {/* Default Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Default Taskboard Filter</label>
                <select
                  value={defaultStatusFilter}
                  onChange={(e) => setDefaultStatusFilter(e.target.value)}
                  disabled={!isAdmin}
                  className="select w-full h-11 capitalize"
                >
                  <option value="incomplete">Incomplete Tasks</option>
                  <option value="all">All Tasks</option>
                  <option value="completed">Completed Tasks</option>
                </select>
                <p className="text-[11px] text-muted">Initial filtering criteria for active task list</p>
              </div>

              {/* Board default length */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Taskboard default row limit</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={boardDefaultLength}
                  onChange={(e) => setBoardDefaultLength(Number(e.target.value))}
                  disabled={!isAdmin}
                  className="input w-full h-11 text-sm font-mono"
                  placeholder="10"
                />
                <p className="text-[11px] text-muted">Number of tasks displayed per page by default</p>
              </div>

            </div>
          </div>

          <hr className="border-line" />

          {/* Section: Behavior Toggles */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-muted mb-5 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-violet-500" /> Task Behaviors & Priorities
            </h4>
            <div className="space-y-6">
              {/* Priority Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink">Default Priority</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
                  {priorities.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setTaskDefaultPriority(p.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border transition-all duration-150 cursor-pointer font-semibold text-xs",
                        p.color,
                        taskDefaultPriority === p.id
                          ? `ring-2 ring-offset-2 ${p.ring} border-transparent scale-[1.02] shadow-sm`
                          : "scale-100 shadow-none opacity-70 hover:opacity-100"
                      )}
                    >
                      {taskDefaultPriority === p.id && (
                        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-paper flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-current" />
                        </span>
                      )}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Behavior switches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                
                {/* Require Due Date */}
                <div className="p-4 border border-line bg-bone/20 rounded-xl flex flex-col gap-3 justify-between">
                  <div>
                    <label className="text-[13px] font-bold text-ink block">Require Due Date</label>
                    <span className="text-[11px] text-muted block mt-0.5">Force input of due dates for validation</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-2 self-start">
                    <input
                      type="checkbox"
                      checked={taskRequireDueDate}
                      disabled={!isAdmin}
                      onChange={(e) => setTaskRequireDueDate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-bone-2 border border-line rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500 peer-checked:border-violet-500 shadow-inner"></div>
                  </label>
                </div>

                {/* Allow Sub Tasks */}
                <div className="p-4 border border-line bg-bone/20 rounded-xl flex flex-col gap-3 justify-between">
                  <div>
                    <label className="text-[13px] font-bold text-ink block">Allow Sub-Tasks</label>
                    <span className="text-[11px] text-muted block mt-0.5">Let team break tasks into nested sub-tasks</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-2 self-start">
                    <input
                      type="checkbox"
                      checked={taskAllowSubtasks}
                      disabled={!isAdmin}
                      onChange={(e) => setTaskAllowSubtasks(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-bone-2 border border-line rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-fuchsia-500 peer-checked:border-fuchsia-500 shadow-inner"></div>
                  </label>
                </div>

                {/* Auto Assign Creator */}
                <div className="p-4 border border-line bg-bone/20 rounded-xl flex flex-col gap-3 justify-between">
                  <div>
                    <label className="text-[13px] font-bold text-ink block">Auto-Assign Creator</label>
                    <span className="text-[11px] text-muted block mt-0.5">Default assignee to creator if left blank</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer mt-2 self-start">
                    <input
                      type="checkbox"
                      checked={taskAutoAssignCreator}
                      disabled={!isAdmin}
                      onChange={(e) => setTaskAutoAssignCreator(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-bone-2 border border-line rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ink peer-checked:border-ink shadow-inner"></div>
                  </label>
                </div>

              </div>
            </div>
          </div>

          <hr className="border-line" />

          {/* Section: Client Visible Fields */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-500" /> Client Visibility Policies
            </h4>
            <p className="text-xs text-muted mb-6">Select which task sections, fields, and tabs are visible to client portals.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CLIENT_VISIBLE_FIELDS.map((field) => {
                const isChecked = !!clientVisibleFields[field.id];
                return (
                  <button
                    key={field.id}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => handleToggleClientField(field.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all text-left",
                      isChecked 
                        ? "bg-violet-50/50 border-violet-200 text-violet-900 shadow-sm" 
                        : "bg-paper border-line text-muted hover:bg-bone/40"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      isChecked ? "bg-violet-600 border-violet-600 text-white" : "border-line bg-paper"
                    )}>
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{field.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-bone/40 px-8 py-4 border-t border-line mt-auto flex items-center justify-between">
          <div className="text-[12.5px] text-muted flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
            Task rules control scheduling limits and external portal interfaces.
          </div>
        </div>
      </div>
    </div>
  );
}

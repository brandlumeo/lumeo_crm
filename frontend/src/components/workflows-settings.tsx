"use client";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Loader2, Zap, CheckSquare, Bell, HelpCircle,
  ChevronRight, ToggleLeft, ToggleRight, Workflow
} from "lucide-react";
import { fetchWorkflowRules, createWorkflowRule, updateWorkflowRule, deleteWorkflowRule } from "@/lib/api";
import type { WorkflowRule } from "@/lib/types";

const TRIGGER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  deal_won: { label: "Deal Won", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  deal_lost: { label: "Deal Lost", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  lead_qualified: { label: "Lead Qualified", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
};

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  create_task: { label: "Create Task", icon: <CheckSquare className="w-3.5 h-3.5" />, color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  send_notification: { label: "Send Notification", icon: <Bell className="w-3.5 h-3.5" />, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
};

export function WorkflowsSettings() {
  const queryClient = useQueryClient();
  const [triggerFilter, setTriggerFilter] = useState<"all" | "deal_won" | "deal_lost" | "lead_qualified">("all");
  const [isOpen, setIsOpen] = useState(false);

  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<"deal_won" | "deal_lost" | "lead_qualified">("deal_won");
  const [actionType, setActionType] = useState<"create_task" | "send_notification">("create_task");
  const [taskTitle, setTaskTitle] = useState("");
  const [dueDaysOffset, setDueDaysOffset] = useState(1);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationBody, setNotificationBody] = useState("");

  const { data: workflowRulesData, isLoading } = useQuery({
    queryKey: ["crm", "workflow-rules"],
    queryFn: () => fetchWorkflowRules(),
  });

  const createMutation = useMutation({
    mutationFn: createWorkflowRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "workflow-rules"] });
      closeModal();
      toast.success("Workflow rule created!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.action_payload || "Failed to create workflow rule.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateWorkflowRule(id, { is_active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "workflow-rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflowRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm", "workflow-rules"] });
      toast.success("Workflow rule deleted.");
    },
  });

  const workflowRules = workflowRulesData?.results ?? [];
  const filteredRules = workflowRules.filter((rule) =>
    triggerFilter === "all" ? true : rule.trigger_event === triggerFilter
  );

  const closeModal = () => {
    setIsOpen(false);
    setName("");
    setTriggerEvent("deal_won");
    setActionType("create_task");
    setTaskTitle("");
    setDueDaysOffset(1);
    setNotificationTitle("");
    setNotificationBody("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let payload: any = {};
    if (actionType === "create_task") {
      payload = {
        task_title: taskTitle.trim() || "Follow up with {record_name}",
        due_days_offset: Number(dueDaysOffset) || 1,
      };
    } else {
      payload = {
        notification_title: notificationTitle.trim() || "Workflow Alert",
        notification_body: notificationBody.trim() || "{record_name} status updated.",
      };
    }
    createMutation.mutate({ name, trigger_event: triggerEvent, action_type: actionType, action_payload: payload, is_active: true });
  };

  const tabs = [
    { id: "all" as const, label: "All Triggers" },
    { id: "deal_won" as const, label: "Deal Won" },
    { id: "deal_lost" as const, label: "Deal Lost" },
    { id: "lead_qualified" as const, label: "Lead Qualified" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">Workflow Automation</h3>
          <p className="text-[14px] text-muted">Configure automatic actions that trigger when Lead or Deal stages change.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="btn bg-ink hover:bg-ink-dark text-white px-5 text-[13px] flex items-center gap-2 shadow-sm shrink-0 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Rules", value: workflowRules.length, color: "text-ink", bg: "bg-paper" },
          { label: "Active", value: workflowRules.filter(r => r.is_active).length, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Paused", value: workflowRules.filter(r => !r.is_active).length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Triggers", value: 3, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border border-line rounded-xl p-4 text-center shadow-sm`}>
            <div className={`text-2xl font-bold ${stat.color} mb-0.5`}>{stat.value}</div>
            <div className="text-[12px] text-muted font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        {/* Filter tabs */}
        <div className="flex gap-0 border-b border-line px-6 pt-8 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTriggerFilter(tab.id)}
              className={`py-2.5 px-4 text-[13px] font-semibold transition-all border-b-2 whitespace-nowrap -mb-px ${
                triggerFilter === tab.id
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink hover:border-slate-300"
              }`}
            >
              {tab.label}
              {tab.id !== "all" && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  tab.id === "deal_won" ? "bg-emerald-100 text-emerald-700" :
                  tab.id === "deal_lost" ? "bg-red-100 text-red-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {workflowRules.filter(r => r.trigger_event === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[13px]">Loading workflow rules...</span>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-bone-2 border border-line flex items-center justify-center mx-auto">
                <Workflow className="w-6 h-6 text-muted" />
              </div>
              <div className="text-[14px] font-medium text-ink">No rules yet</div>
              <div className="text-[13px] text-muted">
                No automation rules configured for{" "}
                {triggerFilter === "all" ? "any trigger" : TRIGGER_CONFIG[triggerFilter]?.label ?? triggerFilter}.
              </div>
              <button
                onClick={() => setIsOpen(true)}
                className="btn bg-ink text-white text-[13px] px-5 mx-auto mt-2 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add your first rule
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRules.map((rule) => {
                const trigger = TRIGGER_CONFIG[rule.trigger_event] ?? { label: rule.trigger_event, color: "text-muted", bg: "bg-bone", border: "border-line", dot: "bg-muted" };
                const action = ACTION_CONFIG[rule.action_type] ?? { label: rule.action_type, icon: <Zap className="w-3.5 h-3.5" />, color: "text-muted", bg: "bg-bone", border: "border-line" };
                return (
                  <div
                    key={rule.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      rule.is_active
                        ? "border-line bg-paper hover:border-slate-300 hover:shadow-sm"
                        : "border-dashed border-line bg-bone/30 opacity-60"
                    }`}
                  >
                    {/* Active dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${rule.is_active ? trigger.dot : "bg-muted"}`} />

                    {/* Rule name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-ink mb-1 truncate">{rule.name}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Trigger badge */}
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${trigger.color} ${trigger.bg} ${trigger.border}`}>
                          <Zap className="w-3 h-3" />
                          {trigger.label}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted" />
                        {/* Action badge */}
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${action.color} ${action.bg} ${action.border}`}>
                          {action.icon}
                          {action.label}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="hidden md:block max-w-[200px] shrink-0">
                      <p className="text-[12px] text-muted truncate">
                        {rule.action_type === "create_task"
                          ? `Task: ${rule.action_payload.task_title}`
                          : `Notification: ${rule.action_payload.notification_title}`
                        }
                      </p>
                    </div>

                    {/* Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={rule.is_active}
                        disabled={toggleMutation.isPending}
                        onChange={(e) => toggleMutation.mutate({ id: rule.id, is_active: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-bone-2 border border-line rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-200 after:rounded-full after:h-4 after:w-4 after:transition-all shadow-inner peer-checked:bg-emerald-500 peer-checked:border-emerald-500"></div>
                    </label>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete workflow "${rule.name}"?`)) deleteMutation.mutate(rule.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 text-muted hover:text-red-600 transition-all shrink-0"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-md rounded-2xl shadow-2xl border border-line flex flex-col animate-rise max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="p-6 border-b border-line flex items-center justify-between bg-bone/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink text-[15px]">New Automation Rule</h3>
                  <p className="text-[12px] text-muted">Define a trigger and its resulting action.</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-line hover:bg-bone text-muted hover:text-ink transition-colors"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Rule name */}
              <div>
                <label className="block text-[13px] font-medium text-ink mb-1.5">Rule Name</label>
                <input
                  required
                  placeholder="e.g. Create task when deal is won"
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Trigger + Action selects */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">When Trigger</label>
                  <select
                    className="input w-full"
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value as any)}
                  >
                    <option value="deal_won">Deal Stage = Won</option>
                    <option value="deal_lost">Deal Stage = Lost</option>
                    <option value="lead_qualified">Lead = Qualified</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">Then Action</label>
                  <select
                    className="input w-full"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                  >
                    <option value="create_task">Create Task</option>
                    <option value="send_notification">Send Notification</option>
                  </select>
                </div>
              </div>

              {/* Action config */}
              <div className="bg-bone border border-line rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                    actionType === "create_task"
                      ? "bg-violet-100 text-violet-700 border border-violet-200"
                      : "bg-amber-100 text-amber-700 border border-amber-200"
                  }`}>
                    {actionType === "create_task" ? "Task Config" : "Notification Config"}
                  </div>
                </div>

                {actionType === "create_task" ? (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-ink mb-1.5">Task Title</label>
                      <input
                        required
                        placeholder="e.g. Follow up onboarding with {record_name}"
                        className="input w-full bg-paper"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-ink mb-1.5">Due in (days)</label>
                      <input
                        type="number"
                        min={0}
                        required
                        className="input w-full bg-paper font-mono"
                        value={dueDaysOffset}
                        onChange={(e) => setDueDaysOffset(Number(e.target.value))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[13px] font-medium text-ink mb-1.5">Notification Title</label>
                      <input
                        required
                        placeholder="e.g. Deal Won: {record_name} 🎉"
                        className="input w-full bg-paper"
                        value={notificationTitle}
                        onChange={(e) => setNotificationTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-ink mb-1.5">Message Body</label>
                      <textarea
                        required
                        placeholder="e.g. {record_name} has just been closed successfully."
                        className="input w-full bg-paper h-20 resize-none py-2"
                        value={notificationBody}
                        onChange={(e) => setNotificationBody(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <p className="text-[11px] text-muted flex items-start gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 text-accent mt-0.5" />
                  <span>Use <code className="bg-bone-2 px-1 rounded text-[10px]">{"{record_name}"}</code> to insert the dynamic Lead or Deal name.</span>
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn btn-secondary text-[13px] px-4">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn bg-ink hover:bg-ink-dark text-white text-[13px] px-5 flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

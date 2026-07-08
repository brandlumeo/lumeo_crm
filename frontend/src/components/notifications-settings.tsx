"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle, Check } from "lucide-react";
import { useCurrentUser } from "@/lib/queries";
import { updateProfile } from "@/lib/api";
import { cn } from "@/lib/utils";

const NOTIFICATION_TYPES = [
  { id: "new_expense_admin", label: "New Expense/Added by Admin" },
  { id: "new_expense_member", label: "New Expense/Added by Member" },
  { id: "expense_status", label: "Expense Status Changed" },
  { id: "new_support_ticket", label: "New Support Ticket Request" },
  { id: "new_leave_app", label: "New Leave Application" },
  { id: "task_completed", label: "Task Completed" },
  { id: "task_status_updated", label: "Task Status Updated" },
  { id: "invoice_create_update", label: "Invoice Create/Update Notification" },
  { id: "discussion_reply", label: "Discussion Reply" },
  { id: "new_product_purchase", label: "New Product Purchase Request" },
  { id: "lead_notification", label: "Lead notification" },
  { id: "order_create_update", label: "Order Create/Update Notification" },
  { id: "user_join_invitation", label: "User Join Via Invitation" },
  { id: "follow_up_reminder", label: "Follow Up Reminder" },
  { id: "user_reg_admin", label: "User Registration/Added by Admin" },
  { id: "employee_assign_project", label: "Employee Assign to Project" },
  { id: "new_notice", label: "New Notice Published" },
  { id: "user_assign_task", label: "User Assign to Task" },
  { id: "birthday", label: "Birthday Notification" },
  { id: "payment", label: "Payment Notification" },
  { id: "employee_appreciation", label: "Employee Appreciation" },
  { id: "holiday", label: "Holiday Notification" },
  { id: "estimate", label: "Estimate Notification" },
  { id: "event", label: "Event Notification" },
  { id: "message", label: "Message Notification" },
  { id: "project_mention", label: "Project Mention Notification" },
  { id: "task_mention", label: "Task Mention Notification" },
  { id: "shift_assign", label: "Shift Assign Notification" },
  { id: "daily_schedule", label: "Daily Schedule Notification" },
];

export function NotificationsForm() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"email" | "slack" | "push">("email");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Local state for checkboxes so we don't mutate right away
  const [emailPrefs, setEmailPrefs] = useState<Record<string, boolean>>({});
  const [slackPrefs, setSlackPrefs] = useState<Record<string, boolean>>({});
  const [pushPrefs, setPushPrefs] = useState<Record<string, boolean>>({});

  const hasInitialized = useRef<number | null>(null);

  useEffect(() => {
    if (user && hasInitialized.current !== user.id) {
      setEmailPrefs(user.email_notifications || {});
      setSlackPrefs(user.slack_notifications || {});
      setPushPrefs(user.push_notifications || {});
      hasInitialized.current = user.id;
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      setMsg({ type: "success", text: "Notification preferences saved successfully." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update notification preferences." });
    },
  });

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading preferences...</div>
    </div>
  );

  const currentPrefs = activeTab === "email" ? emailPrefs : activeTab === "slack" ? slackPrefs : pushPrefs;
  const setCurrentPrefs = activeTab === "email" ? setEmailPrefs : activeTab === "slack" ? setSlackPrefs : setPushPrefs;

  const handleToggle = (id: string) => {
    setCurrentPrefs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isAllSelected = NOTIFICATION_TYPES.every(t => currentPrefs[t.id]);

  const handleSelectAll = () => {
    const newState = !isAllSelected;
    const newPrefs = { ...currentPrefs };
    NOTIFICATION_TYPES.forEach(t => {
      newPrefs[t.id] = newState;
    });
    setCurrentPrefs(newPrefs);
  };

  const handleSave = () => {
    mutation.mutate({
      email_notifications: emailPrefs,
      slack_notifications: slackPrefs,
      push_notifications: pushPrefs,
    });
  };

  return (
    <div className="animate-fade-in bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* Tabs */}
      <div className="flex items-center gap-8 px-8 pt-6 border-b border-line shrink-0">
        <button
          onClick={() => setActiveTab("email")}
          className={cn(
            "pb-3 text-[14px] font-semibold transition-colors border-b-2 flex items-center gap-2", 
            activeTab === "email" ? "border-rose-500 text-ink" : "border-transparent text-muted hover:text-ink"
          )}
        >
          Email
        </button>
        <button
          onClick={() => setActiveTab("slack")}
          className={cn(
            "pb-3 text-[14px] font-semibold transition-colors border-b-2 flex items-center gap-2", 
            activeTab === "slack" ? "border-rose-500 text-ink" : "border-transparent text-muted hover:text-ink"
          )}
        >
          Slack
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
        </button>
        <button
          onClick={() => setActiveTab("push")}
          className={cn(
            "pb-3 text-[14px] font-semibold transition-colors border-b-2 flex items-center gap-2", 
            activeTab === "push" ? "border-rose-500 text-ink" : "border-transparent text-muted hover:text-ink"
          )}
        >
          Push Notification
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Content */}
        <div className="flex-1 flex flex-col p-8 border-r border-line bg-bone/10">
          <div className="flex-1 flex flex-col">
            {activeTab === "slack" ? (
              <div className="space-y-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors shadow-sm shrink-0",
                    slackPrefs["_status"]
                      ? "bg-rose-500 border-rose-500 text-white" 
                      : "border-line bg-paper text-transparent group-hover:border-rose-400"
                  )}>
                    <Check className="w-3.5 h-3.5" strokeWidth={4} />
                  </div>
                  <span className="text-[14px] text-ink">Status</span>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={!!slackPrefs["_status"]}
                    onChange={() => handleToggle("_status")}
                  />
                </label>
                
                {slackPrefs["_status"] && (
                  <label className="block max-w-md animate-fade-in">
                    <span className="block text-[13px] font-medium text-ink mb-1.5">Webhook URL</span>
                    <input 
                      type="text" 
                      placeholder="https://hooks.slack.com/services/..."
                      className="w-full h-10 px-3 bg-paper border border-line rounded-lg text-sm outline-none focus:border-ink transition-colors"
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[14.5px] text-ink font-medium max-w-sm text-center leading-relaxed">
                  Choose from right sidebar all the {activeTab} notifications you want to receive.
                </p>
              </div>
            )}
          </div>
          
          <div className="pt-4 flex items-center gap-4 border-t border-line/40">
            <button
              onClick={handleSave}
              className="btn bg-ink hover:bg-ink-2 text-white shadow-sm hover:shadow-md transition-all h-10 px-6 rounded-lg font-medium flex items-center gap-2 border-0"
            >
              {mutation.isPending ? "Saving..." : (
                <>
                  <CheckCircle className="w-4 h-4" /> Save
                </>
              )}
            </button>
            {activeTab === "slack" && (
              <button
                className="btn border border-line bg-paper shadow-sm hover:bg-bone transition-all h-10 px-4 rounded-lg font-medium flex items-center gap-2 text-ink-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Test Notification
              </button>
            )}
            {msg && (
              <span className={cn(
                "text-[13px] font-medium animate-fade-in",
                msg.type === "success" ? "text-emerald-600" : "text-rose-600"
              )}>
                {msg.text}
              </span>
            )}
          </div>
        </div>

        {/* Right Sidebar (Checkboxes) */}
        <div className="w-[450px] shrink-0 flex flex-col bg-paper">
          <div className="p-5 border-b border-line shrink-0">
            <h4 className="text-[14.5px] font-medium text-ink capitalize">
              {activeTab} Notification Settings
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            <div onClick={handleSelectAll} className="flex items-center gap-3 cursor-pointer group">
              <div className={cn(
                "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors shadow-sm",
                isAllSelected 
                  ? "bg-rose-500 border-rose-500 text-white" 
                  : "border-line bg-paper text-transparent group-hover:border-rose-400"
              )}>
                <Check className="w-3.5 h-3.5" strokeWidth={4} />
              </div>
              <span className="text-[14px] text-ink select-none">Select All</span>
            </div>

            <div className="h-px bg-line/50 my-2" />

            {NOTIFICATION_TYPES.map((type) => {
              const isSelected = currentPrefs[type.id] || false;
              return (
                <div key={type.id} onClick={() => handleToggle(type.id)} className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "w-4 h-4 rounded-sm border flex items-center justify-center transition-colors shadow-sm shrink-0",
                    isSelected 
                      ? "bg-rose-500 border-rose-500 text-white" 
                      : "border-line bg-paper text-transparent group-hover:border-rose-400"
                  )}>
                    <Check className="w-3.5 h-3.5" strokeWidth={4} />
                  </div>
                  <span className="text-[14px] text-ink select-none">{type.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

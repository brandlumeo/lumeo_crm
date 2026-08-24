"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWorkflowSequences, createWorkflowSequence, updateWorkflowSequence } from "@/lib/api";
import { WorkflowStep, WorkflowSequenceInput } from "@/lib/types";
import { toast } from "sonner";
import { Plus, ArrowDown, CheckSquare, Bell, Mail, ArrowLeft, Clock, Save, Loader2, Trash2, Settings2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGER_EVENTS = [
  { value: "lead_created", label: "Lead Created" },
  { value: "lead_qualified", label: "Lead Qualified" },
];

const ACTION_TYPES = [
  { value: "create_task", label: "Create Task", icon: CheckSquare, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  { value: "send_notification", label: "Send Notification", icon: Bell, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  { value: "send_email", label: "Send Email", icon: Mail, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
];

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<"lead_created" | "lead_qualified">("lead_created");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  const { data: sequencesData, isLoading } = useQuery({
    queryKey: ["crm", "workflow-sequences"],
    queryFn: () => fetchWorkflowSequences(),
    enabled: !!id,
  });

  useEffect(() => {
    if (id && sequencesData) {
      const seq = sequencesData.results.find((s) => s.id === Number(id));
      if (seq) {
        setName(seq.name);
        setTriggerEvent(seq.trigger_event);
        setSteps(seq.steps || []);
      }
    }
  }, [id, sequencesData]);

  const saveMutation = useMutation({
    mutationFn: (payload: WorkflowSequenceInput) => {
      if (id) {
        return updateWorkflowSequence(Number(id), payload);
      }
      return createWorkflowSequence(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "workflow-sequences"] });
      toast.success(id ? "Sequence updated" : "Sequence created");
      router.push("/automations");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.steps?.[0] || "Failed to save sequence");
    },
    onSettled: () => setIsSaving(false),
  });

  const handleSave = () => {
    if (!name.trim()) return toast.error("Please enter a sequence name.");
    if (steps.length === 0) return toast.error("Please add at least one step.");
    setIsSaving(true);
    
    const formattedSteps = steps.map((s, i) => ({
      ...s,
      order: i,
    }));
    
    saveMutation.mutate({
      name,
      trigger_event: triggerEvent,
      steps: formattedSteps,
      is_active: true,
      stop_on_statuses: ["won", "lost"], // Default
    });
  };

  const addStep = (actionType: any) => {
    setSteps([...steps, {
      order: steps.length,
      delay_minutes: 0,
      action_type: actionType,
      action_payload: {},
    }]);
    setActiveStepIndex(steps.length);
  };

  const removeStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    setSteps(newSteps);
    if (activeStepIndex === index) setActiveStepIndex(null);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    if (field.startsWith('payload.')) {
      const key = field.split('.')[1];
      newSteps[index] = { ...newSteps[index], action_payload: { ...newSteps[index].action_payload, [key]: value } };
    } else {
      newSteps[index] = { ...newSteps[index], [field]: value };
    }
    setSteps(newSteps);
  };

  return (
    <div className="flex flex-col h-screen bg-bone-2 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-paper border-b border-accent shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/automations")} className="p-2 hover:bg-bone rounded-md text-ink-3 hover:text-ink transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-accent" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Sequence..."
            className="text-lg font-medium text-ink bg-transparent border-none focus:outline-none focus:ring-0 p-0 placeholder:text-ink-3"
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={isSaving} className="bg-ink text-white hover:bg-ink-2 px-6 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Sequence
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas / Builder Area */}
        <div className="flex-1 overflow-y-auto p-12 bg-bone-2 flex flex-col items-center relative">
          
          {/* Trigger Node */}
          <div className="w-[400px] bg-paper border-2 border-emerald-500/20 rounded-xl shadow-sm p-5 relative group z-10 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase mb-0.5">Sequence Trigger</h4>
                <p className="text-[15px] font-semibold text-ink">When this happens...</p>
              </div>
            </div>
            <select
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value as any)}
              className="w-full bg-bone/50 border border-accent rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {TRIGGER_EVENTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Steps */}
          {steps.map((step, index) => {
            const config = ACTION_TYPES.find(a => a.value === step.action_type);
            const Icon = config?.icon || Settings2;
            const isActive = activeStepIndex === index;

            return (
              <div key={index} className="flex flex-col items-center w-[400px]">
                {/* Connector line */}
                <div className="w-px h-10 bg-accent relative" />
                
                {/* Delay configuration (between steps) */}
                {index > 0 && (
                   <div className="absolute -mt-5 bg-paper border border-accent rounded-full px-3 py-1 shadow-sm text-[12px] font-medium text-ink-2 flex items-center gap-1.5 z-20 cursor-pointer hover:border-ink-3 transition-colors"
                        onClick={() => setActiveStepIndex(index)}>
                     <Clock className="w-3.5 h-3.5" />
                     {step.delay_minutes > 0 ? `Wait ${step.delay_minutes} mins` : 'No delay'}
                   </div>
                )}
                {index > 0 && <div className="w-px h-10 bg-accent relative" />}

                {/* Action Node */}
                <div 
                  onClick={() => setActiveStepIndex(index)}
                  className={cn(
                    "w-full bg-paper border-2 rounded-xl shadow-sm p-5 relative z-10 cursor-pointer transition-all",
                    isActive ? "border-ink shadow-md" : "border-transparent hover:border-accent border-accent"
                  )}
                >
                   <div className="flex items-start justify-between">
                     <div className="flex items-center gap-3">
                       <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", config?.bg, config?.color)}>
                         <Icon className="w-5 h-5" />
                       </div>
                       <div>
                          <h4 className="text-[11px] font-bold tracking-wider text-ink-3 uppercase mb-0.5">Step {index + 1}</h4>
                          <p className="text-[15px] font-semibold text-ink">{config?.label}</p>
                       </div>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); removeStep(index); }} className="text-ink-3 hover:text-red-600 transition-colors">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              </div>
            );
          })}

          {/* Add Step Button */}
          <div className="flex flex-col items-center w-[400px]">
            <div className="w-px h-12 bg-accent" />
            <div className="relative group">
               <button className="w-12 h-12 rounded-full bg-paper border border-accent shadow-sm flex items-center justify-center text-ink-2 group-hover:text-ink group-hover:border-ink transition-all">
                 <Plus className="w-5 h-5" />
               </button>
               {/* Dropdown Menu */}
               <div className="absolute top-14 left-1/2 -translate-x-1/2 w-48 bg-paper border border-accent rounded-xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-30 p-1.5 flex flex-col gap-1">
                 {ACTION_TYPES.map(a => (
                   <button
                     key={a.value}
                     onClick={() => addStep(a.value)}
                     className="flex items-center gap-2.5 px-3 py-2 hover:bg-bone rounded-lg text-sm font-medium text-ink transition-colors w-full text-left"
                   >
                     <a.icon className={cn("w-4 h-4", a.color)} />
                     {a.label}
                   </button>
                 ))}
               </div>
            </div>
            <div className="w-px h-12 bg-transparent" />
          </div>

        </div>

        {/* Sidebar Configuration Panel */}
        <div className={cn("w-[360px] bg-paper border-l border-accent flex flex-col transition-all duration-300", activeStepIndex !== null ? "translate-x-0" : "translate-x-full")}>
           {activeStepIndex !== null && steps[activeStepIndex] && (
             <>
               <div className="p-5 border-b border-accent flex items-center justify-between shrink-0">
                  <h3 className="font-semibold text-ink">Configure Step {activeStepIndex + 1}</h3>
                  <button onClick={() => setActiveStepIndex(null)} className="text-ink-3 hover:text-ink">
                    <ArrowDown className="w-5 h-5 -rotate-90" />
                  </button>
               </div>
               <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-6">
                  {/* Delay Config */}
                  {activeStepIndex > 0 && (
                    <div className="flex flex-col gap-2">
                       <label className="text-[13px] font-medium text-ink">Delay before executing</label>
                       <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            min="0"
                            className="w-full bg-bone/50 border border-accent rounded-md px-3 py-2 text-sm focus:border-ink focus:outline-none"
                            value={steps[activeStepIndex].delay_minutes}
                            onChange={(e) => updateStep(activeStepIndex, "delay_minutes", parseInt(e.target.value) || 0)}
                          />
                          <span className="text-sm text-ink-2">minutes</span>
                       </div>
                    </div>
                  )}

                  {/* Action Specific Config */}
                  {steps[activeStepIndex].action_type === "create_task" && (
                    <>
                      <div className="flex flex-col gap-2">
                         <label className="text-[13px] font-medium text-ink">Task Title Template</label>
                         <input 
                           type="text" 
                           className="w-full bg-bone/50 border border-accent rounded-md px-3 py-2 text-sm focus:border-ink focus:outline-none"
                           value={steps[activeStepIndex].action_payload.task_title || ""}
                           placeholder="Follow up with {record_name}"
                           onChange={(e) => updateStep(activeStepIndex, "payload.task_title", e.target.value)}
                         />
                         <p className="text-[12px] text-ink-3">Available variables: {'{record_name}'}, {'{company_name}'}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                         <label className="text-[13px] font-medium text-ink">Due Date Offset</label>
                         <div className="flex items-center gap-2">
                           <input 
                             type="number" 
                             min="0"
                             className="w-full bg-bone/50 border border-accent rounded-md px-3 py-2 text-sm focus:border-ink focus:outline-none"
                             value={steps[activeStepIndex].action_payload.due_days_offset || 0}
                             onChange={(e) => updateStep(activeStepIndex, "payload.due_days_offset", parseInt(e.target.value) || 0)}
                           />
                           <span className="text-sm text-ink-2">days</span>
                         </div>
                      </div>
                    </>
                  )}

                  {steps[activeStepIndex].action_type === "send_notification" && (
                    <>
                      <div className="flex flex-col gap-2">
                         <label className="text-[13px] font-medium text-ink">Notification Title</label>
                         <input 
                           type="text" 
                           className="w-full bg-bone/50 border border-accent rounded-md px-3 py-2 text-sm focus:border-ink focus:outline-none"
                           value={steps[activeStepIndex].action_payload.notification_title || ""}
                           placeholder="Workflow Alert"
                           onChange={(e) => updateStep(activeStepIndex, "payload.notification_title", e.target.value)}
                         />
                      </div>
                      <div className="flex flex-col gap-2">
                         <label className="text-[13px] font-medium text-ink">Notification Body</label>
                         <textarea 
                           className="w-full bg-bone/50 border border-accent rounded-md px-3 py-2 text-sm focus:border-ink focus:outline-none min-h-[100px]"
                           value={steps[activeStepIndex].action_payload.notification_body || ""}
                           placeholder="{record_name} requires your attention."
                           onChange={(e) => updateStep(activeStepIndex, "payload.notification_body", e.target.value)}
                         />
                      </div>
                    </>
                  )}
                  
                  {steps[activeStepIndex].action_type === "send_email" && (
                    <div className="flex flex-col gap-2">
                       <label className="text-[13px] font-medium text-ink">Email Template ID</label>
                       <input 
                         type="number" 
                         className="w-full bg-bone/50 border border-accent rounded-md px-3 py-2 text-sm focus:border-ink focus:outline-none"
                         value={steps[activeStepIndex].email_template || ""}
                         placeholder="e.g. 1"
                         onChange={(e) => updateStep(activeStepIndex, "email_template", parseInt(e.target.value) || null)}
                       />
                       <p className="text-[12px] text-ink-3">Select the ID of the email template to send.</p>
                    </div>
                  )}

               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-bone-2"><Loader2 className="w-6 h-6 animate-spin text-ink-3" /></div>}>
      <BuilderContent />
    </Suspense>
  );
}

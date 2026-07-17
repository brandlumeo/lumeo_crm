"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, UserCircle2, Mail, Phone, Calendar, Briefcase, MapPin, Zap, Loader2, Clock, Check } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { createTask } from "@/lib/api";
import { useLead, useScoreLead } from "@/lib/queries";
import { Lead } from "@/lib/types";
import { PageShell } from "@/components/page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { formatDateTime, getDisplayName } from "@/lib/utils";

const statusTone: Record<string, string> = {
  new: "chip chip-neutral",
  contacted: "chip chip-warning",
  qualified: "chip chip-positive",
  lost: "chip chip-neutral",
  won: "chip chip-positive",
};

function ReminderButton({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState("1");
  const [title, setTitle] = useState(`Follow up with ${lead.name}`);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      toast.success("Reminder task created successfully!");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
    },
    onError: () => {
      toast.error("Failed to create reminder.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(days, 10));
    
    createMutation.mutate({
      title,
      due_date: dueDate.toISOString().split("T")[0],
      status: "todo",
      lead_id: lead.id,
      assigned_to_id: lead.assigned_to?.id || null,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="btn btn-secondary h-9 px-4 font-medium flex items-center gap-2 rounded-md shadow-sm">
          <Clock className="w-4 h-4" />
          Set Reminder
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-paper shadow-2xl rounded-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-line">
            <Dialog.Title className="text-lg font-bold text-ink">Set Follow-Up Reminder</Dialog.Title>
            <Dialog.Description className="text-[13px] text-muted mt-1">
              Creates a task assigned to this lead.
            </Dialog.Description>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">Reminder Note</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input w-full h-10"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">Follow up in (Days)</label>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="select w-full h-10"
              >
                <option value="1">Tomorrow</option>
                <option value="2">2 Days</option>
                <option value="3">3 Days</option>
                <option value="7">1 Week</option>
                <option value="14">2 Weeks</option>
                <option value="30">1 Month</option>
              </select>
            </div>
            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary px-5 h-10">Cancel</button>
              <button disabled={createMutation.isPending} type="submit" className="btn btn-primary px-5 h-10 flex items-center gap-2">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Reminder
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PredictiveScoreCard({ lead }: { lead: Lead }) {
  const scoreMutation = useScoreLead();
  
  const isScored = lead.score != null;
  
  let color = "text-muted bg-bone-2 border-line";
  let label = "Unscored";
  if (isScored) {
    if (lead.score! >= 80) { color = "text-emerald-700 bg-emerald-50 border-emerald-200"; label = "Hot"; }
    else if (lead.score! >= 50) { color = "text-amber-700 bg-amber-50 border-amber-200"; label = "Warm"; }
    else { color = "text-red-700 bg-red-50 border-red-200"; label = "Cold"; }
  }

  return (
    <div className={`card animate-rise overflow-hidden border ${isScored ? color : "border-line bg-white"}`}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isScored ? color.split(' ')[0] : "text-muted"}`} />
            <h3 className="font-medium text-sm text-ink">Predictive Score</h3>
          </div>
          <button 
            onClick={() => scoreMutation.mutate(lead.id)}
            disabled={scoreMutation.isPending}
            className="btn btn-secondary py-1 text-[11px] font-medium px-2.5 h-auto flex items-center gap-1.5"
          >
            {scoreMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {isScored ? "Re-Score" : "Analyze"}
          </button>
        </div>
        
        {isScored ? (
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-semibold text-ink tracking-tight">{lead.score}</span>
              <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              {lead.score_rationale}
            </p>
          </div>
        ) : (
          <div className="text-sm text-muted">
            Score this lead to see AI-driven insights on conversion probability based on profile data and engagement.
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const leadId = parseInt(id, 10);
  
  const { data: lead, isLoading, error } = useLead(leadId);

  if (isLoading) {
    return <PageShell title="Loading..."><div className="p-6 text-muted">Loading lead details...</div></PageShell>;
  }

  if (error || !lead) {
    return <PageShell title="Not Found"><div className="p-6 text-muted">Lead not found.</div></PageShell>;
  }

  return (
    <PageShell title={lead.name} eyebrow="Lead Details">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/leads" className="inline-flex items-center text-[13px] text-muted hover:text-ink transition-colors font-medium px-3 py-1.5 bg-bone-2 border border-line rounded-md">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to leads
        </Link>
        <ReminderButton lead={lead} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="card animate-rise">
            <div className="p-6 border-b border-line flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-bone-2 rounded-full grid place-items-center mb-3 border border-line shadow-sm">
                <UserCircle2 className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
              <h2 className="text-[22px] font-serif text-ink tracking-tight">{lead.name}</h2>
              <span className={`mt-2 ${statusTone[lead.status] ?? "chip chip-neutral"}`}>
                {lead.status.replaceAll("_", " ")}
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 text-[13px]">
                <Mail className="w-4 h-4 text-muted shrink-0" />
                <a href={`mailto:${lead.email}`} className="text-accent hover:underline truncate">{lead.email}</a>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <Briefcase className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate">Assigned: {getDisplayName(lead.assigned_to) || "Unassigned"}</span>
              </div>
              <div className="flex items-center gap-3 text-[13px]">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate">Added: {formatDateTime(lead.created_at)}</span>
              </div>
            </div>
          </div>
          
          <PredictiveScoreCard lead={lead} />
          
          <CustomFieldsDisplay modelName="lead" customData={lead.custom_data} />
        </div>

        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={lead.id} entityType="lead" />
          <DocumentLibrary entityId={lead.id} entityType="lead" />
        </div>
      </div>
    </PageShell>
  );
}

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, Mail, Briefcase, Calendar, Zap, Loader2, Clock, Check, Phone, Globe, Edit2, X } from "lucide-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { createTask, updateLead, fetchTeam } from "@/lib/api";
import { useLead, useScoreLead, useCurrentCompany } from "@/lib/queries";
import { Lead } from "@/lib/types";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { LeadTasks } from "@/components/lead-tasks";
import { LeadJourney } from "@/components/lead-journey";
import { formatDateTime, getDisplayName } from "@/lib/utils";
import { Drawer } from "@/components/drawer";

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

function EditLeadModal({ lead, open, onOpenChange }: { lead: Lead, open: boolean, onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });

  const [form, setForm] = useState({
    name: lead.name || "",
    email: lead.email || "",
    mobile: lead.mobile || "",
    source: lead.source || "",
    status: lead.status || "new",
    assigned_to_id: lead.assigned_to?.id || null,
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => updateLead(lead.id, data),
    onSuccess: () => {
      toast.success("Lead updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update lead.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/20 backdrop-blur-sm">
      <div className="bg-paper border border-line-2 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-line-2 bg-bone/30 shrink-0">
          <h3 className="font-serif text-xl text-ink">Edit Lead</h3>
          <button onClick={() => onOpenChange(false)} className="text-muted hover:text-ink transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4">
          <form id="edit-lead-form-modal" onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="label">Lead name</span>
              <input
                required
                className="input w-full"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="label">Email</span>
                <input
                  required
                  type="email"
                  className="input w-full"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="label">Mobile</span>
                <input
                  type="tel"
                  className="input w-full"
                  value={form.mobile || ""}
                  onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))}
                />
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="label">Source</span>
                <input
                  type="text"
                  className="input w-full"
                  value={form.source || ""}
                  onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="label">Status</span>
                <select
                  className="select w-full"
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {company?.lead_pipelines?.map((stage: any) => (
                    <option key={stage.id} value={stage.name.toLowerCase()}>
                      {stage.name}
                    </option>
                  )) || (
                    <>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </>
                  )}
                </select>
              </label>
            </div>
            
            <label className="block">
              <span className="label">Assigned To</span>
              <select
                className="select w-full"
                value={form.assigned_to_id || ""}
                onChange={(e) => setForm(f => ({ ...f, assigned_to_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">Unassigned</option>
                {teamData?.users?.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {getDisplayName(member)}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </div>
        
        <div className="p-4 border-t border-line-2 bg-bone/30 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={() => onOpenChange(false)} className="btn px-4 py-2 hover:bg-line-2/50 text-ink">Cancel</button>
          <button 
            type="submit" 
            form="edit-lead-form-modal"
            disabled={mutation.isPending}
            className="btn btn-primary px-4 py-2 flex items-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InterceptedLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { id } = use(params);
  const leadId = parseInt(id, 10);
  
  const { data: lead, isLoading, error } = useLead(leadId);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOpen(false);
      setTimeout(() => router.back(), 300); // Wait for Radix animation
    } else {
      setOpen(true);
    }
  };

  if (isLoading) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <div className="p-6 text-muted font-sans text-xs flex justify-center items-center min-h-[200px]">
          Loading lead details...
        </div>
      </Drawer>
    );
  }

  if (error || !lead) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <div className="p-6 text-muted font-sans text-xs flex justify-center items-center min-h-[200px]">
          Lead not found.
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
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
            {lead.mobile && (
              <div className="flex items-center gap-3 text-[13px]">
                <Phone className="w-4 h-4 text-muted shrink-0" />
                <a href={`tel:${lead.mobile}`} className="text-ink-2 hover:text-accent truncate">{lead.mobile}</a>
              </div>
            )}
            {lead.source && (
              <div className="flex items-center gap-3 text-[13px]">
                <Globe className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate capitalize">{lead.source}</span>
              </div>
            )}
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
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={() => setShowEditModal(true)}
            className="btn bg-white hover:bg-bone border border-line text-ink py-1.5 px-3 flex items-center gap-2"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <ReminderButton lead={lead} />
        </div>
        
        <EditLeadModal lead={lead} open={showEditModal} onOpenChange={setShowEditModal} />
        
        <LeadJourney lead={lead} />
        
        <PredictiveScoreCard lead={lead} />
        
        <CustomFieldsDisplay modelName="lead" customData={lead.custom_data} />
        
        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <LeadTasks leadId={lead.id} />
          <ActivityTimeline entityId={lead.id} entityType="lead" />
          <DocumentLibrary entityId={lead.id} entityType="lead" />
        </div>
      </div>
    </Drawer>
  );
}

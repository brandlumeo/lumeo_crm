"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle2, Mail, Briefcase, Calendar, Zap, Loader2 } from "lucide-react";
import { useLead, useScoreLead } from "@/lib/queries";
import { Lead } from "@/lib/types";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { formatDateTime, getDisplayName } from "@/lib/utils";
import { Drawer } from "@/components/drawer";

const statusTone: Record<string, string> = {
  new: "chip chip-neutral",
  contacted: "chip chip-warning",
  qualified: "chip chip-positive",
  lost: "chip chip-neutral",
  won: "chip chip-positive",
};

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

export default function InterceptedLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const { id } = use(params);
  const leadId = parseInt(id, 10);
  
  const { data: lead, isLoading, error } = useLead(leadId);

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
        
        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={lead.id} entityType="lead" />
          <DocumentLibrary entityId={lead.id} entityType="lead" />
        </div>
      </div>
    </Drawer>
  );
}

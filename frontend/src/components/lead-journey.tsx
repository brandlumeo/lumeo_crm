import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateLead } from "@/lib/api";
import { Lead } from "@/lib/types";
import { useCurrentCompany } from "@/lib/queries";

export function LeadJourney({ lead }: { lead: Lead }) {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();

  const stages = company?.lead_pipelines?.map((s: any) => ({
    id: s.name.toLowerCase(),
    label: s.name,
  })) || [
    { id: "new", label: "New" },
    { id: "contacted", label: "Contacted" },
    { id: "qualified", label: "Qualified" },
    { id: "won", label: "Won" },
    { id: "lost", label: "Lost" },
  ];

  const currentStageIndex = stages.findIndex((s) => s.id === lead.status);
  
  // If the lead is in a custom or unknown status not in the stages array, we handle it gracefully
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  const mutation = useMutation({
    mutationFn: (newStatus: string) => updateLead(lead.id, { status: newStatus }),
    onSuccess: () => {
      toast.success("Lead journey updated!");
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["crm", "leads"] });
    },
    onError: () => {
      toast.error("Failed to update lead status.");
    },
  });

  return (
    <div className="bg-white rounded-xl border border-line p-5 shadow-sm mb-6 animate-rise overflow-x-auto">
      <div className="flex items-center min-w-max">
        {stages.map((stage, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isLost = stage.id === "lost" && isCurrent;
          const isWon = stage.id === "won" && isCurrent;

          let iconBg = "bg-bone-2 text-muted";
          let iconBorder = "border-line";
          let lineClass = "bg-line";
          let textClass = "text-muted";

          if (isCompleted) {
            iconBg = "bg-accent text-white";
            iconBorder = "border-accent";
            lineClass = "bg-accent";
            textClass = "text-ink";
          } else if (isCurrent) {
            if (isLost) {
              iconBg = "bg-rose-500 text-white";
              iconBorder = "border-rose-500";
              textClass = "text-rose-700 font-semibold";
            } else if (isWon) {
              iconBg = "bg-emerald-500 text-white";
              iconBorder = "border-emerald-500";
              textClass = "text-emerald-700 font-semibold";
            } else {
              iconBg = "bg-accent/10 text-accent";
              iconBorder = "border-accent ring-4 ring-accent/10";
              textClass = "text-accent font-semibold";
            }
          }

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => {
                  if (mutation.isPending || isCurrent) return;
                  mutation.mutate(stage.id);
                }}
                disabled={mutation.isPending}
                className="flex flex-col items-center gap-2 group relative disabled:opacity-50 transition-all hover:-translate-y-0.5"
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${iconBg} ${iconBorder}`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-[11px] uppercase tracking-wider transition-colors ${textClass}`}>
                  {stage.label}
                </span>
              </button>

              {index < stages.length - 1 && (
                <div className="flex-1 mx-4 min-w-[40px] flex items-center mb-6">
                  <div className={`h-[2px] w-full rounded-full transition-colors ${lineClass}`} />
                  <ChevronRight className={`w-4 h-4 -ml-2 shrink-0 transition-colors ${isCompleted ? "text-accent" : "text-line"}`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

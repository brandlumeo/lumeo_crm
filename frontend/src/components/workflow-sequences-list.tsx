"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, PlayCircle, Loader2, StopCircle } from "lucide-react";
import { fetchWorkflowSequences, deleteWorkflowSequence, updateWorkflowSequence } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

export function WorkflowSequencesList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: sequencesData, isLoading } = useQuery({
    queryKey: ["crm", "workflow-sequences"],
    queryFn: () => fetchWorkflowSequences(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateWorkflowSequence(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "workflow-sequences"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflowSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "workflow-sequences"] });
      toast.success("Sequence deleted");
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-ink-3" />
      </div>
    );
  }

  const sequences = sequencesData?.results ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-6 border-b border-line bg-bone-2">
        <div>
          <h3 className="text-lg font-semibold text-ink">Sequences</h3>
          <p className="text-sm text-ink-2">Multi-step drip campaigns and workflows.</p>
        </div>
        <button
          onClick={() => router.push("/automations/builder")}
          className="btn btn-primary text-sm gap-2 bg-ink text-paper border-ink hover:bg-ink/90"
        >
          <Plus className="w-4 h-4" />
          Create Sequence
        </button>
      </div>
      <div className="p-6">
        {sequences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-ink-2 mb-4">No sequences created yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sequences.map((seq) => (
              <div key={seq.id} className="border border-line rounded-2xl p-5 bg-paper shadow-sm flex flex-col gap-4 hover:border-brand/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-ink text-[15px]">{seq.name}</h4>
                    <p className="text-[13px] text-ink-2 mt-1">Trigger: <span className="font-medium text-ink">{seq.trigger_event}</span></p>
                  </div>
                  <button
                    onClick={() => toggleMutation.mutate({ id: seq.id, is_active: !seq.is_active })}
                    className="p-1.5 hover:bg-bone-2 rounded-md transition-colors"
                    title={seq.is_active ? "Deactivate" : "Activate"}
                  >
                    {seq.is_active ? (
                      <StopCircle className="w-4 h-4 text-ink-3 hover:text-red-600" />
                    ) : (
                      <PlayCircle className="w-4 h-4 text-ink-3 hover:text-emerald-600" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${seq.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-bone text-ink-3 border border-line'}`}>
                    {seq.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[11px] text-ink-3">
                    {seq.steps.length} {seq.steps.length === 1 ? 'step' : 'steps'}
                  </span>
                </div>
                <div className="mt-auto pt-4 border-t border-line flex justify-between items-center">
                  <span className="text-[11px] text-ink-3">Updated {formatDateTime(seq.updated_at)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/automations/builder?id=${seq.id}`)}
                      className="text-ink-2 hover:text-ink p-1.5 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure?")) deleteMutation.mutate(seq.id);
                      }}
                      className="text-red-500 hover:text-red-600 p-1.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

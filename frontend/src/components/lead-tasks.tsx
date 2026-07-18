"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, MoreVertical, Trash2 } from "lucide-react";
import { fetchTaskPage, updateTask, deleteTask } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function LeadTasks({ leadId }: { leadId: number }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "lead", leadId],
    queryFn: () => fetchTaskPage({ lead: leadId, limit: 50 }),
  });

  const updateMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", "lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  if (isLoading) {
    return (
      <div className="card animate-rise space-y-3 p-5">
        <div className="h-5 bg-bone rounded w-1/4 animate-pulse"></div>
        <div className="h-10 bg-bone-2 rounded w-full animate-pulse"></div>
      </div>
    );
  }

  const tasks = data?.results || [];

  if (tasks.length === 0) return null;

  return (
    <div className="card animate-rise">
      <div className="p-5 border-b border-line flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted" />
        <h3 className="font-medium text-sm text-ink">Reminders & Tasks</h3>
      </div>
      <div className="divide-y divide-line">
        {tasks.map((task) => (
          <div key={task.id} className="p-4 flex items-start justify-between group hover:bg-bone/30 transition-colors">
            <div className="flex items-start gap-3">
              <button
                onClick={() =>
                  updateMutation.mutate({
                    id: task.id,
                    payload: { status: task.status === "done" ? "todo" : "done" },
                  })
                }
                className="mt-0.5 shrink-0 text-muted hover:text-ink transition-colors focus:outline-none"
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <div>
                <p className={`text-sm font-medium ${task.status === "done" ? "text-muted line-through" : "text-ink"}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[12px]">
                  <span className={task.due_date && new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-500 font-medium" : "text-muted"}>
                    Due: {task.due_date ? formatDateTime(task.due_date).split(',')[0] : 'No date'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider text-[10px] font-medium ${
                    task.status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                    task.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                    'bg-bone-2 text-muted'
                  }`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
            
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-1.5 text-muted hover:text-ink rounded hover:bg-bone-2 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className="w-40 z-50 bg-paper border border-line rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-200">
                  <DropdownMenu.Item
                    onClick={() => {
                      if (confirm("Delete this reminder?")) {
                        deleteMutation.mutate(task.id);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-red-500 hover:bg-red-50 cursor-pointer outline-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        ))}
      </div>
    </div>
  );
}

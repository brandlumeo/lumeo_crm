import Link from "next/link";
import { CalendarCheck2, CheckSquare } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import type { Task } from "@/lib/types";
import { cn, formatShortDate, getDisplayName } from "@/lib/utils";

const statusTone: Record<string, string> = {
  todo: "chip chip-warning",
  in_progress: "chip chip-positive",
  done: "chip chip-neutral",
};

function dueText(task: Task) {
  const today = new Date();
  const dueDate = new Date(task.due_date);
  const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return `${Math.abs(diff)} days overdue`;
  }
  if (diff === 0) {
    return "Due today";
  }
  if (diff === 1) {
    return "Due tomorrow";
  }
  return `Due ${formatShortDate(task.due_date)}`;
}

export function TasksList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="card animate-rise">
      <div className="card-head">
        <div className="card-title">
          Today&apos;s tasks
          <span className="card-title-meta">{tasks.length} visible</span>
        </div>
        <Link href="/tasks" className="btn px-2.5 py-1 text-xs">
          View tasks
        </Link>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No upcoming tasks"
          description="Tasks due soon will show up here once your team starts scheduling follow-ups in Lumeo."
        />
      ) : (
        <div className="py-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-5 py-3 border-b border-line-2 last:border-b-0 hover:bg-bone-2 transition-colors"
            >
              <div className="w-1 h-7 rounded-sm shrink-0 bg-gold" />
              <div className="w-[18px] h-[18px] border border-line rounded-md shrink-0 grid place-items-center text-muted">
                <CalendarCheck2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-ink">{task.title}</div>
                <div className="text-[11px] text-muted mt-0.5 flex flex-wrap gap-2.5">
                  <span className={cn("font-mono", new Date(task.due_date) < new Date() && "text-accent")}>
                    {dueText(task)}
                  </span>
                  <span>{getDisplayName(task.assigned_to)}</span>
                </div>
              </div>
              <span className={statusTone[task.status] ?? "chip chip-neutral"}>
                {task.status.replaceAll("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

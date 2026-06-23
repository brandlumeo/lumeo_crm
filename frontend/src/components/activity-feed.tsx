import { Activity, BellRing } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { formatDateTime, getInitials } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  actor: string;
  body: string;
  timestamp: string;
  tone: "accent" | "green" | "blue" | "gold";
}

const toneClasses: Record<ActivityItem["tone"], string> = {
  accent: "bg-accent-soft text-accent",
  green: "bg-green-soft text-green",
  blue: "bg-blue-soft text-blue",
  gold: "bg-gold-soft text-gold",
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="card animate-rise">
      <div className="card-head">
        <div className="card-title">Activity</div>
        <div className="chip chip-neutral">{items.length} recent updates</div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="New leads, deals, tasks, and notes will show up here as your team starts using Lumeo."
        />
      ) : (
        <div className="py-1.5 max-h-80 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 px-5 py-3 hover:bg-bone-2 transition-colors"
            >
              <div
                className={`w-7 h-7 rounded-full grid place-items-center text-[11px] font-medium shrink-0 ${toneClasses[item.tone]}`}
              >
                {getInitials(item.actor)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-ink-2 leading-snug">
                  <strong className="text-ink">{item.actor}</strong> {item.body}
                </div>
                <div className="font-mono text-[10.5px] text-muted mt-0.5">
                  {formatDateTime(item.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

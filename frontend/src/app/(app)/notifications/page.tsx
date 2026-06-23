"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Filter } from "lucide-react";

import { useNotifications } from "@/lib/queries";
import { markNotificationsRead } from "@/lib/api";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const typeTone: Record<string, string> = {
  lead_assigned: "chip chip-neutral",
  deal_won: "chip chip-positive",
  task_due: "chip chip-warning",
  subscription_expiring: "chip chip-warning",
  subscription_upgraded: "chip chip-positive",
  general: "chip chip-neutral",
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterDate, setFilterDate] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
  const [mounted, setMounted] = useState(false);
  const LIMIT = 20;

  // We'll just put useEffect inside the component
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useNotifications({ 
    date: filterDate || undefined,
    limit: LIMIT,
    offset: pageOffset
  });

  const markMutation = useMutation({
    mutationFn: (ids?: number[]) => markNotificationsRead(ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Notifications"
      title="History & Alerts."
      description="View and filter all past notifications and system alerts."
      actions={[
        {
          label: "Mark all as read",
          onClick: () => markMutation.mutate(undefined),
        }
      ]}
    >
      <div className="card animate-rise mb-6 p-5 flex flex-wrap gap-4 items-end">
        <label className="flex-1 min-w-[200px]">
          <span className="label">Filter by Date</span>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="date"
              className="input pl-9"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setPageOffset(0);
              }}
            />
          </div>
        </label>
        {filterDate && (
          <button 
            className="btn mb-0.5" 
            onClick={() => {
              setFilterDate("");
              setPageOffset(0);
            }}
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="card animate-rise overflow-hidden">
        {!mounted || isLoading ? (
          <div className="p-10 text-center text-muted">Loading notifications...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You don't have any notifications matching this filter."
          />
        ) : (
          <div className="divide-y divide-line">
            {rows.map((notification: Notification) => (
              <div 
                key={notification.id} 
                className={`p-5 flex flex-col sm:flex-row gap-4 justify-between transition-colors ${notification.is_read ? "bg-paper opacity-80" : "bg-accent-soft/30"}`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={typeTone[notification.notification_type] || "chip chip-neutral"}>
                      {notification.notification_type.replaceAll("_", " ")}
                    </span>
                    {!notification.is_read && (
                      <span className="text-[10px] uppercase font-bold text-accent tracking-wider">
                        New
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-[15px] text-ink">{notification.title}</h3>
                  <p className="text-[13px] text-muted mt-1 leading-relaxed max-w-2xl">
                    {notification.body}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end justify-between gap-3 min-w-[140px] shrink-0">
                  <span className="text-[12px] text-muted whitespace-nowrap">
                    {formatDateTime(notification.created_at)}
                  </span>
                  {!notification.is_read && (
                    <button
                      onClick={() => markMutation.mutate([notification.id])}
                      className="text-[12px] font-medium text-ink hover:text-accent flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-line flex items-center justify-between text-sm text-muted bg-bone-2/30">
          <div>
            Showing {rows.length > 0 ? pageOffset + 1 : 0} to {pageOffset + rows.length} of {data?.count ?? 0}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pageOffset === 0}
              onClick={() => setPageOffset((p) => Math.max(0, p - LIMIT))}
              className="btn"
            >
              Previous
            </button>
            <button
              disabled={!data?.next}
              onClick={() => setPageOffset((p) => p + LIMIT)}
              className="btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

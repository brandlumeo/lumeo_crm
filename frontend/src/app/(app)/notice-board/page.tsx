"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useNotices, useCreateNotice, useUpdateNotice, useDeleteNotice, useCurrentUser } from "@/lib/queries";
import { ClipboardList, Plus, Loader2, Pin, PinOff, Trash2, Search, X, Megaphone, Bell, Calendar } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { cn } from "@/lib/utils";

function timeAgo(dt: string) {
  const diff = Date.now() - new Date(dt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins === 0 ? "Just now" : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dt).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4 animate-rise">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-muted mb-0.5">{label}</div>
        <div className="text-2xl font-semibold text-ink leading-none">{value}</div>
        {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function NoticeBoardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", content: "", is_pinned: false });

  const { data: user } = useCurrentUser();
  const { data, isLoading } = useNotices({ search: search || undefined });
  const createMutation = useCreateNotice();
  const updateMutation = useUpdateNotice();
  const deleteMutation = useDeleteNotice();

  const notices = data?.results ?? [];
  const isManagerOrAbove = user?.role === "owner" || user?.role === "admin" || user?.role === "manager" || user?.has_management_access;

  // Stats
  const { data: allData } = useNotices({ page: 1, limit: 1000 });
  const allNotices: any[] = allData?.results ?? [];

  const stats = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: allData?.count ?? 0,
      pinned: allNotices.filter((n) => n.is_pinned).length,
      recent: allNotices.filter((n) => new Date(n.created_at).getTime() > oneWeekAgo).length,
    };
  }, [allNotices, allData]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form, {
      onSuccess: () => {
        setIsModalOpen(false);
        setForm({ title: "", content: "", is_pinned: false });
        toast.success("Notice posted successfully.");
      },
      onError: () => toast.error("Failed to post notice."),
    });
  };

  const handleTogglePin = (id: number, currentStatus: boolean) => {
    updateMutation.mutate(
      { id, payload: { is_pinned: !currentStatus } },
      {
        onSuccess: () => toast.success(currentStatus ? "Notice unpinned." : "Notice pinned."),
        onError: () => toast.error("Failed to update pin status."),
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this notice?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Notice deleted."),
        onError: () => toast.error("Failed to delete notice."),
      });
    }
  };

  return (
    <PageShell
      eyebrow="Internal Communications"
      title="Notice Board"
      description="Stay up to date with company announcements, policy updates, and team news."
    >
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <StatCard
          icon={ClipboardList}
          label="Total Notices"
          value={stats.total}
          sub="all time"
          color="bg-slate-100 text-slate-600"
        />
        <StatCard
          icon={Pin}
          label="Pinned"
          value={stats.pinned}
          sub="important updates"
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Bell}
          label="New This Week"
          value={stats.recent}
          sub="recent announcements"
          color="bg-blue-50 text-blue-600"
        />
      </div>

      {/* ── Main card ── */}
      <div className="card animate-rise">
        {/* Card header */}
        <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="card-title">
            <Megaphone className="w-5 h-5 text-muted" /> All Announcements
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto ml-auto">
            {/* Search */}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input sm:w-[260px]"
              placeholder="Search notices..."
            />
            {/* Clear filters */}
            {search && (
              <button onClick={() => setSearch("")} className="btn btn-ghost text-muted text-xs gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            {/* Add new */}
            {isManagerOrAbove && (
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary gap-2 text-sm ml-2">
                <Plus className="w-4 h-4" /> Post Notice
              </button>
            )}
          </div>
        </div>

        {/* Feed List */}
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-bone border border-line rounded-xl animate-pulse" />
              ))}
            </div>
          ) : notices.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={search ? "No notices match your search" : "No notices posted"}
              description={
                search
                  ? "Try using different keywords."
                  : "Post your first notice to keep the team informed."
              }
            />
          ) : (
            <div className="flex flex-col gap-5">
              {notices.map((notice: any) => (
                <div
                  key={notice.id}
                  className={cn(
                    "rounded-xl p-5 relative group transition-all duration-200",
                    notice.is_pinned 
                      ? "bg-amber-50/50 border border-amber-200 shadow-sm" 
                      : "bg-paper border border-line hover:shadow-sm"
                  )}
                >
                  {/* Pin Indicator */}
                  {notice.is_pinned && (
                    <div className="absolute -top-3 -right-2">
                      <div className="bg-amber-100 text-amber-700 p-2 rounded-full shadow-sm border border-amber-200 transform rotate-12 group-hover:rotate-0 transition-transform">
                        <Pin className="w-4 h-4 fill-amber-700" />
                      </div>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {notice.is_pinned && (
                          <span className="chip chip-warning text-[10px] uppercase tracking-wider py-0 px-1.5">Pinned</span>
                        )}
                        <h3 className={cn("text-lg font-semibold", notice.is_pinned ? "text-amber-900" : "text-ink")}>
                          {notice.title}
                        </h3>
                      </div>
                      
                      <div className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap font-sans",
                        notice.is_pinned ? "text-amber-800/80" : "text-ink-2"
                      )}>
                        {notice.content}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {isManagerOrAbove && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-paper/80 backdrop-blur-sm rounded-lg p-1 border border-line shadow-sm">
                        <button
                          onClick={() => handleTogglePin(notice.id, notice.is_pinned)}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            notice.is_pinned ? "text-amber-600 hover:bg-amber-100" : "text-muted hover:text-ink hover:bg-bone-2"
                          )}
                          title={notice.is_pinned ? "Unpin notice" : "Pin notice"}
                        >
                          {notice.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(notice.id)}
                          className="p-1.5 rounded-md text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete notice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-line/60">
                    {notice.author && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-ink/10 text-ink flex items-center justify-center text-[10px] font-bold">
                          {(notice.author.first_name?.[0] ?? notice.author.username?.[0] ?? "?").toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-ink">
                          {notice.author.first_name || notice.author.username}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted ml-auto">
                      <Calendar className="w-3.5 h-3.5" />
                      {timeAgo(notice.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Create notice modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form 
            onSubmit={handleCreate} 
            className="relative w-full max-w-xl bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/10 flex flex-col overflow-hidden animate-rise"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-bone shrink-0">
              <div>
                <div className="text-lg font-semibold text-ink">Post Notice</div>
                <div className="text-xs text-muted mt-0.5">Share announcements with the entire company.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 min-h-0">
              <label>
                  <span className="label">Title *</span>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input"
                    placeholder="E.g., Q3 All Hands Meeting"
                  />
                </label>

                <label>
                  <span className="label">Content *</span>
                  <textarea
                    required
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={6}
                    className="input resize-y"
                    placeholder="Write your full announcement here..."
                  />
                </label>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 border border-line rounded-lg bg-bone-2/50 cursor-pointer hover:bg-bone-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.is_pinned}
                      onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                      className="w-4 h-4 rounded border-line text-ink focus:ring-ink/20 cursor-pointer accent-ink"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-ink flex items-center gap-1.5">
                        <Pin className="w-4 h-4 text-muted" /> Pin this notice
                      </span>
                      <span className="text-xs text-muted">Pinned notices stay highlighted and float to the top of the board.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-line bg-bone flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn btn-primary text-sm gap-2"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</>
                  ) : (
                    <><Megaphone className="w-4 h-4" /> Post Notice</>
                  )}
                </button>
              </div>
          </form>
        </div>
      )}
    </PageShell>
  );
}

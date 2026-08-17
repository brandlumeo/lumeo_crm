"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { CheckSquare, Square, 
  Calendar,
  Plus,
  Loader2,
  Trash2,
  MapPin,
  Video,
  Clock,
  Search,
  X,
  ExternalLink,
  Users,
  CalendarDays
} from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { SkeletonTable } from "@/components/skeleton-table";
import { PageShell } from "@/components/page-shell";
import { useEvents, useCreateEvent, useDeleteEvent } from "@/lib/queries";

const PAGE_SIZE = 20;

function formatDateTimeLocal(dt: string) {
  if (!dt) return "";
  return new Date(dt).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDuration(start: string, end: string) {
  if (!start || !end) return "";
  const dStart = new Date(start).getTime();
  const dEnd = new Date(end).getTime();
  const diffMins = Math.round((dEnd - dStart) / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
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
    <div className="bg-paper border border-line rounded-2xl shadow-sm p-5 flex items-center gap-4 animate-rise">
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

// ── Event detail slide-over ────────────────────────────────────────────────

function EventDrawer({
  event,
  onClose,
  onDelete,
}: {
  event: any;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const isPast = new Date(event.end_time).getTime() < Date.now();

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[440px] bg-paper border-l border-line shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-bone shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Event Detail</span>
              {isPast && <span className="chip chip-neutral text-[10px] py-0 px-1.5">Past</span>}
              {!isPast && <span className="chip chip-info text-[10px] py-0 px-1.5">Upcoming</span>}
            </div>
            <div className="text-xl font-semibold text-ink">{event.title}</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Format indicator */}
          <div className="flex items-center gap-2 mb-2">
            {event.is_virtual ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <Video className="w-3.5 h-3.5" /> Virtual Event
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                <MapPin className="w-3.5 h-3.5" /> In-Person Event
              </span>
            )}
          </div>

          {/* Time block */}
          <div className="surface-muted p-4 flex gap-4">
            <div className="w-12 h-12 bg-bone border border-line rounded-lg flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{new Date(event.start_time).toLocaleString("en-IN", { month: "short" })}</span>
              <span className="text-lg font-bold text-ink leading-none mt-0.5">{new Date(event.start_time).getDate()}</span>
            </div>
            <div>
              <div className="text-sm font-medium text-ink flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted" />
                {new Date(event.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} — {new Date(event.end_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-xs text-muted mt-1 flex items-center gap-1.5">
                Duration: <span className="font-medium text-ink-2">{getDuration(event.start_time, event.end_time)}</span>
              </div>
            </div>
          </div>

          {/* Location / Link */}
          <div>
            <div className="text-[10px] font-medium text-muted uppercase tracking-widest mb-2">Location</div>
            {event.is_virtual ? (
              event.virtual_link ? (
                <a href={event.virtual_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 border border-blue-200 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium hover:bg-blue-100 transition-colors group">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span className="truncate">{event.virtual_link}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : (
                <span className="text-sm text-muted italic">No virtual link provided</span>
              )
            ) : (
              event.location ? (
                <div className="flex items-start gap-2 p-3 border border-line bg-bone-2 rounded-lg text-sm text-ink-2">
                  <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                  <span>{event.location}</span>
                </div>
              ) : (
                <span className="text-sm text-muted italic">No location provided</span>
              )
            )}
          </div>

          {/* Organizer */}
          {event.organizer && (
            <div>
              <div className="text-[10px] font-medium text-muted uppercase tracking-widest mb-2">Organizer</div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-bold shadow-sm">
                  {(event.organizer.first_name?.[0] ?? event.organizer.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">{event.organizer.first_name || event.organizer.username}</div>
                  <div className="text-xs text-muted">{event.organizer.email || "System User"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <div className="text-[10px] font-medium text-muted uppercase tracking-widest mb-2">Description</div>
              <div className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-line bg-bone shrink-0 flex justify-between items-center">
          <button
            onClick={() => {
              if (confirm(`Delete event "${event.title}"?`)) {
                onDelete(event.id);
                onClose();
              }
            }}
            className="btn btn-ghost text-red-500 hover:bg-red-50 hover:border-red-200 text-sm"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <button onClick={onClose} className="btn btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState("start_time");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // New event form
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    is_virtual: false,
    virtual_link: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => { setMounted(true); }, []);

  const params: any = {
    page,
    search: search || undefined,
    ordering: sortDirection === "desc" ? `-${sortColumn}` : sortColumn,
  };

  const { data, isLoading } = useEvents(params);
  const createMutation = useCreateEvent();
  const deleteMutation = useDeleteEvent();

  const events: any[] = data?.results ?? [];
  const total = data?.count ?? 0;

  // Stats
  const { data: allData } = useEvents({ page: 1, limit: 1000 });
  const allEvents: any[] = allData?.results ?? [];

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: allData?.count ?? 0,
      upcoming: allEvents.filter((e) => new Date(e.start_time).getTime() > now).length,
      virtual: allEvents.filter((e) => e.is_virtual).length,
      inPerson: allEvents.filter((e) => !e.is_virtual).length,
    };
  }, [allEvents, allData]);

  // Handlers
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form, {
      onSuccess: () => {
        setIsModalOpen(false);
        setForm({ title: "", description: "", location: "", is_virtual: false, virtual_link: "", start_time: "", end_time: "" });
        toast.success("Event scheduled successfully.");
      },
      onError: () => toast.error("Failed to schedule event."),
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Event deleted."),
      onError: () => toast.error("Could not delete event."),
    });
  };

  const clearFilters = () => {
    setSearch("");
    setPage(1);
  };

  return (
    <PageShell
      eyebrow="Company Schedule"
      title="Events & Meetings"
      description="Schedule, track, and join company events, webinars, and meetings."
    >
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={CalendarDays}
          label="Total Events"
          value={stats.total}
          sub="all time"
          color="bg-slate-100 text-slate-600"
        />
        <StatCard
          icon={Clock}
          label="Upcoming"
          value={stats.upcoming}
          sub="scheduled"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Video}
          label="Virtual"
          value={stats.virtual}
          sub="online meetings"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Users}
          label="In Person"
          value={stats.inPerson}
          sub="physical locations"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* ── Main card ── */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden shadow-sm animate-rise flex flex-col">
        {/* Card header */}
        <div className="p-5 border-b border-line bg-bone-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-ink">Event Schedule</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-ink/5 text-ink/60 text-xs font-medium">
                {total} total
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="input sm:w-[260px]"
                  placeholder="Search by title or location..."
                />
              </div>
              {search && (
                <button onClick={clearFilters} className="btn btn-ghost text-muted text-xs gap-1">
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <div className="w-px h-6 bg-line mx-1 hidden sm:block"></div>
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary gap-2 text-sm bg-ink text-paper border-ink hover:bg-ink/90">
                <Plus className="w-4 h-4" /> New Event
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {!mounted || (isLoading && !data) ? (
          <SkeletonTable columns={5} rows={8} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={search ? "No events match your search" : "No events scheduled"}
            description={
              search
                ? "Try adjusting your search query."
                : "Schedule your first event using the 'New Event' button."
            }
          />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bone-2 border-b border-line text-xs uppercase tracking-[0.12em] text-muted font-semibold">
                {selectedIds.size > 0 ? (
                  <tr>
                    <th colSpan={7} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedIds(new Set())}
                            className="p-1.5 rounded-md hover:bg-bone transition-colors text-ink"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <span className="font-medium text-ink lowercase tracking-normal text-sm">
                            <span className="font-semibold">{selectedIds.size}</span> selected
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (!confirm(`Delete ${selectedIds.size} event(s)?`)) return;
                              Array.from(selectedIds).forEach((id) => deleteMutation.mutate(id));
                              toast.success(`Deleted ${selectedIds.size} event(s).`);
                              setSelectedIds(new Set());
                            }}
                            className="btn btn-secondary text-xs py-1.5 h-auto bg-paper border-line hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </button>
                        </div>
                      </div>
                    </th>
                  </tr>
                ) : (
                <tr>
                  <th className="px-5 py-4 w-12 text-center">
                    <button
                      onClick={() => {
                        if (selectedIds.size === events.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(events.map((e) => e.id)));
                        }
                      }}
                      className="text-muted hover:text-ink transition-colors"
                    >
                      {selectedIds.size === events.length && events.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-4 font-medium w-full min-w-[250px]">Event</th>
                  <th className="px-5 py-4 font-medium">Date & Time</th>
                  <th className="px-5 py-4 font-medium">Format & Location</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Organizer</th>
                </tr>
                )}
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((event) => {
                  const isPast = new Date(event.end_time).getTime() < Date.now();
                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="hover:bg-bone-2/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 text-center" onClick={(e) => { e.stopPropagation(); const next = new Set(selectedIds); if (next.has(event.id)) { next.delete(event.id); } else { next.add(event.id); } setSelectedIds(next); }}>
                        <button className="text-muted hover:text-ink transition-colors focus:outline-none">
                          {selectedIds.has(event.id) ? (
                            <CheckSquare className="w-4 h-4 text-ink" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-normal">
                        <div className="max-w-[300px]">
                          <div className="font-semibold text-ink group-hover:text-brand transition-colors line-clamp-1">
                            {event.title}
                          </div>
                          {event.description && (
                            <div className="text-[11px] text-muted truncate mt-0.5">
                              {event.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted shrink-0" />
                          {new Date(event.start_time).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5 ml-5">
                          {new Date(event.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-normal">
                        {event.is_virtual ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/50 uppercase tracking-wider">
                              <Video className="w-3 h-3" /> Virtual
                            </span>
                            {event.virtual_link && (
                              <div className="text-[11px] text-muted truncate max-w-[200px]">
                                {event.virtual_link}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50 uppercase tracking-wider">
                              <MapPin className="w-3 h-3" /> In-Person
                            </span>
                            {event.location && (
                              <div className="text-[11px] text-muted truncate max-w-[200px]">
                                {event.location}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isPast ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-widest">
                            Past
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-bold uppercase tracking-widest">
                            Upcoming
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {!event.organizer ? (
                          <span className="text-muted italic text-xs">System</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-ink/10 text-ink flex items-center justify-center text-[10px] font-bold">
                              {(event.organizer.first_name?.[0] ?? event.organizer.username?.[0] ?? "?").toUpperCase()}
                            </div>
                            <span className="text-sm text-ink">{event.organizer.first_name || event.organizer.username}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!isLoading && events.length > 0 && (
          <div className="px-5 py-4 border-t border-line bg-bone flex items-center justify-between text-sm">
             <div className="text-muted">
               Showing <span className="font-medium text-ink">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium text-ink">{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-medium text-ink">{total}</span> results
             </div>
             <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="btn btn-secondary py-1.5 px-3 text-xs"
                >
                  Previous
                </button>
                <button
                  disabled={page * PAGE_SIZE >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="btn btn-secondary py-1.5 px-3 text-xs"
                >
                  Next
                </button>
             </div>
          </div>
        )}
      </div>
      {/* ── Event detail slide-over ── */}
      {selectedEvent && (
        <EventDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDelete}
        />
      )}

      {/* ── Create event modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <form 
            onSubmit={handleCreate} 
            className="relative w-full max-w-xl bg-paper border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-rise"
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-bone shrink-0">
              <div>
                <div className="text-lg font-semibold text-ink">New Event</div>
                <div className="text-xs text-muted mt-0.5">Schedule a team meeting, webinar, or physical event.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-bone-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              <label>
                  <span className="label">Title *</span>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input"
                    placeholder="Event name"
                  />
                </label>

                <label>
                  <span className="label">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="input resize-y"
                    placeholder="Agenda, prerequisites..."
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <span className="label">Start Time *</span>
                    <input
                      required
                      type="datetime-local"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="input"
                    />
                  </label>
                  <label>
                    <span className="label">End Time *</span>
                    <input
                      required
                      type="datetime-local"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="input"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 p-3 border border-line rounded-lg bg-bone-2/50 cursor-pointer hover:bg-bone-2 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.is_virtual}
                      onChange={(e) => setForm({ ...form, is_virtual: e.target.checked })}
                      className="w-4 h-4 rounded border-line text-ink focus:ring-ink/20 cursor-pointer accent-ink"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-ink flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-muted" /> Virtual Event
                      </span>
                      <span className="text-xs text-muted">This event takes place online via a meeting link.</span>
                    </div>
                  </label>
                </div>

                {form.is_virtual ? (
                  <label className="animate-fade-in block">
                    <span className="label">Meeting Link</span>
                    <div className="relative">
                      <ExternalLink className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={form.virtual_link}
                        onChange={(e) => setForm({ ...form, virtual_link: e.target.value })}
                        placeholder="https://meet.google.com/..."
                        className="input pl-9"
                      />
                    </div>
                  </label>
                ) : (
                  <label className="animate-fade-in block">
                    <span className="label">Location</span>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="Conference room, address..."
                        className="input pl-9"
                      />
                    </div>
                  </label>
                )}
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</>
                  ) : (
                    <><Calendar className="w-4 h-4" /> Schedule Event</>
                  )}
                </button>
              </div>
          </form>
        </div>
      )}
    </PageShell>
  );
}

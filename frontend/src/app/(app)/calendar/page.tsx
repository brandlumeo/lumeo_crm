"use client";

import { useState, useMemo, useEffect } from "react";
import { useEvents, useCreateEvent } from "@/lib/queries";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, MapPin, Video, Info, Calendar as CalendarIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { PageShell } from "@/components/page-shell";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");

  const { data: eventsData, isLoading } = useEvents();
  const createEventMutation = useCreateEvent();
  const events = eventsData?.results ?? [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const isInvalidTime = startDate && endDate && startTime && endTime ? new Date(`${startDate}T${startTime}`) >= new Date(`${endDate}T${endTime}`) : false;
  const isSubmitDisabled = createEventMutation.isPending || !title || !startDate || !endDate || isInvalidTime;
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState("");

  useEffect(() => {
    if (isAddModalOpen) {
      const year = viewDate.year;
      const month = String(viewDate.month + 1).padStart(2, '0');
      const day = String(selectedDay || today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      setStartDate(dateStr);
      setEndDate(dateStr);
      
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const endHour = new Date(nextHour);
      endHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      
      setStartTime(nextHour.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setEndTime(endHour.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isAddModalOpen, selectedDay, viewDate.year, viewDate.month]);

  const eventMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of events) {
      const d = new Date(ev.start_time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month);
  const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month);

  const prevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
    setSelectedDay(null);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setStartDate(`${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setEndDate(`${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !startTime || !endDate || !endTime) return;

    const start_time = new Date(`${startDate}T${startTime}:00`).toISOString();
    const end_time = new Date(`${endDate}T${endTime}:00`).toISOString();

    createEventMutation.mutate(
      { title, description, location, is_virtual: isVirtual, virtual_link: virtualLink, start_time, end_time },
      {
        onSuccess: () => {
          toast.success("Event created successfully!");
          setIsAddModalOpen(false);
          setTitle("");
          setDescription("");
          setLocation("");
          setVirtualLink("");
          setIsVirtual(false);
        },
        onError: () => {
          toast.error("Failed to create event.");
        }
      }
    );
  };

  const selectedKey = selectedDay !== null ? `${viewDate.year}-${viewDate.month}-${selectedDay}` : null;
  const selectedEvents = selectedKey ? (eventMap[selectedKey] ?? []) : [];

  const isToday = (day: number) =>
    day === today.getDate() && viewDate.month === today.getMonth() && viewDate.year === today.getFullYear();

  return (
    <PageShell
      eyebrow="Work"
      title="My Calendar"
      description="Manage your schedule and upcoming meetings."
      actions={
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-ink text-paper px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      }
    >
      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[600px] lg:h-[calc(100vh-220px)] animate-rise">
        
        {/* Left Side - Calendar Grid */}
        <div className="flex-1 flex flex-col overflow-hidden bg-paper">
          {/* Calendar Controls */}
          <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-line bg-bone/30">
            <h2 className="font-serif text-[22px] text-ink">{MONTH_NAMES[viewDate.month]} {viewDate.year}</h2>
            <div className="flex items-center gap-1 bg-bone p-1 rounded-lg border border-line shadow-sm">
              <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-paper transition-all text-muted hover:text-ink">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => { setViewDate({ year: today.getFullYear(), month: today.getMonth() }); setSelectedDay(today.getDate()); }} 
                className="px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper rounded-md transition-all"
              >
                Today
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-paper transition-all text-muted hover:text-ink">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Headers */}
          <div className="shrink-0 grid grid-cols-7 border-b border-line bg-bone-2">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-3 text-center text-[11px] font-medium text-muted uppercase tracking-[0.12em]">
                {d}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 grid grid-cols-7 auto-rows-[minmax(90px,1fr)] lg:auto-rows-fr overflow-y-auto bg-line/20 gap-px">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-bone/40" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${viewDate.year}-${viewDate.month}-${day}`;
              const dayEvents = eventMap[key] ?? [];
              const isSelected = selectedDay === day;
              const isTod = isToday(day);

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "group bg-paper p-2 cursor-pointer transition-colors relative hover:bg-bone-2/50",
                    isSelected ? "bg-bone/60" : ""
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "inline-flex w-7 h-7 items-center justify-center rounded-full text-sm transition-all",
                      isTod 
                        ? "bg-ink text-paper font-semibold shadow-sm" 
                        : isSelected 
                          ? "bg-bone-2 text-ink font-medium border border-line" 
                          : "text-muted group-hover:text-ink"
                    )}>
                      {day}
                    </span>
                    <div className="flex items-center gap-1">
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-muted font-medium pr-1">{dayEvents.length}</span>
                      )}
                      <button 
                        className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded hover:bg-bone-2 text-muted hover:text-ink transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedDay(day); setIsAddModalOpen(true); }}
                        title="Add Event"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev: any, idx: number) => (
                      <div key={ev.id} className="group/ev relative">
                        <div className={cn(
                          "text-[11px] font-medium leading-tight rounded-[4px] px-2 py-1 truncate transition-colors border-l-2",
                          idx % 3 === 0 ? "bg-blue-50/50 text-blue-700 border-l-blue-400 hover:bg-blue-50" : 
                          idx % 3 === 1 ? "bg-emerald-50/50 text-emerald-700 border-l-emerald-400 hover:bg-emerald-50" :
                          "bg-amber-50/50 text-amber-700 border-l-amber-400 hover:bg-amber-50"
                        )}>
                          {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(' AM', 'a').replace(' PM', 'p')} - {ev.title}
                        </div>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-medium text-muted px-1 mt-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Fill remaining empty cells to keep grid clean */}
            {Array.from({ length: 42 - (firstDay + daysInMonth) }).map((_, i) => (
               <div key={`end-empty-${i}`} className="bg-bone/40 hidden lg:block" />
            ))}
          </div>
        </div>

        {/* Right Sidebar - Day Details */}
        <div className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-line bg-bone/20 flex flex-col">
          <div className="p-6 border-b border-line/50">
            <h3 className="font-serif text-[20px] text-ink mb-1">
              {selectedDay ? `${MONTH_NAMES[viewDate.month]} ${selectedDay}, ${viewDate.year}` : `${MONTH_NAMES[viewDate.month]} ${viewDate.year} Overview`}
            </h3>
            <p className="text-[13px] text-muted">
              {selectedDay 
                ? (selectedEvents.length > 0 
                    ? `You have ${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'} scheduled.` 
                    : "Your schedule is clear for this day.")
                : "Select a specific date to view its schedule."}
            </p>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {selectedDay !== null && (
              <div className="space-y-4">
                {selectedEvents.map((ev: any, idx: number) => {
                   const borderClass = idx % 3 === 0 ? "border-l-blue-400" : idx % 3 === 1 ? "border-l-emerald-400" : "border-l-amber-400";
                   const iconBgClass = idx % 3 === 0 ? "bg-blue-50 text-blue-600" : idx % 3 === 1 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600";
                   
                   return (
                    <div key={ev.id} className={cn("group bg-paper rounded-xl p-5 border border-line shadow-sm hover:shadow-md transition-all border-l-[3px]", borderClass)}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-ink pr-4 leading-tight text-[15px]">{ev.title}</h4>
                      </div>
                      
                      {ev.description && (
                        <p className="text-[13px] text-muted mb-4 line-clamp-3 leading-relaxed">{ev.description}</p>
                      )}
                      
                      <div className="space-y-2 mt-4 pt-4 border-t border-line/50">
                        <div className="flex items-center gap-2.5 text-[12px] text-ink">
                          <div className={cn("p-1.5 rounded-md", iconBgClass)}>
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium">
                            {new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(ev.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        
                        {(ev.location || (!ev.location && !ev.is_virtual)) && (
                          <div className="flex items-center gap-2.5 text-[12px] text-muted">
                            <div className="p-1.5 rounded-md bg-bone">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <span>{ev.location || "No location specified"}</span>
                          </div>
                        )}
                        
                        {ev.is_virtual && (
                          <div className="flex items-center gap-2.5 text-[12px]">
                            <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                            {ev.virtual_link ? (
                              <a href={ev.virtual_link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">
                                Join Virtual Meeting
                              </a>
                            ) : (
                              <span className="text-muted">Virtual Meeting</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedEvents.length === 0 && (
                  <div className="text-center py-12 px-6 border border-line rounded-xl bg-paper shadow-sm">
                    <div className="w-12 h-12 bg-bone rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="w-5 h-5 text-muted" />
                    </div>
                    <h4 className="text-[14px] font-medium text-ink mb-1">No events scheduled</h4>
                    <p className="text-[12px] text-muted mb-6 leading-relaxed">Enjoy your free time or schedule a new event to stay productive.</p>
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-bone border border-line text-ink text-xs font-medium rounded-lg hover:bg-bone-2 transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Event
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper border border-line rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-rise max-h-[90vh]">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-line bg-bone">
              <h2 className="text-lg font-semibold text-ink">Schedule New Event</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-bone-2 rounded-full transition-colors text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="event-form" onSubmit={handleCreateEvent} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Event Title *</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="e.g. Client Discovery Call" className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">Start Date *</label>
                    <input required value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">Start Time *</label>
                    <input required value={startTime} onChange={e => setStartTime(e.target.value)} type="time" className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">End Date *</label>
                    <input required value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">End Time *</label>
                    <input required value={endTime} onChange={e => setEndTime(e.target.value)} type="time" className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Location</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} type="text" placeholder="e.g. Conference Room A" className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors" />
                </div>

                <div className="p-4 rounded-xl border border-line bg-bone/50 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isVirtual} onChange={e => setIsVirtual(e.target.checked)} className="w-4 h-4 rounded border-line text-ink focus:ring-ink" />
                    <span className="text-[13px] font-medium text-ink">This is a virtual meeting</span>
                  </label>
                  
                  {isVirtual && (
                    <div className="space-y-1.5 pl-7 animate-fade-in">
                      <label className="text-[12px] font-medium text-muted">Meeting Link</label>
                      <input value={virtualLink} onChange={e => setVirtualLink(e.target.value)} type="url" placeholder="https://zoom.us/j/123456789" className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[13px] font-medium text-ink order-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Add notes, agenda, or context..." className="w-full px-3 py-2 border border-line bg-bone rounded-lg text-sm focus:outline-none focus:border-ink transition-colors resize-none order-2" />
                </div>
              </form>
            </div>
            
            <div className="shrink-0 px-6 py-4 border-t border-line bg-bone flex justify-end gap-3 items-center">
              {isInvalidTime && <span className="text-xs text-red-500 mr-auto font-medium">End time must be after start time</span>}
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-ink hover:bg-bone-2 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="event-form" disabled={isSubmitDisabled} className={cn("flex items-center justify-center min-w-[120px] px-4 py-2 bg-ink text-bone text-sm font-medium rounded-lg hover:bg-ink/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed", isSubmitDisabled ? "opacity-50" : "")}>
                {createEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

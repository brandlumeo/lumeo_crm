"use client";

import { useState, useMemo, useEffect } from "react";
import { useEvents, useCreateEvent } from "@/lib/queries";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, MapPin, Video, Info, Calendar as CalendarIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  
  // Use a useEffect below to seed these when the modal opens
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");

  const { data: eventsData, isLoading } = useEvents();
  const createEventMutation = useCreateEvent();
  const events = eventsData?.results ?? [];

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState("");

  // Update form defaults when modal opens based on current calendar selection
  useEffect(() => {
    if (isAddModalOpen) {
      const year = viewDate.year;
      const month = String(viewDate.month + 1).padStart(2, '0');
      const day = String(selectedDay || today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      setStartDate(dateStr);
      setEndDate(dateStr);
      
      // Auto-adjust times to next hour
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const endHour = new Date(nextHour);
      endHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      
      setStartTime(nextHour.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setEndTime(endHour.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isAddModalOpen, selectedDay, viewDate.year, viewDate.month]);

  // Build calendar event map: date string → events[]
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
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-bone animate-fade-in">
      {/* Header Bar */}
      <div className="shrink-0 border-b border-line bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-brand/10 text-brand rounded-xl border border-brand/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-ink tracking-tight">My Calendar</h1>
            <p className="text-muted text-[13px] mt-0.5">Manage your schedule and upcoming meetings.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Calendar Grid Container */}
        <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden bg-white">
          {/* Calendar Controls */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-line">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-ink w-48">{MONTH_NAMES[viewDate.month]} {viewDate.year}</h2>
              <div className="flex items-center gap-1 bg-bone p-1 rounded-lg border border-line">
                <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-muted hover:text-ink">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setViewDate({ year: today.getFullYear(), month: today.getMonth() }); setSelectedDay(today.getDate()); }} 
                  className="px-3 py-1.5 text-xs font-medium text-ink hover:bg-white hover:shadow-sm rounded-md transition-all"
                >
                  Today
                </button>
                <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all text-muted hover:text-ink">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid Headers */}
          <div className="shrink-0 grid grid-cols-7 border-b border-line bg-bone/30">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-3 text-center text-[11px] font-semibold text-muted uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="flex-1 grid grid-cols-7 auto-rows-[minmax(90px,1fr)] lg:grid-rows-6 lg:auto-rows-fr overflow-y-auto bg-bone/10">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-line/50 p-2 opacity-50 bg-bone/20" />
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
                    "group border-b border-r border-line/50 p-2 cursor-pointer transition-all hover:bg-brand/5 relative",
                    isSelected ? "bg-brand/5 ring-2 ring-inset ring-brand/40 z-10" : ""
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
                      isTod ? "bg-brand text-white shadow-sm" : isSelected ? "text-brand bg-brand/10 ring-1 ring-brand/30" : "text-ink group-hover:text-brand"
                    )}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-muted font-medium pr-1">{dayEvents.length}</span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    {dayEvents.slice(0, 3).map((ev: any, idx: number) => (
                      <div key={ev.id} className="group/ev relative">
                        <div className={cn(
                          "text-[11px] font-medium leading-tight rounded-md px-2 py-1 truncate transition-colors border",
                          idx % 3 === 0 ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" : 
                          idx % 3 === 1 ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                          "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        )}>
                          {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(' AM', 'a').replace(' PM', 'p')} - {ev.title}
                        </div>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[11px] font-medium text-muted px-1 mt-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar - Day Details */}
        <div className="w-full lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-line bg-bone/30 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  {selectedDay ? `${MONTH_NAMES[viewDate.month]} ${selectedDay}, ${viewDate.year}` : `${MONTH_NAMES[viewDate.month]} ${viewDate.year} Overview`}
                </h3>
                <p className="text-sm text-muted mt-0.5">
                  {selectedDay 
                    ? (selectedEvents.length > 0 
                        ? `You have ${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'} scheduled.` 
                        : "Your schedule is clear for this day.")
                    : "Select a specific date to view its schedule."}
                </p>
              </div>
            </div>

            {selectedDay !== null && (
              <div className="space-y-4">
                {selectedEvents.map((ev: any, idx: number) => {
                   const colorClass = idx % 3 === 0 ? "bg-blue-500" : idx % 3 === 1 ? "bg-emerald-500" : "bg-amber-500";
                   const lightClass = idx % 3 === 0 ? "bg-blue-50 border-blue-100" : idx % 3 === 1 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100";
                   
                   return (
                    <div key={ev.id} className="group relative bg-white rounded-xl p-5 border border-line shadow-sm hover:shadow-md transition-all">
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", colorClass)} />
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-ink pr-4 leading-tight">{ev.title}</h4>
                      </div>
                      
                      {ev.description && (
                        <p className="text-[13px] text-muted mb-4 line-clamp-3 leading-relaxed">{ev.description}</p>
                      )}
                      
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-[13px] text-ink">
                          <div className={cn("p-1.5 rounded-lg", lightClass)}>
                            <Clock className="w-3.5 h-3.5 opacity-80" />
                          </div>
                          <span className="font-medium">
                            {new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(ev.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        
                        {(ev.location || (!ev.location && !ev.is_virtual)) && (
                          <div className="flex items-center gap-2.5 text-[13px] text-muted">
                            <div className="p-1.5 rounded-lg bg-bone">
                              <MapPin className="w-3.5 h-3.5 opacity-70" />
                            </div>
                            <span>{ev.location || "No location specified"}</span>
                          </div>
                        )}
                        
                        {ev.is_virtual && (
                          <div className="flex items-center gap-2.5 text-[13px]">
                            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                              <Video className="w-3.5 h-3.5 text-indigo-600" />
                            </div>
                            {ev.virtual_link ? (
                              <a href={ev.virtual_link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">
                                Join Virtual Meeting
                              </a>
                            ) : (
                              <span className="text-muted">Virtual Meeting (No link provided)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedEvents.length === 0 && (
                  <div className="text-center py-12 px-6 border-2 border-dashed border-line rounded-2xl bg-white/50">
                    <div className="w-12 h-12 bg-bone rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="w-5 h-5 text-muted" />
                    </div>
                    <h4 className="text-[15px] font-medium text-ink mb-1">No events for this day</h4>
                    <p className="text-[13px] text-muted mb-6 leading-relaxed">Enjoy your free time or schedule a new event to stay productive.</p>
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-line text-ink text-sm font-medium rounded-lg hover:bg-bone transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Event
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
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-line bg-bone/30">
              <h2 className="text-lg font-semibold text-ink">Schedule New Event</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-bone rounded-full transition-colors text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="event-form" onSubmit={handleCreateEvent} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Event Title *</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} type="text" placeholder="e.g. Client Discovery Call" className="input-field bg-white" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">Start Date *</label>
                    <input required value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="input-field bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">Start Time *</label>
                    <input required value={startTime} onChange={e => setStartTime(e.target.value)} type="time" className="input-field bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">End Date *</label>
                    <input required value={endDate} onChange={e => setEndDate(e.target.value)} type="date" className="input-field bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-ink">End Time *</label>
                    <input required value={endTime} onChange={e => setEndTime(e.target.value)} type="time" className="input-field bg-white" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Location (Optional)</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} type="text" placeholder="e.g. Conference Room A" className="input-field bg-white" />
                </div>

                <div className="p-4 rounded-xl border border-line bg-bone/30 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isVirtual} onChange={e => setIsVirtual(e.target.checked)} className="w-4 h-4 text-brand rounded border-line focus:ring-brand" />
                    <span className="text-[14px] font-medium text-ink">This is a virtual meeting</span>
                  </label>
                  
                  {isVirtual && (
                    <div className="space-y-1.5 pl-7 animate-fade-in">
                      <label className="text-[12px] font-medium text-muted">Meeting Link</label>
                      <input value={virtualLink} onChange={e => setVirtualLink(e.target.value)} type="url" placeholder="https://zoom.us/j/123456789" className="input-field bg-white text-sm" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[13px] font-medium text-ink order-1">Description (Optional)</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Add notes, agenda, or context..." className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors bg-white resize-none order-2" />
                </div>
              </form>
            </div>
            
            <div className="shrink-0 px-6 py-4 border-t border-line bg-bone/30 flex justify-end gap-3">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-ink hover:bg-line/50 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="event-form" disabled={createEventMutation.isPending || !title || !startDate || !endDate} className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 shadow-sm", (createEventMutation.isPending || !title || !startDate || !endDate) ? "bg-brand/50 cursor-not-allowed" : "bg-brand hover:bg-brand/90")}>
                {createEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

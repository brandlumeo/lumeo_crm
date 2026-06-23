"use client";

import { useState, useMemo } from "react";
import { useEvents, useOrders } from "@/lib/queries";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ShoppingCart, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const { data: eventsData } = useEvents();
  const events = eventsData?.results ?? [];

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

  const selectedKey = selectedDay !== null ? `${viewDate.year}-${viewDate.month}-${selectedDay}` : null;
  const selectedEvents = selectedKey ? (eventMap[selectedKey] ?? []) : [];

  const isToday = (day: number) =>
    day === today.getDate() && viewDate.month === today.getMonth() && viewDate.year === today.getFullYear();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-ink">My Calendar</h1>
        <p className="text-muted text-sm mt-1">View your scheduled events across the month.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar Grid */}
        <div className="overflow-x-auto w-full">
          <div className="bg-bone border border-line rounded-xl overflow-hidden shadow-sm min-w-[600px] lg:min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-bone-2 transition-colors text-muted hover:text-ink">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-semibold text-ink text-base">
              {MONTH_NAMES[viewDate.month]} {viewDate.year}
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-bone-2 transition-colors text-muted hover:text-ink">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 border-b border-line">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-medium text-muted">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r border-line min-h-[80px]" />
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
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "border-b border-r border-line min-h-[80px] p-2 cursor-pointer transition-colors",
                    isSelected ? "bg-ink/5" : "hover:bg-bone-2/60"
                  )}
                >
                  <span className={cn(
                    "inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-medium",
                    isTod ? "bg-ink text-paper" : isSelected ? "text-ink font-bold" : "text-ink-2"
                  )}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev: any) => (
                      <div key={ev.id} className="text-[10px] leading-snug bg-brand/10 text-brand rounded px-1 py-0.5 truncate">
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

        {/* Side Panel */}
        <div className="bg-bone border border-line rounded-xl p-5 h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium text-ink">
              {selectedDay
                ? `${MONTH_NAMES[viewDate.month]} ${selectedDay}, ${viewDate.year}`
                : "Select a day"}
            </span>
          </div>

          {selectedDay === null ? (
            <p className="text-xs text-muted">Click a day to see events scheduled for that date.</p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-xs text-muted italic">No events on this day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedEvents.map((ev: any) => (
                <div key={ev.id} className="border border-line rounded-lg p-3 bg-paper">
                  <div className="font-medium text-ink text-sm mb-1">{ev.title}</div>
                  {ev.description && <p className="text-xs text-muted mb-2 line-clamp-2">{ev.description}</p>}
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ev.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(ev.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {ev.location && <div className="text-xs text-muted mt-1">📍 {ev.location}</div>}
                  {ev.virtual_link && (
                    <a href={ev.virtual_link} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline mt-1 block">
                      Join online →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

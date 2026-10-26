"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  MapPin,
  Video,
  X,
  Search,
  Mail,
  Send,
  Trash2,
  Calendar as CalendarIcon,
  Sparkles,
  Cake,
  Video as VideoIcon,
  Image as ImageIcon,
  Film,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import {
  useEvents,
  useCreateEvent,
  useDeleteEvent,
  useSendDailyScheduleEmail,
  useCurrentUser,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Color palettes matching the agency deliverables calendar screenshot
const COLOR_PRESETS = [
  { id: "orange", label: "Coral / Orange", bg: "bg-orange-600", border: "border-orange-500", text: "text-white" },
  { id: "purple", label: "Purple", bg: "bg-purple-600", border: "border-purple-500", text: "text-white" },
  { id: "blue", label: "Slate Blue", bg: "bg-blue-600", border: "border-blue-500", text: "text-white" },
  { id: "green", label: "Emerald Green", bg: "bg-emerald-600", border: "border-emerald-500", text: "text-white" },
  { id: "indigo", label: "Indigo", bg: "bg-indigo-600", border: "border-indigo-500", text: "text-white" },
  { id: "rose", label: "Rose", bg: "bg-rose-600", border: "border-rose-500", text: "text-white" },
  { id: "amber", label: "Amber", bg: "bg-amber-600", border: "border-amber-500", text: "text-white" },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Consistent hashing to assign colors automatically based on title / client prefix
function getConsistentColor(title: string, customColor?: string) {
  if (customColor) {
    const match = COLOR_PRESETS.find((c) => c.id.toLowerCase() === customColor.toLowerCase());
    if (match) return match;
  }

  const lower = title.toLowerCase();
  if (lower.includes("birthday") || lower.includes("b'day") || lower.includes("anniversary")) {
    return COLOR_PRESETS[3]; // Green
  }
  if (lower.includes("prime")) {
    return COLOR_PRESETS[0]; // Coral / Orange
  }
  if (lower.includes("trade")) {
    return COLOR_PRESETS[1]; // Purple
  }
  if (lower.includes("freight") || lower.includes("transit")) {
    return COLOR_PRESETS[2]; // Slate Blue
  }
  if (lower.includes("national") || lower.includes("holiday")) {
    return COLOR_PRESETS[4]; // Indigo
  }

  // Hash based on string chars
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PRESETS.length;
  return COLOR_PRESETS[index];
}

// Prefix icon based on event title keywords
function getEventIcon(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes("birthday") || lower.includes("b'day")) {
    return "▲";
  }
  if (lower.includes("interview") || lower.includes("meeting") || lower.includes("call")) {
    return "•";
  }
  return null;
}

export default function CalendarPage() {
  const today = new Date();
  const { data: user } = useCurrentUser();
  const isManager = Boolean(user?.has_management_access);

  const [viewDate, setViewDate] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to sleek dark mode as in screenshot

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("orange");
  const [eventType, setEventType] = useState("meeting");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [isVirtual, setIsVirtual] = useState(false);
  const [virtualLink, setVirtualLink] = useState("");

  // Queries & Mutations
  const { data: eventsData, isLoading } = useEvents();
  const createEventMutation = useCreateEvent();
  const deleteEventMutation = useDeleteEvent();
  const sendScheduleEmailMutation = useSendDailyScheduleEmail();

  const events = eventsData?.results ?? [];

  // Initialize dates when modal opens
  useEffect(() => {
    if (isAddModalOpen && !startDate) {
      const year = viewDate.year;
      const month = String(viewDate.month + 1).padStart(2, "0");
      const day = String(selectedDay || today.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      setStartDate(dateStr);
      setEndDate(dateStr);
      setStartTime("09:00");
      setEndTime("10:00");
    }
  }, [isAddModalOpen, selectedDay, viewDate.year, viewDate.month]);

  // Map events to date keys: YYYY-M-D
  const eventMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of events) {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (ev.title || "").toLowerCase().includes(q);
        const matchDesc = (ev.description || "").toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) continue;
      }
      const d = new Date(ev.start_time);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events, searchQuery]);

  // Calendar calculations
  const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month);
  const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month);
  const prevMonthDays = getDaysInMonth(
    viewDate.month === 0 ? viewDate.year - 1 : viewDate.year,
    viewDate.month === 0 ? 11 : viewDate.month - 1
  );

  const prevMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setViewDate((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const jumpToToday = () => {
    setViewDate({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDay(today.getDate());
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    const m = String(viewDate.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    setStartDate(`${viewDate.year}-${m}-${d}`);
    setEndDate(`${viewDate.year}-${m}-${d}`);
    setIsAddModalOpen(true);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime || !endDate || !endTime) {
      toast.error("Please fill in title, date, and times.");
      return;
    }

    const start_time = new Date(`${startDate}T${startTime}:00`).toISOString();
    const end_time = new Date(`${endDate}T${endTime}:00`).toISOString();

    createEventMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        color: selectedColor,
        event_type: eventType,
        is_virtual: isVirtual,
        virtual_link: virtualLink.trim(),
        start_time,
        end_time,
      },
      {
        onSuccess: () => {
          toast.success("Event added to calendar!");
          setIsAddModalOpen(false);
          setTitle("");
          setDescription("");
          setLocation("");
          setVirtualLink("");
          setIsVirtual(false);
          setSelectedColor("orange");
        },
        onError: () => {
          toast.error("Failed to create event.");
        },
      }
    );
  };

  const handleDeleteEvent = (id: number) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Event deleted.");
          setSelectedEvent(null);
        },
        onError: () => {
          toast.error("Failed to delete event.");
        },
      });
    }
  };

  const handleSendDailySchedule = () => {
    sendScheduleEmailMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(
          `Schedule email dispatched to ${data.emails_sent} team member(s) with ${data.events_count} event(s)!`
        );
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail ?? "Failed to send schedule email.");
      },
    });
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewDate.month === today.getMonth() &&
    viewDate.year === today.getFullYear();

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-200 flex flex-col p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto",
        isDarkMode
          ? "bg-[#101012] text-zinc-100"
          : "bg-[#FAF7F2] text-stone-900"
      )}
    >
      {/* ── Top Header Toolbar (Matching Screenshot) ────────────────────────── */}
      <div
        className={cn(
          "flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b mb-4",
          isDarkMode ? "border-zinc-800" : "border-stone-200"
        )}
      >
        {/* Left: Brand, Month Navigator */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Add Button */}
          <button
            onClick={() => {
              setSelectedDay(today.getDate());
              setIsAddModalOpen(true);
            }}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm",
              isDarkMode
                ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/60"
                : "bg-stone-900 hover:bg-stone-800 text-white"
            )}
            title="Create Event"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Title & Badge */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {today.getDate()}
            </div>
            <h1 className="font-serif text-[22px] md:text-[24px] font-medium tracking-tight">
              Calendar
            </h1>
          </div>

          {/* Today Button */}
          <button
            onClick={jumpToToday}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
              isDarkMode
                ? "bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                : "bg-white hover:bg-stone-100 text-stone-800 border-stone-300 shadow-2xs"
            )}
          >
            Today
          </button>

          {/* Previous / Next Stepper */}
          <div
            className={cn(
              "flex items-center rounded-lg border p-0.5",
              isDarkMode ? "bg-zinc-800/80 border-zinc-700" : "bg-white border-stone-300 shadow-2xs"
            )}
          >
            <button
              onClick={prevMonth}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                isDarkMode ? "hover:bg-zinc-700 text-zinc-300" : "hover:bg-stone-100 text-stone-700"
              )}
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                isDarkMode ? "hover:bg-zinc-700 text-zinc-300" : "hover:bg-stone-100 text-stone-700"
              )}
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month & Year Display with quick picker */}
          <div className="flex items-center gap-1.5 pl-1">
            <span className="font-serif text-[20px] md:text-[22px] font-medium tracking-tight">
              {MONTH_NAMES[viewDate.month]} {viewDate.year}
            </span>
          </div>
        </div>

        {/* Right: Actions, Search, Broadcast Email, Theme Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real-time search */}
          <div className="relative w-44 md:w-56">
            <Search
              className={cn(
                "w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2",
                isDarkMode ? "text-zinc-400" : "text-stone-400"
              )}
            />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none transition-all",
                isDarkMode
                  ? "bg-zinc-800/80 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500"
                  : "bg-white border-stone-300 text-stone-900 placeholder:text-stone-400 focus:border-stone-500 shadow-2xs"
              )}
            />
          </div>

          {/* Broadcast Daily Schedule Email Button */}
          {isManager && (
            <button
              onClick={handleSendDailySchedule}
              disabled={sendScheduleEmailMutation.isPending}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer shadow-xs",
                isDarkMode
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                  : "bg-white hover:bg-stone-100 text-stone-900 border-stone-300"
              )}
              title="Broadcast today's schedule email to all company members"
            >
              <Send className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {sendScheduleEmailMutation.isPending ? "Sending..." : "Send Daily Schedule"}
              </span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={cn(
              "w-9 h-9 rounded-lg border flex items-center justify-center transition-colors cursor-pointer",
              isDarkMode
                ? "bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700"
                : "bg-white border-stone-300 text-stone-700 hover:bg-stone-100 shadow-2xs"
            )}
            title={isDarkMode ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── 7-Day Calendar Grid (SUN to SAT) ─────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 border rounded-2xl overflow-hidden shadow-sm flex flex-col",
          isDarkMode ? "border-zinc-800 bg-[#141416]" : "border-stone-200 bg-white"
        )}
      >
        {/* Days of Week Header */}
        <div
          className={cn(
            "grid grid-cols-7 border-b text-center text-[11px] font-mono font-semibold tracking-wider py-2.5",
            isDarkMode
              ? "border-zinc-800 bg-[#161619] text-zinc-400"
              : "border-stone-200 bg-stone-100 text-stone-600"
          )}
        >
          {DAY_NAMES.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div
          className={cn(
            "grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y",
            isDarkMode ? "divide-zinc-800/80" : "divide-stone-200"
          )}
        >
          {/* Previous Month Overflow Days */}
          {Array.from({ length: firstDay }).map((_, i) => {
            const overflowDayNum = prevMonthDays - firstDay + i + 1;
            return (
              <div
                key={`prev-${i}`}
                className={cn(
                  "min-h-[115px] p-2 flex flex-col transition-colors select-none",
                  isDarkMode ? "bg-[#111113]/60 text-zinc-600" : "bg-stone-50/70 text-stone-400"
                )}
              >
                <span className="text-[12px] font-medium font-mono">{overflowDayNum}</span>
              </div>
            );
          })}

          {/* Current Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = `${viewDate.year}-${viewDate.month}-${day}`;
            const dayEvents = eventMap[key] ?? [];
            const isTod = isToday(day);

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[115px] lg:min-h-[130px] p-2 flex flex-col group cursor-pointer transition-colors relative",
                  isDarkMode
                    ? "hover:bg-zinc-800/40 bg-[#141416]"
                    : "hover:bg-stone-50 bg-white"
                )}
              >
                {/* Date Header in cell */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    {/* If first day of month, show e.g. "Sep 1" */}
                    {day === 1 && (
                      <span className="text-[11px] font-mono text-zinc-400 mr-1 font-medium">
                        {MONTH_NAMES[viewDate.month].substring(0, 3)}
                      </span>
                    )}

                    {/* Day number with Today Circle highlight */}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center text-[12px] font-mono font-medium rounded-full transition-all",
                        isTod
                          ? "w-6 h-6 bg-blue-500 text-white font-bold shadow-xs"
                          : isDarkMode
                          ? "text-zinc-300 group-hover:text-white"
                          : "text-stone-700 group-hover:text-stone-900"
                      )}
                    >
                      {day}
                    </span>
                  </div>

                  {/* Add Event Hover Indicator */}
                  <span
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs",
                      isDarkMode ? "bg-zinc-800 text-zinc-300 hover:text-white" : "bg-stone-100 text-stone-600"
                    )}
                    title="Add event for this day"
                  >
                    +
                  </span>
                </div>

                {/* Stacked Event Pills (Matching Screenshot!) */}
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  {dayEvents.slice(0, 4).map((ev: any) => {
                    const colorStyle = getConsistentColor(ev.title, ev.color);
                    const prefixIcon = getEventIcon(ev.title);

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-[5px] text-[11px] font-medium text-white truncate cursor-pointer transition-all shadow-2xs hover:brightness-110 flex items-center gap-1.5 select-none",
                          colorStyle.bg
                        )}
                        title={`${ev.title}${ev.description ? ` - ${ev.description}` : ""}`}
                      >
                        {prefixIcon && (
                          <span className="font-bold text-[10px] opacity-90 shrink-0">
                            {prefixIcon}
                          </span>
                        )}
                        <span className="truncate">{ev.title}</span>
                      </div>
                    );
                  })}

                  {/* Overflow badge if more than 4 events */}
                  {dayEvents.length > 4 && (
                    <div
                      className={cn(
                        "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded text-left",
                        isDarkMode ? "text-zinc-400 bg-zinc-800/60" : "text-stone-500 bg-stone-100"
                      )}
                    >
                      +{dayEvents.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Next Month Overflow Days to complete 35 or 42 grid cells */}
          {Array.from({
            length: (7 - ((firstDay + daysInMonth) % 7)) % 7,
          }).map((_, i) => (
            <div
              key={`next-${i}`}
              className={cn(
                "min-h-[115px] p-2 flex flex-col transition-colors select-none",
                isDarkMode ? "bg-[#111113]/60 text-zinc-600" : "bg-stone-50/70 text-stone-400"
              )}
            >
              <span className="text-[12px] font-medium font-mono">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── New Event Modal ─────────────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "p-6 md:p-8 rounded-2xl w-full max-w-lg border shadow-2xl relative flex flex-col gap-5 animate-in zoom-in-95 duration-200",
              isDarkMode
                ? "bg-[#18181b] border-zinc-700 text-zinc-100"
                : "bg-white border-stone-200 text-stone-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between border-b pb-3.5",
                isDarkMode ? "border-zinc-800" : "border-stone-200"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-[19px] font-medium">Add Calendar Deliverable / Event</h3>
                  <p className={cn("text-xs mt-0.5", isDarkMode ? "text-zinc-400" : "text-stone-500")}>
                    Posters, Reels, meetings, and agency milestones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-stone-100 text-stone-500"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateEvent} className="flex flex-col gap-4">
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium uppercase font-mono tracking-wider opacity-80">
                  Event Title / Deliverable Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infinity Prime - Reels or Interview Meeting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-sm rounded-lg border outline-none font-medium",
                    isDarkMode
                      ? "bg-zinc-800/80 border-zinc-700 text-white focus:border-orange-500"
                      : "bg-stone-50 border-stone-300 text-stone-900 focus:border-stone-500"
                  )}
                />
              </div>

              {/* Color Preset Palette */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium uppercase font-mono tracking-wider opacity-80">
                  Color Tag
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColor(color.id)}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs",
                        color.bg,
                        selectedColor === color.id
                          ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                          : "opacity-80 hover:opacity-100"
                      )}
                      title={color.label}
                    >
                      {selectedColor === color.id && <Check className="w-3.5 h-3.5 text-white font-bold" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11.5px] font-mono opacity-80">Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className={cn(
                      "w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none font-mono",
                      isDarkMode
                        ? "bg-zinc-800/80 border-zinc-700 text-white"
                        : "bg-stone-50 border-stone-300 text-stone-900"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-1">
                    <label className="text-[11.5px] font-mono opacity-80">Start</label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={cn(
                        "w-full px-2 py-1.5 text-xs rounded-lg border outline-none font-mono",
                        isDarkMode
                          ? "bg-zinc-800/80 border-zinc-700 text-white"
                          : "bg-stone-50 border-stone-300 text-stone-900"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11.5px] font-mono opacity-80">End</label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={cn(
                        "w-full px-2 py-1.5 text-xs rounded-lg border outline-none font-mono",
                        isDarkMode
                          ? "bg-zinc-800/80 border-zinc-700 text-white"
                          : "bg-stone-50 border-stone-300 text-stone-900"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Location or Client Deliverable Note */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium uppercase font-mono tracking-wider opacity-80">
                  Location / Meeting Link / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Meet link or Client Studio"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-lg border outline-none",
                    isDarkMode
                      ? "bg-zinc-800/80 border-zinc-700 text-white"
                      : "bg-stone-50 border-stone-300 text-stone-900"
                  )}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium uppercase font-mono tracking-wider opacity-80">
                  Description / Deliverable Specs
                </label>
                <textarea
                  rows={2}
                  placeholder="Details, post captions, designer instructions, or agenda..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 text-xs rounded-lg border outline-none resize-none",
                    isDarkMode
                      ? "bg-zinc-800/80 border-zinc-700 text-white"
                      : "bg-stone-50 border-stone-300 text-stone-900"
                  )}
                />
              </div>

              {/* Action Buttons */}
              <div
                className={cn(
                  "flex items-center justify-end gap-3 pt-4 border-t mt-2",
                  isDarkMode ? "border-zinc-800" : "border-stone-200"
                )}
              >
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={cn(
                    "px-4 py-2 text-xs rounded-lg font-medium transition-colors cursor-pointer",
                    isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-stone-100 text-stone-600"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-orange-600 hover:bg-orange-500 text-white shadow-xs cursor-pointer transition-all"
                >
                  {createEventMutation.isPending ? "Adding..." : "Add to Calendar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Event Details Modal ─────────────────────────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className={cn(
              "p-6 md:p-7 rounded-2xl w-full max-w-md border shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200 overflow-hidden",
              isDarkMode
                ? "bg-[#18181b] border-zinc-700 text-zinc-100"
                : "bg-white border-stone-200 text-stone-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar matching event color */}
            <div
              className={cn(
                "h-2 -mt-6 -mx-6 md:-mt-7 md:-mx-7 mb-2",
                getConsistentColor(selectedEvent.title, selectedEvent.color).bg
              )}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full text-white inline-block mb-1.5",
                    getConsistentColor(selectedEvent.title, selectedEvent.color).bg
                  )}
                >
                  {selectedEvent.event_type?.toUpperCase() || "EVENT"}
                </span>
                <h3 className="font-serif text-[20px] font-medium text-ink leading-tight">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-stone-100 text-stone-500"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Time & Date */}
            <div
              className={cn(
                "p-3 rounded-lg border text-xs flex items-center gap-2.5",
                isDarkMode ? "bg-zinc-800/50 border-zinc-700/60" : "bg-stone-50 border-stone-200"
              )}
            >
              <Clock className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="font-mono">
                <div>
                  {new Date(selectedEvent.start_time).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="text-[11px] opacity-75 mt-0.5">
                  {new Date(selectedEvent.start_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  &rarr;{" "}
                  {new Date(selectedEvent.end_time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {/* Location or Link */}
            {selectedEvent.location && (
              <div className="flex items-center gap-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>{selectedEvent.location}</span>
              </div>
            )}

            {/* Description */}
            {selectedEvent.description && (
              <div
                className={cn(
                  "p-3 rounded-lg text-xs leading-relaxed max-h-36 overflow-y-auto border",
                  isDarkMode ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-stone-50 border-stone-200 text-stone-700"
                )}
              >
                {selectedEvent.description}
              </div>
            )}

            {/* Footer Actions */}
            <div
              className={cn(
                "flex items-center justify-between pt-3 border-t mt-1",
                isDarkMode ? "border-zinc-800" : "border-stone-200"
              )}
            >
              <button
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                disabled={deleteEventMutation.isPending}
                className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedEvent(null)}
                className={cn(
                  "px-4 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer",
                  isDarkMode ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200" : "bg-stone-100 hover:bg-stone-200 text-stone-800"
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

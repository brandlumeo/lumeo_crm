"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Clock,
  Coffee,
  CheckCircle,
  MapPin,
  Calendar,
  Users,
  Play,
  LogOut,
  Home,
  Building,
  Building2,
  Briefcase,
  Compass,
  ChevronDown,
  Check,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Timer,
  CalendarDays,
} from "lucide-react";

const WORK_LOCATION_OPTIONS = [
  {
    id: "office" as const,
    label: "Office",
    shortLabel: "Office",
    sublabel: "Headquarters & regular desk",
    icon: Building2,
    badgeColor: "text-blue-600 bg-blue-50 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "wfh" as const,
    label: "Work From Home",
    shortLabel: "WFH",
    sublabel: "Remote residence / hybrid shift",
    icon: Home,
    badgeColor: "text-emerald-600 bg-emerald-50 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "onsite" as const,
    label: "On-site Client",
    shortLabel: "On-site",
    sublabel: "Client premises, meetings & deliverables",
    icon: Briefcase,
    badgeColor: "text-purple-600 bg-purple-50 border-purple-200/70 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "field" as const,
    label: "Field / Travel",
    shortLabel: "Field",
    sublabel: "Transit, shoot locations & client errands",
    icon: Compass,
    badgeColor: "text-amber-600 bg-amber-50 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
];

const renderLocationBadge = (locationKey?: string) => {
  const key = (locationKey || "office").toLowerCase();
  const loc = WORK_LOCATION_OPTIONS.find((l) => l.id === key) || WORK_LOCATION_OPTIONS[0];
  const Icon = loc.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium border shadow-2xs", loc.badgeColor)}>
      <Icon className="w-3 h-3" />
      <span>{loc.shortLabel}</span>
    </span>
  );
};

const getAvatarTint = (name: string) => {
  const char = name ? name[0].toUpperCase() : "?";
  const tints = [
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  return tints[char.charCodeAt(0) % tints.length];
};

import {
  useAttendanceStatus,
  usePunchIn,
  usePunchOut,
  useStartBreak,
  useEndBreak,
  useShiftHistory,
  useCurrentUser,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

export default function AttendancePage() {
  const { data: user } = useCurrentUser();
  const { data: status, isLoading: statusLoading } = useAttendanceStatus();
  const { data: history = [], isLoading: historyLoading } = useShiftHistory();
  const { data: companyHistory = [], isLoading: companyHistoryLoading } = useShiftHistory(true); // for managers

  const punchInMutation = usePunchIn();
  const punchOutMutation = usePunchOut();
  const startBreakMutation = useStartBreak();
  const endBreakMutation = useEndBreak();

  // Component states
  const [mounted, setMounted] = useState(false);
  const [workLocation, setWorkLocation] = useState<"office" | "wfh" | "onsite" | "field">("office");
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState("");
  const [breakReason, setBreakReason] = useState("");
  const [companyLogSearch, setCompanyLogSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationMenuOpen(false);
      }
    }
    if (isLocationMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLocationMenuOpen]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return "--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatShiftTime = (timeStr?: string | null) => {
    if (!timeStr) return "9:00 AM";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const minute = m || "00";
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${minute} ${ampm}`;
  };

  const calcDuration = (inTime: string, outTime: string | null) => {
    if (!outTime) return "Ongoing";
    const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const isManager = Boolean(user?.has_management_access);

  if (!mounted || statusLoading) {
    return (
      <div className="p-7 pb-16 max-w-[1400px]">
        <div className="flex flex-col gap-8">
          <div className="h-10 bg-bone-2 rounded-lg w-1/4 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
            <div className="card h-[320px] bg-bone-2/30 animate-pulse" />
            <div className="card h-[320px] bg-bone-2/30 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Punch actions
  const handlePunchIn = () => {
    const executePunch = (coords?: { latitude: number; longitude: number }) => {
      punchInMutation.mutate(
        {
          work_location: workLocation,
          notes: notes || undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
        },
        {
          onSuccess: () => {
            toast.success("Shift clocked in successfully!");
            setNotes("");
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.detail ?? "Failed to punch in.");
          },
        }
      );
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => executePunch({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => executePunch()
      );
    } else {
      executePunch();
    }
  };

  const handlePunchOut = () => {
    punchOutMutation.mutate(
      {
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Shift clocked out successfully!");
          setNotes("");
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail ?? "Failed to punch out.");
        },
      }
    );
  };

  const handleStartBreak = () => {
    startBreakMutation.mutate(
      { reason: breakReason || undefined },
      {
        onSuccess: () => {
          toast.success("Break started.");
          setBreakReason("");
        },
      }
    );
  };

  const handleEndBreak = () => {
    endBreakMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Resumed shift from break.");
      },
    });
  };

  // Filter company logs
  const filteredCompanyLogs = companyHistory.filter((log: any) => {
    if (!companyLogSearch.trim()) return true;
    const q = companyLogSearch.toLowerCase();
    const nameMatch = (log.user_full_name || "").toLowerCase().includes(q);
    const emailMatch = (log.user_email || "").toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  return (
    <div className="p-6 md:p-8 pb-16 max-w-[1400px] mx-auto flex flex-col gap-8 animate-rise">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line/60 pb-5">
        <div>
          <div className="text-[12px] font-mono uppercase tracking-wider text-muted mb-1 flex items-center gap-2">
            <span>HR</span>
            <span>/</span>
            <span className="text-ink font-semibold">Shift Controller</span>
          </div>
          <h1 className="font-serif text-[28px] md:text-[32px] text-ink font-normal tracking-tight">
            Attendance &amp; Shift Controller
          </h1>
          <p className="text-[13.5px] text-muted mt-0.5">
            Clock in and out, track duty notes, record breaks, and view your daily telemetry logs.
          </p>
        </div>

        {/* Quick Link to Leaves Hub */}
        <Link
          href="/leaves"
          className="btn btn-outline self-start md:self-auto h-10 px-4 rounded-lg flex items-center gap-2 text-xs font-semibold hover:border-ink transition-all"
        >
          <CalendarDays className="w-4 h-4 text-accent" />
          <span>Apply for Leaves &amp; Absence</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted" />
        </Link>
      </div>

      {/* Grid: Shift Controller & Daily Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        {/* Left Column: Shift Controller */}
        <div className="card p-6 flex flex-col gap-5 border border-line bg-paper">
          <div className="flex items-center justify-between border-b border-line-2 pb-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-accent" />
              <h2 className="font-serif text-[20px] font-medium text-ink">Shift Controller</h2>
            </div>
            <span className="text-[11.5px] font-mono text-muted bg-bone-2 px-2.5 py-1 rounded-md border border-line">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          {!status?.is_clocked_in ? (
            /* CLOCKED OUT STATE */
            <div className="flex flex-col gap-4">
              <div className="bg-bone border border-line rounded-lg p-5 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase tracking-wider text-muted font-medium">Work Location</label>
                    <div className="relative" ref={locationDropdownRef}>
                      {(() => {
                        const activeLoc = WORK_LOCATION_OPTIONS.find((l) => l.id === workLocation) || WORK_LOCATION_OPTIONS[0];
                        const ActiveIcon = activeLoc.icon;
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                              className="w-full h-[42px] bg-paper border border-line hover:border-ink/40 rounded-lg px-3 text-[13px] text-ink flex items-center justify-between gap-2.5 transition-all outline-none focus:border-ink focus:ring-2 focus:ring-ink/10 cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={cn("w-6 h-6 rounded-md flex items-center justify-center border shrink-0", activeLoc.badgeColor)}>
                                  <ActiveIcon className="w-3.5 h-3.5" />
                                </span>
                                <span className="font-medium text-ink truncate">{activeLoc.label}</span>
                              </div>
                              <ChevronDown className={cn("w-4 h-4 text-muted transition-transform duration-200 shrink-0", isLocationMenuOpen && "rotate-180")} />
                            </button>

                            {isLocationMenuOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 bg-paper/98 backdrop-blur-md border border-line rounded-xl shadow-xl z-50 p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
                                {WORK_LOCATION_OPTIONS.map((loc) => {
                                  const LocIcon = loc.icon;
                                  const isSelected = workLocation === loc.id;
                                  return (
                                    <button
                                      key={loc.id}
                                      type="button"
                                      onClick={() => {
                                        setWorkLocation(loc.id);
                                        setIsLocationMenuOpen(false);
                                      }}
                                      className={cn(
                                        "w-full flex items-center justify-between gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer",
                                        isSelected
                                          ? "bg-bone-2 text-ink border border-line/60"
                                          : "hover:bg-bone text-ink/80 hover:text-ink border border-transparent"
                                      )}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center border shrink-0", loc.badgeColor)}>
                                          <LocIcon className="w-4 h-4" />
                                        </span>
                                        <div className="min-w-0 flex flex-col">
                                          <span className="text-[13px] font-medium leading-tight">{loc.label}</span>
                                          <span className="text-[11px] text-muted truncate mt-0.5">{loc.sublabel}</span>
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-ink shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] uppercase tracking-wider text-muted font-medium">Duty Notes</label>
                    <input
                      type="text"
                      placeholder="Optional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-[42px] bg-paper border border-line hover:border-ink/40 rounded-lg px-3 text-[13px] text-ink focus:border-ink outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {status?.is_before_shift && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3.5 flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-semibold">Shift opens at {formatShiftTime(status.office_start_time)}.</span>
                    <span className="text-amber-700 ml-1">Clock-in is locked until shift start time as per company rules.</span>
                  </div>
                </div>
              )}

              <button
                onClick={handlePunchIn}
                disabled={punchInMutation.isPending || status?.is_before_shift}
                className={cn(
                  "w-full py-3.5 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm",
                  status?.is_before_shift
                    ? "bg-bone-2 text-muted border border-line cursor-not-allowed"
                    : "bg-ink hover:opacity-90 text-paper"
                )}
              >
                {punchInMutation.isPending
                  ? "PUNCHING IN..."
                  : status?.is_before_shift
                  ? `CLOCK-IN OPENS AT ${formatShiftTime(status.office_start_time).toUpperCase()}`
                  : "PUNCH IN SHIFT"}
              </button>
            </div>
          ) : (
            /* CLOCKED IN STATE */
            <div className="flex flex-col gap-6">
              <div className="relative bg-gradient-to-b from-bone/50 to-bone/10 border border-line rounded-2xl p-8 flex flex-col items-center justify-center gap-5 text-center shadow-inner overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col items-center gap-2 z-10">
                  <div className="flex items-center gap-2.5 px-3 py-1 bg-white rounded-full border border-line shadow-sm mb-2">
                    <span className={cn("w-2 h-2 rounded-full shadow-sm", status.is_on_break ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse")} />
                    <span className="text-[10px] uppercase tracking-widest text-ink-2 font-semibold">
                      {status.is_on_break ? "Currently On Break" : "Active Shift Running"}
                    </span>
                  </div>

                  <span className="text-[11px] uppercase tracking-widest text-muted font-medium mt-2">Clocked In At</span>
                  <div className="font-serif text-[56px] leading-[1] text-ink select-none tracking-tight text-shadow-sm font-normal">
                    {formatTime(status.active_log?.clock_in)}
                  </div>
                  {status.is_on_break && (
                    <div className="text-[12px] text-amber-700 font-medium mt-1">
                      Break started at: {formatTime(status.active_break?.start_time)}
                    </div>
                  )}
                </div>

                {(() => {
                  const loc = WORK_LOCATION_OPTIONS.find(l => l.id === (status.active_log?.work_location || "").toLowerCase()) || WORK_LOCATION_OPTIONS[0];
                  const LocIcon = loc.icon;
                  return (
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border border-line px-3.5 py-1.5 rounded-full text-[12px] text-ink-2 font-medium z-10 shadow-2xs">
                      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center border", loc.badgeColor)}>
                        <LocIcon className="w-3 h-3" />
                      </span>
                      <span>Logged in via <strong className="text-ink font-semibold">{loc.label}</strong></span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Break control */}
                {!status.is_on_break ? (
                  <div className="flex flex-col gap-2 border border-line rounded-lg p-3.5 bg-bone/40">
                    <input
                      type="text"
                      placeholder="Break details (e.g. Lunch)"
                      value={breakReason}
                      onChange={(e) => setBreakReason(e.target.value)}
                      className="bg-paper border border-line rounded px-2.5 py-1.5 text-xs focus:border-ink outline-none"
                    />
                    <button
                      onClick={handleStartBreak}
                      disabled={startBreakMutation.isPending}
                      className="bg-paper border border-line hover:bg-bone-2 text-ink py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Coffee className="w-3.5 h-3.5 text-muted" />
                      Take Break
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 justify-end border border-amber-200 rounded-lg p-3.5 bg-amber-50/20">
                    <p className="text-[11px] text-muted select-none italic text-center mb-1">
                      Reason: "{status.active_break?.reason ?? "Not specified"}"
                    </p>
                    <button
                      onClick={handleEndBreak}
                      disabled={endBreakMutation.isPending}
                      className="bg-ink text-paper hover:opacity-90 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Resume Shift
                    </button>
                  </div>
                )}

                {/* Clock Out */}
                <div className="flex flex-col gap-2 border border-line rounded-lg p-3.5 bg-bone/40">
                  <input
                    type="text"
                    placeholder="Sign-off notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-paper border border-line rounded px-2.5 py-1.5 text-xs focus:border-ink outline-none"
                  />
                  <button
                    onClick={handlePunchOut}
                    disabled={punchOutMutation.isPending}
                    className="bg-accent hover:opacity-95 text-white py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Punch Out Shift
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Shift Status Overview & Leaves Hub Card */}
        <div className="flex flex-col gap-6">
          {/* Shift Timings & Office Info */}
          <div className="card p-6 border border-line bg-paper flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b border-line-2 pb-3">
              <Timer className="w-4 h-4 text-accent" />
              <h3 className="font-serif text-[17px] font-medium text-ink">Office Shift Rules</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-bone-2 p-3 rounded-lg border border-line flex flex-col gap-1">
                <span className="text-[11px] uppercase font-mono tracking-wider text-muted">Standard Shift</span>
                <span className="font-semibold text-ink text-[13px]">
                  {formatShiftTime(status?.office_start_time)} &rarr; {formatShiftTime(status?.office_end_time)}
                </span>
              </div>

              <div className="bg-bone-2 p-3 rounded-lg border border-line flex flex-col gap-1">
                <span className="text-[11px] uppercase font-mono tracking-wider text-muted">Half-Day Shift</span>
                <span className="font-semibold text-amber-700 text-[13px]">
                  Starts at 2:00 PM
                </span>
              </div>
            </div>

            <div className="text-[12px] text-muted leading-relaxed">
              Clock-in within standard grace (or afternoon half-day grace) ensures accurate attendance marking on the team matrix.
            </div>
          </div>

          {/* Dedicated Leaves Hub Banner Card */}
          <div className="card p-6 border border-line bg-gradient-to-br from-paper via-bone/30 to-emerald-50/20 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-[18px] font-medium text-ink">Leaves &amp; Absence Hub</h3>
                <p className="text-[11.5px] text-muted">Dedicated portal for all leave requests</p>
              </div>
            </div>

            <p className="text-[12.5px] text-muted leading-relaxed">
              Absence applications, medical leaves, unpaid LOP tracking, and company-wide approval desks are now centralized in the new HR Leaves section.
            </p>

            <Link
              href="/leaves"
              className="btn btn-primary w-full h-10 rounded-lg text-xs font-semibold bg-ink text-paper hover:bg-ink/90 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <span>Open Leaves Section</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Manager Company Shift Logs Panel */}
      {isManager && (
        <div className="card p-6 border border-line bg-paper flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-line-2 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100/50">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-[18px] font-medium text-ink">Company Shift Logs</h2>
                <p className="text-[12px] text-muted mt-0.5">Overview of all staff check-ins and check-outs</p>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search staff..."
                value={companyLogSearch}
                onChange={(e) => setCompanyLogSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:border-accent w-48 text-ink bg-bone-2 placeholder:text-muted/60"
              />
              <svg className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[160px]">
            {companyHistoryLoading ? (
              <p className="text-xs text-muted">Loading company shift logs...</p>
            ) : filteredCompanyLogs.length === 0 ? (
              <p className="text-xs text-muted italic">No shifts recorded by staff yet.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  filteredCompanyLogs.reduce((acc: any, log: any) => {
                    const dateObj = new Date(log.clock_in);
                    const dateStr = dateObj.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
                    if (!acc[dateStr]) acc[dateStr] = [];
                    acc[dateStr].push(log);
                    return acc;
                  }, {})
                ).map(([dateStr, logs]: [string, any]) => (
                  <div key={dateStr}>
                    <div className="mb-2 text-[10px] font-bold text-muted uppercase tracking-wider pl-1">{dateStr}</div>
                    <div className="bg-paper border border-line rounded-[12px] overflow-hidden shadow-sm">
                      <div className="divide-y divide-line">
                        {logs.map((log: any) => {
                          const nameChar = (log.user_full_name?.[0] || log.user_email?.[0] || "?").toUpperCase();
                          const isWfh = log.work_location?.toLowerCase() === "wfh";
                          const durationStr = calcDuration(log.clock_in, log.clock_out);
                          let isAnomalous = false;
                          if (log.clock_out) {
                            const diffHours = (new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime()) / (1000 * 60 * 60);
                            if (diffHours > 16) isAnomalous = true;
                          }

                          return (
                            <div key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-bone transition-colors">
                              <div className="flex items-center gap-4 min-w-[200px] flex-1">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-medium ${getAvatarTint(nameChar)}`}>
                                  {nameChar}
                                </div>
                                <div>
                                  <div className="text-[13px] font-medium text-ink leading-tight">{log.user_full_name}</div>
                                  <div className="text-[11px] text-muted mt-0.5">{log.user_email}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-8 justify-end">
                                <div className="w-[90px] flex justify-start">
                                  {renderLocationBadge(log.work_location)}
                                </div>

                                <div className="flex items-center gap-2 text-[12px] text-muted w-[160px] justify-center">
                                  <span className="font-mono">{new Date(log.clock_in).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                                  {log.clock_out && (
                                    <>
                                      <ArrowRight className="w-3 h-3 text-muted/60" />
                                      <span className="font-mono">{new Date(log.clock_out).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                                    </>
                                  )}
                                </div>

                                <div className="w-[80px] flex justify-end">
                                  {log.clock_out ? (
                                    <span className={cn("text-[12px] font-bold flex items-center gap-1", isAnomalous ? "text-amber-600" : "text-ink")}>
                                      {durationStr}
                                      {isAnomalous && <AlertTriangle className="w-3.5 h-3.5" />}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider">
                                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                      Live
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personal Shifts Telemetry Logs */}
      <div className="card p-0 border border-line bg-paper flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line-2 p-5 bg-paper/50">
          <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100/50">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif text-[17px] font-medium text-ink">Recent Shift Telemetry</h2>
            <p className="text-[11.5px] text-muted">Your personal check-in, check-out, and shift duration log</p>
          </div>
        </div>

        <div className="overflow-x-auto p-0">
          {historyLoading ? (
            <p className="text-xs text-muted p-5">Loading shifts...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted italic p-5">No personal shifts recorded yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {history.slice(0, 15).map((log) => {
                const isWfh = log.work_location?.toLowerCase() === "wfh";
                const durationStr = calcDuration(log.clock_in, log.clock_out);
                let isAnomalous = false;
                if (log.clock_out) {
                  const diffHours = (new Date(log.clock_out).getTime() - new Date(log.clock_in).getTime()) / (1000 * 60 * 60);
                  if (diffHours > 16) isAnomalous = true;
                }
                const dateObj = new Date(log.clock_in);
                const dateStr = dateObj.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

                return (
                  <div key={log.id} className="flex items-center justify-between p-5 hover:bg-bone transition-colors">
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[12.5px] font-semibold text-ink">{dateStr}</div>
                      <div className="flex items-center gap-3 text-[11px] text-muted">
                        {renderLocationBadge(log.work_location)}
                        <div className="flex items-center gap-1.5 font-mono">
                          <span>{new Date(log.clock_in).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                          {log.clock_out && (
                            <>
                              <ArrowRight className="w-3 h-3 text-muted/60" />
                              <span>{new Date(log.clock_out).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      {log.clock_out ? (
                        <span className={cn(
                          "text-[12px] font-bold flex items-center gap-1.5",
                          isAnomalous ? "text-amber-600" : "text-ink"
                        )}>
                          {durationStr}
                          {isAnomalous && <AlertTriangle className="w-3.5 h-3.5" />}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Live Shift
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

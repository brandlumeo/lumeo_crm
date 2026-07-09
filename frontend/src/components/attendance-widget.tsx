"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Coffee, LogOut, Play, Building2, Home, MapPin, Briefcase } from "lucide-react";
import {
  useAttendanceStatus,
  usePunchIn,
  usePunchOut,
} from "@/lib/queries";

export function AttendanceWidget() {
  const router = useRouter();
  const { data: status, isLoading } = useAttendanceStatus();
  const { mutate: punchInMutation, isPending: isPunchingIn } = usePunchIn();
  const punchOutMutation = usePunchOut();

  const [isOpen, setIsOpen] = useState(false);
  const [workLocation, setWorkLocation] = useState<"office" | "wfh" | "onsite" | "field">("office");
  const [notes, setNotes] = useState("");

  if (isLoading || !status) {
    return (
      <div className="w-[100px] h-8 bg-bone-2 border border-line rounded-md animate-pulse" />
    );
  }

  const handlePunchIn = () => {
    punchInMutation({ work_location: workLocation, notes }, {
      onSuccess: () => {
        setIsOpen(false);
        setNotes("");
      }
    });
  };

  const handlePunchOut = () => {
    punchOutMutation.mutate({ notes }, {
      onSuccess: () => {
        setIsOpen(false);
        setNotes("");
      }
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      {!status.is_clocked_in ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-1.5 bg-ink text-paper hover:bg-ink/90 rounded-md text-[13px] font-medium tracking-wide transition-all shadow-sm"
        >
          <Clock className="w-3.5 h-3.5 text-paper/80 transition-colors" />
          <span>Clock In</span>
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-1.5 border border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md text-[13px] font-medium tracking-wide transition-all shadow-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span>Clocked In</span>
        </button>
      )}

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-3 right-0 w-[320px] bg-paper border border-line rounded-2xl shadow-2xl shadow-ink/5 z-50 p-5 animate-in slide-in-from-top-3 zoom-in-95 duration-200">
            {!status.is_clocked_in ? (
              // Clock In Panel
              <div className="flex flex-col gap-5">
                <h3 className="text-base font-serif text-ink border-b border-line pb-3">Ready to work?</h3>
                
                <div>
                  <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-2">Work from where?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "office", label: "Office", icon: Building2 },
                      { id: "wfh", label: "Home", icon: Home },
                      { id: "onsite", label: "On-Site", icon: MapPin },
                      { id: "field", label: "Field", icon: Briefcase },
                    ].map((loc) => {
                      const Icon = loc.icon;
                      const isSelected = workLocation === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => setWorkLocation(loc.id as any)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            isSelected
                              ? "border-ink bg-ink/5 text-ink ring-1 ring-ink/10"
                              : "border-line bg-bone/30 text-muted hover:bg-bone hover:border-line-2 hover:text-ink/80"
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? "text-ink" : "text-muted/60"}`} strokeWidth={1.5} />
                          <span className="text-[12px] font-medium">{loc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-2">Notes (Optional)</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-bone/30 border border-line rounded-xl px-3 py-2.5 text-[13px] outline-none hover:border-line-2 focus:border-ink focus:bg-paper focus:ring-4 focus:ring-ink/5 transition-all resize-none h-16 placeholder:text-muted/50"
                    placeholder="E.g., Traffic delayed me by 10 mins..."
                  />
                </div>

                <button
                  onClick={handlePunchIn}
                  disabled={isPunchingIn}
                  className="w-full flex items-center justify-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-xl text-[14px] font-medium hover:bg-ink/90 hover:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-md shadow-ink/20 mt-1"
                >
                  <Clock className="w-4 h-4" />
                  Punch In Now
                </button>
              </div>
            ) : (
              // Clock Out Panel
              <div className="flex flex-col gap-5">
                <div className="border-b border-line pb-4">
                  <h3 className="text-base font-serif text-ink mb-1.5">Active Shift</h3>
                  {status.active_log?.clock_in && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                      <p className="text-[12px] text-emerald-700 font-medium uppercase tracking-wider mb-0.5">Clocked in at</p>
                      <p className="text-2xl font-serif text-emerald-900">{formatTime(status.active_log.clock_in)}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-2">End of Shift Notes (Optional)</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-bone/30 border border-line rounded-xl px-3 py-2.5 text-[13px] outline-none hover:border-line-2 focus:border-ink focus:bg-paper focus:ring-4 focus:ring-ink/5 transition-all resize-none h-20 placeholder:text-muted/50"
                    placeholder="Summarize your shift..."
                  />
                </div>

                <button
                  onClick={handlePunchOut}
                  disabled={punchOutMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl text-[14px] font-medium hover:opacity-95 hover:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-md shadow-accent/20 mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  Clock Out
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

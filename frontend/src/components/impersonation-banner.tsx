"use client";

import { useEffect, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { endImpersonation, getImpersonation, type ImpersonationInfo } from "@/lib/saas";

/** Shown across the CRM while a platform admin is logged in as a tenant user. */
export function ImpersonationBanner() {
  const [info, setInfo] = useState<ImpersonationInfo | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setInfo(getImpersonation());
  }, []);

  if (!info) return null;
  const endsAt = new Date(new Date(info.started_at).getTime() + info.expires_in_hours * 3_600_000);

  return (
    <div className="sticky top-0 z-[70] flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-amber-500/30 bg-gradient-to-r from-[#2A1F0B] via-[#3A2A0E] to-[#2A1F0B] px-4 py-2 text-[12.5px] text-amber-100 shadow-lg">
      <span className="flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-amber-300" />
        Viewing as <b className="font-semibold text-white">{info.user.name}</b>
        <span className="text-amber-200/60">({info.user.email})</span> in <b className="font-semibold text-white">{info.company.name}</b>
      </span>
      <span className="text-amber-200/50">Session ends {endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Actions are logged.</span>
      <button
        onClick={() => {
          setLeaving(true);
          void endImpersonation();
        }}
        disabled={leaving}
        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-1 font-medium text-amber-100 transition hover:bg-amber-300/20 disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" /> {leaving ? "Returning…" : "Return to admin"}
      </button>
    </div>
  );
}

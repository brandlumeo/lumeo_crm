"use client";

import { useShiftHistory, useCurrentUser } from "@/lib/queries";
import { Clock, MapPin, MonitorSmartphone, Users } from "lucide-react";
import { formatLongDate } from "@/lib/utils";

export default function TeamAttendancePage() {
  const { data: user } = useCurrentUser();
  const { data: logs, isLoading } = useShiftHistory(true);

  if (isLoading) {
    return (
      <div className="p-7 max-w-7xl">
        <div className="h-8 bg-bone-2 rounded w-1/4 mb-4 animate-pulse" />
        <div className="h-4 bg-bone-2 rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  // Ensure only managers can view
  if (!user?.has_management_access) {
    return (
      <div className="p-7 max-w-7xl">
        <h1 className="text-2xl font-serif text-ink mb-4">Access Denied</h1>
        <p className="text-muted">You must be a secondary admin or primary admin to view team attendance.</p>
      </div>
    );
  }

  return (
    <div className="p-7 max-w-7xl flex flex-col gap-8 animate-rise">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[32px] tracking-tight flex items-center gap-3">
          <Users className="w-8 h-8 text-accent" />
          Team Attendance
        </h1>
        <p className="text-[13.5px] text-muted">
          View real-time clock-in and clock-out logs for all staff members across your company.
        </p>
      </div>

      <div className="card p-0 border border-line bg-paper overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-bone border-b border-line text-muted uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-5">Staff Member</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Clock In</th>
                <th className="py-3 px-5">Clock Out</th>
                <th className="py-3 px-5">Location</th>
                <th className="py-3 px-5">IP Address</th>
                <th className="py-3 px-5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {logs?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No attendance logs found.
                  </td>
                </tr>
              ) : (
                logs?.map((log) => (
                  <tr key={log.id} className="border-b border-line-2 last:border-0 table-row-hover">
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-ink text-[13px]">{log.user_full_name || "Unknown"}</div>
                      <div className="text-[11px] text-muted font-mono">{log.user_email}</div>
                    </td>
                    <td className="py-3.5 px-5 text-[13px] text-ink-2">
                      {formatLongDate(new Date(log.clock_in))}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <Clock className="w-3.5 h-3.5 text-muted" />
                        <span>{new Date(log.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      {log.clock_out ? (
                        <div className="flex items-center gap-1.5 text-[13px]">
                          <Clock className="w-3.5 h-3.5 text-muted" />
                          <span>{new Date(log.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active Shift
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5 text-[12px] capitalize font-medium text-ink-2">
                        {log.work_location === "wfh" ? (
                          <MonitorSmartphone className="w-3.5 h-3.5 text-blue-500" />
                        ) : log.work_location === "office" ? (
                          <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-muted" />
                        )}
                        <span>{log.work_location}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[11px] text-muted">
                      {log.ip_address || "—"}
                    </td>
                    <td className="py-3.5 px-5 text-[12px] text-ink-2 max-w-[200px] truncate" title={log.notes}>
                      {log.notes ? (
                        <span className="italic">"{log.notes}"</span>
                      ) : (
                        <span className="text-muted/50">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

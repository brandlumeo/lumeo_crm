"use client";

import { useState } from "react";
import { useAttendanceMatrix, useCurrentUser } from "@/lib/queries";
import { downloadAttendanceMatrixCSV } from "@/lib/api";
import { Users, Download, ChevronLeft, ChevronRight, Check, X, Clock, PlaneTakeoff, Star, CalendarOff, Hourglass } from "lucide-react";

export default function TeamAttendancePage() {
  const { data: user } = useCurrentUser();
  
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  const { data: matrixData, isLoading } = useAttendanceMatrix(currentDate.month, currentDate.year);

  // Ensure only managers can view
  if (user && !user.has_management_access) {
    return (
      <div className="p-7 max-w-7xl">
        <h1 className="text-2xl font-serif text-ink mb-4">Access Denied</h1>
        <p className="text-muted">You must be a secondary admin or primary admin to view team attendance.</p>
      </div>
    );
  }

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      let m = prev.month - 1;
      let y = prev.year;
      if (m < 1) {
        m = 12;
        y--;
      }
      return { month: m, year: y };
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      let m = prev.month + 1;
      let y = prev.year;
      if (m > 12) {
        m = 1;
        y++;
      }
      return { month: m, year: y };
    });
  };

  const getMonthName = (m: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString('default', { month: 'long' });
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <div title="Present" className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white shadow-sm"><Check className="w-4 h-4 stroke-[3]" /></div>;
      case 'absent': return <div title="Absent" className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent border border-slate-300 text-slate-400"><X className="w-4 h-4 stroke-[2.5]" /></div>;
      case 'half_day': return <div title="Half Day" className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 text-white shadow-sm"><Hourglass className="w-3.5 h-3.5 stroke-[2.5]" /></div>;
      case 'late': return <div title="Late" className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-white shadow-sm"><Clock className="w-4 h-4 stroke-[2.5]" /></div>;
      case 'leave': return <div title="On Leave" className="flex items-center justify-center w-7 h-7 rounded-full bg-[#378ADD] text-white shadow-sm"><PlaneTakeoff className="w-4 h-4 stroke-[2.5]" /></div>;
      case 'holiday': return <div title="Holiday" className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 text-white shadow-sm"><Star className="w-4 h-4 stroke-[2.5] fill-white" /></div>;
      case 'day_off': return <div title="Day Off" className="flex items-center justify-center w-7 h-7 rounded-full bg-transparent border border-slate-300 text-slate-400"><CalendarOff className="w-4 h-4 stroke-[2.5]" /></div>;
      case 'future': return <div className="w-7 h-7" />;
      default: return <div className="w-7 h-7 text-xs text-muted">-</div>;
    }
  };

  return (
    <div className="p-7 w-full flex flex-col gap-6 animate-rise overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-[32px] tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-accent" />
            Team Attendance Matrix
          </h1>
          <p className="text-[13.5px] text-muted">
            Premium real-time matrix view of all staff members' attendance records.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-paper border border-line rounded-lg overflow-hidden p-1">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-bone rounded transition-colors text-muted hover:text-ink">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1 font-medium text-[13px] min-w-[120px] text-center">
              {getMonthName(currentDate.month)} {currentDate.year}
            </div>
            <button onClick={handleNextMonth} className="p-2 hover:bg-bone rounded transition-colors text-muted hover:text-ink">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => downloadAttendanceMatrixCSV(currentDate.month, currentDate.year)}
            className="flex items-center gap-2 bg-ink text-paper px-5 py-2.5 rounded-lg text-[13px] font-bold shadow-sm hover:bg-ink-2 hover:-translate-y-0.5 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Legend */}
      <div className="bg-paper border border-line rounded-lg p-4 flex flex-wrap items-center gap-6 text-[12.5px] font-medium text-ink-2 shadow-sm">
        <span className="text-muted uppercase tracking-wider text-[11px] font-bold">Legend:</span>
        <div className="flex items-center gap-2">{getStatusIcon('present')} Present</div>
        <div className="flex items-center gap-2">{getStatusIcon('half_day')} Half Day</div>
        <div className="flex items-center gap-2">{getStatusIcon('late')} Late</div>
        <div className="flex items-center gap-2">{getStatusIcon('absent')} Absent</div>
        <div className="flex items-center gap-2">{getStatusIcon('leave')} On Leave</div>
        <div className="flex items-center gap-2">{getStatusIcon('holiday')} Holiday</div>
        <div className="flex items-center gap-2">{getStatusIcon('day_off')} Day Off</div>
      </div>

      <div className="card p-0 border border-line bg-paper overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          {isLoading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-pulse text-muted text-sm font-medium">Loading premium matrix engine...</div>
            </div>
          ) : !matrixData?.matrix || matrixData.matrix.length === 0 ? (
            <div className="p-10 text-center text-muted text-[13px]">
              No employees found.
            </div>
          ) : (
            <table className="min-w-max w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-bone border-b border-line text-muted uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-4 px-5 sticky left-0 bg-bone z-20 border-r border-line shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] min-w-[200px]">Team Member</th>
                  {Array.from({ length: matrixData.days_in_month }).map((_, i) => {
                    const dateObj = new Date(currentDate.year, currentDate.month - 1, i + 1);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <th key={i} className="py-3 px-2 text-center min-w-[44px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[12px] font-bold text-ink">{i + 1}</span>
                          <span className="text-[9px] font-medium text-muted uppercase tracking-wider">{dayName}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-4 px-4 text-center border-l border-line min-w-[80px]">Mix</th>
                  <th className="py-4 px-4 text-center">Present</th>
                  <th className="py-4 px-4 text-center">Absent</th>
                  <th className="py-4 px-4 text-center">Half</th>
                  <th className="py-4 px-4 text-center">Late</th>
                  <th className="py-4 px-4 text-center pr-6">Leave</th>
                </tr>
              </thead>
              <tbody>
                {matrixData.matrix.map((row: any) => {
                  const lateCount = row.counts?.late || 0;
                  const presentCount = row.counts?.present || 0;
                  const totalPresent = presentCount + lateCount;
                  
                  return (
                  <tr key={row.id} className="border-b border-line-2 last:border-0 hover:bg-bone-2 transition-colors">
                    <td className="py-3 px-5 sticky left-0 bg-paper z-20 border-r border-line shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] group-hover:bg-bone-2 transition-colors">
                      <div className="font-medium text-ink text-[13.5px] truncate max-w-[220px]">{row.name}</div>
                      <div className="text-[11px] text-muted capitalize mt-0.5">{row.designation || row.role}</div>
                    </td>
                    {Array.from({ length: matrixData.days_in_month }).map((_, i) => {
                      const dayString = (i + 1).toString();
                      const status = row.days[dayString] || "absent";
                      return (
                        <td key={i} className="py-2 px-2 text-center">
                          <div className="flex justify-center">
                            {getStatusIcon(status)}
                          </div>
                        </td>
                      );
                    })}
                    
                    {/* Aggregates columns */}
                    <td className="py-3 px-4 text-center border-l border-line">
                      <div className="flex h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden mx-auto">
                        <div className="bg-emerald-500 h-full" style={{ width: `${totalPresent / matrixData.days_in_month * 100}%` }} />
                        <div className="bg-orange-400 h-full" style={{ width: `${(row.counts?.half_day || 0) / matrixData.days_in_month * 100}%` }} />
                        <div className="bg-[#378ADD] h-full" style={{ width: `${(row.counts?.leave || 0) / matrixData.days_in_month * 100}%` }} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`text-[13px] ${totalPresent > 0 ? "font-bold text-emerald-600" : "font-normal text-slate-400"}`}>
                          {totalPresent}
                        </span>
                        {lateCount > 0 && (
                          <span className="flex items-center justify-center gap-0.5 bg-amber-50 border border-amber-200/60 text-amber-600 text-[9px] font-bold px-1 py-0.5 rounded-sm" title={`${lateCount} Late Arrivals`}>
                            <Clock className="w-2.5 h-2.5 stroke-[2.5]" />
                            {lateCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-center text-[13px] ${(row.counts?.absent || 0) > 0 ? "font-bold text-slate-500" : "font-normal text-slate-400"}`}>{row.counts?.absent || 0}</td>
                    <td className={`py-3 px-4 text-center text-[13px] ${(row.counts?.half_day || 0) > 0 ? "font-bold text-orange-500" : "font-normal text-slate-400"}`}>{row.counts?.half_day || 0}</td>
                    <td className={`py-3 px-4 text-center text-[13px] ${lateCount > 0 ? "font-bold text-amber-500" : "font-normal text-slate-400"}`}>{lateCount}</td>
                    <td className={`py-3 px-4 text-center text-[13px] pr-6 ${(row.counts?.leave || 0) > 0 ? "font-bold text-[#378ADD]" : "font-normal text-slate-400"}`}>{row.counts?.leave || 0}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

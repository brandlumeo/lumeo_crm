"use client";
import { useState } from "react";
import { useHolidays, useCreateHoliday, useDeleteHoliday } from "@/lib/queries";
import { Calendar, Plus, Trash2, Loader2, Info, Sun, Heart, Umbrella, Gift, Star } from "lucide-react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthAbbr(dateStr: string) {
  const d = new Date(dateStr);
  return MONTH_NAMES[d.getUTCMonth()];
}
function getDayNum(dateStr: string) {
  return new Date(dateStr).getUTCDate();
}
function getWeekday(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: "long" });
}
function getFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

const HOLIDAY_COLORS = [
  { bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-700", num: "bg-rose-500", icon: <Gift className="w-4 h-4 text-rose-500" /> },
  { bg: "bg-blue-100", border: "border-blue-200", text: "text-blue-700", num: "bg-blue-500", icon: <Sun className="w-4 h-4 text-blue-500" /> },
  { bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-700", num: "bg-emerald-500", icon: <Heart className="w-4 h-4 text-emerald-500" /> },
  { bg: "bg-violet-100", border: "border-violet-200", text: "text-violet-700", num: "bg-violet-500", icon: <Star className="w-4 h-4 text-violet-500" /> },
  { bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-700", num: "bg-amber-500", icon: <Umbrella className="w-4 h-4 text-amber-500" /> },
];

const LEAVE_STATS = [
  { label: "Paid Annual Leaves", value: 15, unit: "days/year", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500", pct: 75 },
  { label: "Sick Leaves", value: 10, unit: "days/year", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", bar: "bg-blue-500", pct: 50 },
  { label: "Casual Leaves", value: 5, unit: "days/year", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", bar: "bg-violet-500", pct: 25 },
];

export function HRSettings() {
  const { data: holidays, isLoading } = useHolidays();
  const createMutation = useCreateHoliday();
  const deleteMutation = useDeleteHoliday();

  const [newHoliday, setNewHoliday] = useState({ name: "", date: "", description: "" });
  const [isAdding, setIsAdding] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    createMutation.mutate(newHoliday, {
      onSuccess: () => {
        setNewHoliday({ name: "", date: "", description: "" });
        setIsAdding(false);
      },
    });
  };

  const holidayList: any[] = holidays ?? [];

  return (
    <div className="space-y-10 animate-fade-in">

      {/* ───── Company Holidays ───── */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">Company Holidays</h3>
            <p className="text-[14px] text-muted">Manage official public holidays. Employees won't be marked absent on these dates.</p>
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="btn bg-ink hover:bg-ink-dark text-white px-5 text-[13px] flex items-center gap-2 shadow-sm shrink-0 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          )}
        </div>

        {/* Holiday card */}
        <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 via-pink-400 to-red-400" />

          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[13px]">Loading holidays...</span>
            </div>
          ) : holidayList.length === 0 && !isAdding ? (
            <div className="py-16 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-rose-400" />
              </div>
              <div className="text-[14px] font-semibold text-ink">No holidays added yet</div>
              <p className="text-[13px] text-muted max-w-xs">Add your company's official public holidays so attendance records stay accurate.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="btn bg-ink text-white text-[13px] px-5 mt-1 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add first holiday
              </button>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {holidayList.map((holiday: any, i: number) => {
                const palette = HOLIDAY_COLORS[i % HOLIDAY_COLORS.length];
                return (
                  <div
                    key={holiday.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-bone/40 transition-all group"
                  >
                    {/* Calendar date tile */}
                    <div className={`w-12 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border ${palette.bg} ${palette.border}`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${palette.text}`}>
                        {getMonthAbbr(holiday.date)}
                      </span>
                      <span className={`text-xl font-bold ${palette.text} leading-tight`}>
                        {getDayNum(holiday.date)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-ink">{holiday.name}</span>
                        {palette.icon}
                      </div>
                      <div className="text-[12px] text-muted mt-0.5 flex items-center gap-2">
                        <span className="font-medium">{getWeekday(holiday.date)},</span>
                        <span>{getFullDate(holiday.date)}</span>
                        {holiday.description && (
                          <>
                            <span>·</span>
                            <span className="truncate">{holiday.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteMutation.mutate(holiday.id)}
                      disabled={deleteMutation.isPending}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 text-muted hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      title="Delete Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline Add Form */}
          {isAdding && (
            <div className={`p-6 border-t border-line bg-bone/40 ${holidayList.length > 0 ? "" : "border-t-0"}`}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-rose-500" />
                </div>
                <span className="text-[13px] font-semibold text-ink">New Holiday</span>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Holiday Name</label>
                    <input
                      type="text"
                      required
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      placeholder="e.g. New Year's Day"
                      className="input w-full bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-ink mb-1.5">Date</label>
                    <input
                      type="date"
                      required
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      className="input w-full bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink mb-1.5">Description <span className="text-muted font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={newHoliday.description}
                    onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                    placeholder="Brief note about this holiday"
                    className="input w-full bg-white"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="btn bg-ink hover:bg-ink-dark text-white text-[13px] px-5 flex items-center gap-2 transition-all"
                  >
                    {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Save Holiday
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="btn btn-secondary text-[13px] px-4"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Summary badge */}
        {!isAdding && holidayList.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span>{holidayList.length} official holiday{holidayList.length !== 1 ? "s" : ""} configured</span>
          </div>
        )}
      </div>

      {/* ───── Default Leave Policy ───── */}
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-ink tracking-tight mb-1">Default Leave Policy</h3>
          <p className="text-[14px] text-muted">Standard leave allowances applied globally across all employees.</p>
        </div>

        <div className="bg-white border border-line rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400" />

          <div className="p-6 sm:p-8 pt-9">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {LEAVE_STATS.map(stat => (
                <div key={stat.label} className={`p-5 rounded-xl border ${stat.bg} ${stat.border} flex flex-col gap-3`}>
                  <div className="text-[13px] font-semibold text-ink">{stat.label}</div>
                  <div className={`text-4xl font-bold ${stat.color} leading-none`}>{stat.value}</div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-muted font-medium">{stat.unit}</span>
                      <span className={`text-[11px] font-bold ${stat.color}`}>{stat.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.bar} rounded-full transition-all duration-700`} style={{ width: `${stat.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info notice */}
            <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <p className="text-[13px] leading-relaxed">
                Leave policy is applied globally to all employees. <span className="font-semibold">Custom per-employee policies</span> will be available in an upcoming update.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

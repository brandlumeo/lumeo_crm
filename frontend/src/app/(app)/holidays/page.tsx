"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, Plus, Trash2, MapPin } from "lucide-react";
import {
  useHolidays,
  useCreateHoliday,
  useDeleteHoliday,
  useCurrentUser,
} from "@/lib/queries";
import { formatLongDate } from "@/lib/utils";

export default function HolidaysPage() {
  const { data: user } = useCurrentUser();
  const { data: holidays = [], isLoading } = useHolidays();
  const createHolidayMutation = useCreateHoliday();
  const deleteHolidayMutation = useDeleteHoliday();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const isManager = user?.role === "owner" || user?.role === "admin";

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;

    createHolidayMutation.mutate(
      { name, date, description },
      {
        onSuccess: () => {
          setName("");
          setDate("");
          setDescription("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-7 max-w-[1000px] animate-pulse">
        <div className="h-8 bg-bone-2 rounded w-1/4 mb-4" />
        <div className="h-4 bg-bone-2 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="p-7 pb-16 max-w-[1000px] flex flex-col gap-8 animate-rise">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[32px] tracking-tight">Company Holiday Calendar</h1>
        <p className="text-[13.5px] text-muted">
          Official public holidays, observances, and non-working days for the organization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Holidays List */}
        <div className="card h-fit">
          <div className="card-head">
            <div className="card-title">
              <CalendarIcon className="w-[18px] h-[18px] mr-2 inline-block text-muted" />
              Company Holidays
              <span className="card-title-meta">{holidays.length} configured</span>
            </div>
          </div>

          <div className="p-5 flex flex-col">
            {holidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center bg-bone-2/30 rounded border border-dashed border-line">
                <CalendarIcon className="w-8 h-8 text-muted mb-3 opacity-30" />
                <p className="text-sm text-muted italic">No holidays configured yet.</p>
              </div>
            ) : (
              (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcomingHolidays = holidays.filter((h) => {
                  const d = new Date(h.date);
                  d.setHours(0, 0, 0, 0);
                  return d >= today;
                });

                const pastHolidays = holidays.filter((h) => {
                  const d = new Date(h.date);
                  d.setHours(0, 0, 0, 0);
                  return d < today;
                });

                const renderHoliday = (holiday: any) => (
                  <div key={holiday.id} className="group relative flex flex-col gap-1 py-3.5 border-b border-line last:border-0 hover:bg-bone/30 px-3 -mx-3 rounded transition-colors">
                    <div className="font-medium text-ink text-[14.5px]">{holiday.name}</div>
                    <div className="text-[12px] text-muted flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {formatLongDate(new Date(holiday.date))}
                    </div>
                    {holiday.description && (
                      <p className="text-[12.5px] text-muted mt-1 italic">{holiday.description}</p>
                    )}
                    
                    {isManager && (
                      <button
                        onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                        disabled={deleteHolidayMutation.isPending}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500/60 hover:text-red-600 hover:bg-red-50 p-2 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );

                return (
                  <div className="flex flex-col gap-6">
                    {upcomingHolidays.length > 0 && (
                      <div className="flex flex-col">
                        <h3 className="text-xs font-bold text-ink-2 uppercase tracking-wider mb-2 px-3">Upcoming Holidays</h3>
                        {upcomingHolidays.map(renderHoliday)}
                      </div>
                    )}
                    
                    {pastHolidays.length > 0 && (
                      <div className="flex flex-col">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-3">Past Holidays</h3>
                        <div className="opacity-75">
                          {pastHolidays.map(renderHoliday)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Create Holiday Form */}
        {isManager && (
          <div className="card h-fit">
            <div className="card-head">
              <div className="card-title">
                New holiday
              </div>
            </div>
            <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Holiday Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Year's Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none placeholder:text-muted/50 placeholder:italic transition-colors hover:border-line-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent border border-line rounded px-3 py-2 text-[13px] text-muted focus:text-ink focus:border-ink outline-none transition-colors hover:border-line-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Description (Optional)</label>
                <textarea
                  placeholder="Additional context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-transparent border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none resize-none placeholder:text-muted/50 placeholder:italic transition-colors hover:border-line-2"
                />
              </div>

              <button
                type="submit"
                disabled={createHolidayMutation.isPending}
                className="btn btn-primary w-full mt-2"
              >
                <Plus className="w-4 h-4 mr-1.5 inline-block" />
                {createHolidayMutation.isPending ? "Adding..." : "Add holiday"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

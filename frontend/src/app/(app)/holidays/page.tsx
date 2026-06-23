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
        <div className="card p-6 border border-line bg-paper flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-line-2 pb-3">
            <CalendarIcon className="w-5 h-5 text-ink-2" />
            <h2 className="font-serif text-[20px]">Upcoming Holidays</h2>
          </div>

          <div className="flex flex-col gap-3">
            {holidays.length === 0 ? (
              <p className="text-sm text-muted italic">No holidays configured yet.</p>
            ) : (
              holidays.map((holiday) => (
                <div key={holiday.id} className="border border-line rounded-lg p-4 bg-bone/30 flex items-center justify-between group">
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-[15px]">{holiday.name}</div>
                    <div className="text-sm text-ink-2 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-muted" />
                      {formatLongDate(new Date(holiday.date))}
                    </div>
                    {holiday.description && (
                      <p className="text-[12.5px] text-muted mt-1 italic">{holiday.description}</p>
                    )}
                  </div>
                  
                  {isManager && (
                    <button
                      onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                      disabled={deleteHolidayMutation.isPending}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove Holiday"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Holiday Form */}
        {isManager && (
          <div className="card p-6 border border-line bg-bone flex flex-col gap-4 h-fit">
            <h2 className="font-serif text-[18px]">Add New Holiday</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Holiday Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Year's Day"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-muted font-medium">Description (Optional)</label>
                <textarea
                  placeholder="Additional context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="bg-paper border border-line rounded px-3 py-2 text-sm focus:border-ink outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createHolidayMutation.isPending}
                className="bg-ink hover:opacity-90 text-paper py-2.5 rounded-lg text-xs font-semibold transition-all mt-2 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {createHolidayMutation.isPending ? "ADDING..." : "ADD HOLIDAY"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

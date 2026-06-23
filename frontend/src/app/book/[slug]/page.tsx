"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { usePublicBookingLink, useSubmitPublicBooking } from "@/lib/queries";
import { Calendar, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { addDays, format } from "date-fns";

export default function BookingPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  
  const { data: linkInfo, isLoading, error } = usePublicBookingLink(slug);
  const submitMutation = useSubmitPublicBooking(slug);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  
  const [isSuccess, setIsSuccess] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-muted animate-spin" />
      </div>
    );
  }

  if (error || !linkInfo) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4">
        <div className="bg-white border border-line rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-semibold text-ink mb-2">Link Unavailable</h1>
          <p className="text-muted text-sm">This booking link is invalid or no longer active.</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-4">
        <div className="bg-white border border-line rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-semibold text-ink mb-2">Meeting Confirmed</h1>
          <p className="text-muted text-sm mb-6">
            You're scheduled with {linkInfo.user_name} on {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")} at {selectedTime}.
            An invitation has been sent to {email}.
          </p>
          <button onClick={() => window.location.reload()} className="btn bg-bone-2 hover:bg-bone text-ink-2">Book Another</button>
        </div>
      </div>
    );
  }

  // Generate next 14 days
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1)).filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  
  // Mock time slots
  const timeSlots = ["09:00 AM", "09:30 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:30 PM", "03:00 PM", "04:00 PM"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;
    
    submitMutation.mutate({
      name,
      email,
      date: format(selectedDate, "yyyy-MM-dd"),
      time: selectedTime
    }, {
      onSuccess: () => {
        setIsSuccess(true);
      }
    });
  };

  return (
    <div className="min-h-screen bg-bone py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Info Panel */}
        <div className="w-full md:w-1/3 bg-bone-2 p-8 border-b md:border-b-0 md:border-r border-line flex flex-col">
          <div className="mb-8">
            <p className="text-sm font-medium text-muted mb-1">{linkInfo.company_name}</p>
            <h1 className="text-2xl font-semibold text-ink">{linkInfo.name}</h1>
            <p className="text-ink-2 mt-2">{linkInfo.user_name}</p>
          </div>
          
          <div className="space-y-4 text-sm text-ink-2 mb-8">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted" />
              {linkInfo.duration_minutes} min
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted" />
              Web Conference details provided upon confirmation.
            </div>
          </div>
          
          <div className="mt-auto">
            <p className="text-sm text-muted whitespace-pre-wrap">{linkInfo.description}</p>
          </div>
        </div>

        {/* Right Interactive Panel */}
        <div className="w-full md:w-2/3 p-8">
          
          {!selectedDate ? (
            <div>
              <h2 className="text-lg font-medium text-ink mb-6">Select a Date & Time</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {availableDates.map((date, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className="flex flex-col items-center justify-center p-3 border border-line rounded-xl hover:border-ink hover:bg-bone-2 transition-all"
                  >
                    <span className="text-xs font-medium text-muted uppercase">{format(date, "MMM")}</span>
                    <span className="text-xl font-semibold text-ink my-0.5">{format(date, "d")}</span>
                    <span className="text-xs text-muted">{format(date, "EEE")}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : !selectedTime ? (
            <div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="text-sm font-medium text-muted hover:text-ink mb-6 flex items-center gap-1 transition-colors"
              >
                ← Back to dates
              </button>
              <h2 className="text-lg font-medium text-ink mb-2">{format(selectedDate, "EEEE, MMMM d")}</h2>
              <p className="text-sm text-muted mb-6">Select an available time slot</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {timeSlots.map((time, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTime(time)}
                    className="py-3 px-4 border border-line text-ink font-medium rounded-xl hover:border-ink hover:bg-bone-2 transition-all"
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between mb-6">
                <button 
                  type="button"
                  onClick={() => setSelectedTime(null)}
                  className="text-sm font-medium text-muted hover:text-ink flex items-center gap-1 transition-colors"
                >
                  ← Back to times
                </button>
                <div className="bg-bone px-3 py-1.5 rounded-lg text-sm font-medium text-ink flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted" />
                  {selectedTime}
                </div>
              </div>
              
              <h2 className="text-lg font-medium text-ink mb-6">Enter Details</h2>
              
              <div className="space-y-4 max-w-sm">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink-2">Name</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Jane Doe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-ink-2">Email Address</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="jane@example.com" />
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={submitMutation.isPending}
                    className="w-full btn btn-primary flex justify-center"
                  >
                    {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Booking"}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

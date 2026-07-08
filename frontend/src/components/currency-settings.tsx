"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  DollarSign, Loader2, CheckCircle, XCircle, Shield, 
  Banknote, ArrowRightLeft, Globe
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CurrencySettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [currency, setCurrency] = useState(company?.currency ?? "USD");

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Currency preferences updated successfully." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update currency settings. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
            <DollarSign className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Currency Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure the default base currency for your invoices, quotes, and reporting.
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => mutation.mutate({ currency })}
            disabled={mutation.isPending || currency === company.currency}
            className="btn bg-ink hover:bg-ink-2 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-medium flex items-center gap-2 shrink-0 group relative overflow-hidden bg-ink hover:bg-black text-white"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Save Currency</>
            )}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can make changes.</span>
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Base Currency */}
        <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col group/card hover:shadow-md transition-shadow relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="p-6 sm:p-8 space-y-8 flex-1 pt-9">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-[16px] font-semibold text-ink">Base Currency</h4>
                <p className="text-[13px] text-muted">Primary financial metric unit.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted" /> Primary Currency
                </label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disabled={!isAdmin}
                    className={cn("input w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10 text-[14px]", !isAdmin && "opacity-70 cursor-not-allowed")}
                  >
                    <option value="USD">USD - United States Dollar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - British Pound (£)</option>
                    <option value="INR">INR - Indian Rupee (₹)</option>
                    <option value="AUD">AUD - Australian Dollar (A$)</option>
                    <option value="CAD">CAD - Canadian Dollar (C$)</option>
                    <option value="SGD">SGD - Singapore Dollar (S$)</option>
                    <option value="AED">AED - UAE Dirham (د.إ)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-muted">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800">
                <ArrowRightLeft className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                <p className="text-[13px] leading-relaxed">
                  <span className="font-semibold text-blue-700 block mb-1">Important Note</span>
                  Changing your base currency will not automatically convert existing historical invoices or deals. New financial entries will default to the selected currency above.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bone/40 px-8 py-4 border-t border-line flex items-center justify-between mt-auto">
            <span className="text-[12.5px] text-muted flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Currency conversion rates update daily.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

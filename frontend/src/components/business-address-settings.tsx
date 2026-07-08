"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, Loader2, CheckCircle, XCircle, Shield, 
  MapPin, Map, Navigation
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function BusinessAddressForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [address1, setAddress1] = useState(company?.address_line1 ?? "");
  const [address2, setAddress2] = useState(company?.address_line2 ?? "");
  const [city, setCity] = useState(company?.city ?? "");
  const [state, setState] = useState(company?.state ?? "");
  const [zip, setZip] = useState(company?.postal_code ?? "");
  const [country, setCountry] = useState(company?.country ?? "");

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Business address updated successfully." });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update business address. Please try again." });
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner shrink-0">
            <Building2 className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Business Address</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure your company's physical or registered business address.
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => mutation.mutate({
              address_line1: address1,
              address_line2: address2,
              city,
              state,
              postal_code: zip,
              country
            })}
            disabled={mutation.isPending}
            className="btn bg-ink hover:bg-ink-2 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-medium flex items-center gap-2 shrink-0 group relative overflow-hidden bg-ink hover:bg-black text-white"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Save Address</>
            )}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can modify the business address.</span>
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

      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500"></div>
        
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          
          <div className="flex items-start sm:items-center gap-4 p-5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-100/50 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-paper border border-amber-200 flex items-center justify-center shrink-0 shadow-sm">
              <MapPin className="w-6 h-6 text-amber-600" strokeWidth={2} />
            </div>
            <div className="pr-4">
              <div className="text-[15px] font-semibold text-ink mb-0.5">Office Location</div>
              <div className="text-[13px] text-muted leading-snug">This address appears on invoices, contracts, and official documents.</div>
            </div>
          </div>

          <div className="max-w-2xl space-y-6">
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                disabled={!isAdmin}
                className={cn("input w-full h-11 bg-bone/30 focus:bg-paper", !isAdmin && "opacity-70 cursor-not-allowed")}
                placeholder="123 Business Rd, Suite 100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                Address Line 2 <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                disabled={!isAdmin}
                className={cn("input w-full h-11 bg-bone/30 focus:bg-paper", !isAdmin && "opacity-70 cursor-not-allowed")}
                placeholder="Building B, Floor 3"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <Map className="w-4 h-4 text-muted" /> City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isAdmin}
                  className={cn("input w-full h-11 bg-bone/30 focus:bg-paper", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  State / Province
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!isAdmin}
                  className={cn("input w-full h-11 bg-bone/30 focus:bg-paper", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-muted" /> Postal Code
                </label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  disabled={!isAdmin}
                  className={cn("input w-full h-11 bg-bone/30 focus:bg-paper font-mono text-sm", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!isAdmin}
                  className={cn("input w-full h-11 bg-bone/30 focus:bg-paper", !isAdmin && "opacity-70 cursor-not-allowed")}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-bone/40 px-8 py-4 border-t border-line mt-auto flex items-center justify-between">
          <div className="text-[12.5px] text-muted flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            Please ensure the address is correct for tax purposes.
          </div>
        </div>
      </div>
    </div>
  );
}

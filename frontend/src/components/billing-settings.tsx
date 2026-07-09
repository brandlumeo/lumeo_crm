"use client";

import { useCurrentUser } from "@/lib/queries";
import { Loader2, Shield, Receipt, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";

export function BillingSettings() {
  const { data: user, isLoading } = useCurrentUser();
  const isAdmin = user?.role === "owner" || user?.role === "admin";

  if (isLoading) return (
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center border border-violet-500/20 shadow-inner shrink-0">
            <Receipt className="w-7 h-7 text-violet-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Billing & Subscription</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Manage your Razorpay subscriptions, team seat limits, and view invoice history.
            </p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can manage billing.</span>
        </div>
      )}

      {/* Portal Link Card */}
      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative group/card hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"></div>
        
        <div className="p-8 sm:p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center mb-6 shadow-sm relative">
            <div className="absolute inset-0 rounded-full border-2 border-violet-200 border-dashed animate-spin-slow opacity-50"></div>
            <Receipt className="w-8 h-8 text-violet-600" />
          </div>
          
          <h4 className="text-xl font-bold text-ink mb-3">Dedicated Billing Portal</h4>
          <p className="text-[14px] text-muted max-w-md mb-8 leading-relaxed">
            Subscription management, Razorpay payment methods, plan upgrades, and invoices are handled in our dedicated billing environment.
          </p>

          <Link 
            href="/billing"
            className="btn btn-primary shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all h-12 px-8 rounded-xl font-medium flex items-center gap-2 group relative overflow-hidden bg-violet-600 hover:bg-violet-700 text-white"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative flex items-center gap-2">
              Open Billing Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>
        
        <div className="bg-bone/40 px-8 py-4 border-t border-line flex items-center justify-center">
          <div className="text-[12.5px] text-muted flex items-center gap-2 font-medium">
            <ExternalLink className="w-3.5 h-3.5" /> Secured by Razorpay
          </div>
        </div>
      </div>
    </div>
  );
}

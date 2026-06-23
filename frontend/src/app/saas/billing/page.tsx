"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CreditCard, Search, ArrowUpRight, ChevronDown, Check } from "lucide-react";
import * as Select from "@radix-ui/react-select";

export default function SaasBilling() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = () => {
    api.get("/saas/subscriptions/").then(res => setSubscriptions(res.data.results || res.data)).catch(console.error);
  };

  const handlePlanChange = async (id: number, newPlan: string) => {
    await api.patch(`/saas/subscriptions/${id}/`, { plan: newPlan });
    fetchSubscriptions();
  };

  const handleStatusChange = async (id: number, isActive: boolean) => {
    await api.patch(`/saas/subscriptions/${id}/`, { is_active: isActive });
    fetchSubscriptions();
  };

  return (
    <div className="space-y-8 animate-fade-in relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <CreditCard className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Billing & Subscriptions</h1>
            <p className="text-white/50 text-sm mt-1">Manage tenant plans, payments, and active subscriptions.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-2xl overflow-hidden shadow-xl relative">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Search subscriptions by company..." 
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/20 text-white/40">
              <tr>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Current Plan</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">MRR Effect</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider text-right">Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subscriptions.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white/90">{sub.company_name}</div>
                    <div className="text-white/40 text-xs mt-0.5">Since {new Date(sub.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Select.Root
                      value={sub.plan}
                      onValueChange={(value) => handlePlanChange(sub.id, value)}
                    >
                      <Select.Trigger className="inline-flex items-center justify-between w-[120px] bg-black/40 border border-white/10 hover:bg-white/5 transition-colors rounded-lg px-3 py-1.5 text-xs text-white/90 outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50">
                        <Select.Value />
                        <Select.Icon>
                          <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className="overflow-hidden bg-[#1a1a1f] border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95"
                          position="popper"
                          sideOffset={4}
                        >
                          <Select.Viewport className="p-1.5">
                            {[
                              { value: "free", label: "Free Trial" },
                              { value: "starter", label: "Starter" },
                              { value: "pro", label: "Pro" },
                              { value: "enterprise", label: "Enterprise" },
                            ].map((plan) => (
                              <Select.Item
                                key={plan.value}
                                value={plan.value}
                                className="relative flex items-center px-6 py-2 text-xs text-white/80 font-medium rounded-md hover:bg-indigo-500/10 hover:text-indigo-300 focus:bg-indigo-500/10 focus:text-indigo-300 focus:outline-none cursor-pointer transition-colors select-none"
                              >
                                <Select.ItemText>{plan.label}</Select.ItemText>
                                <Select.ItemIndicator className="absolute left-1.5 inline-flex items-center justify-center">
                                  <Check className="w-3 h-3 text-indigo-400" />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      sub.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {sub.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {sub.plan === 'free' ? '$0' : sub.plan === 'starter' ? '$9.99' : sub.plan === 'pro' ? '$29.99' : '$79.99'}/mo
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleStatusChange(sub.id, !sub.is_active)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${
                        sub.is_active 
                          ? 'text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20' 
                          : 'text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
                      }`}
                    >
                      {sub.is_active ? 'Suspend Billing' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

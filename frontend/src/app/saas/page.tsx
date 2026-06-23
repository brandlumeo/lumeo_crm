"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Building2, Users, CreditCard, Activity, ArrowUpRight, Sparkles } from "lucide-react";

export default function SaasOverview() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/saas/stats/").then(res => setStats(res.data)).catch(console.error);
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Platform Overview</h1>
          <p className="text-white/50 text-sm mt-1">Real-time metrics and health of the Lumeo SaaS platform.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-sm font-medium shadow-[0_0_15px_rgba(99,102,241,0.15)] w-fit">
          <Sparkles className="w-4 h-4" />
          <span>System Healthy</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Companies" value={stats.total_companies} icon={Building2} sub={`${stats.active_companies} active`} trend="+12%" />
        <StatCard title="Total Users" value={stats.total_users} icon={Users} sub={`${stats.active_users} active`} trend="+5%" />
        <StatCard title="Trial Accounts" value={stats.trial_companies} icon={Activity} sub="In free trial" trend="+2%" />
        <StatCard title="Est. MRR" value={"$" + stats.mrr.toFixed(2)} icon={CreditCard} sub="Based on active plans" trend="+18%" isRevenue />
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Subtle inner glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h3 className="font-semibold text-white text-lg">Recent Signups</h3>
          <button className="text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors">View All</button>
        </div>
        
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
                <th className="pb-4 font-medium px-4">Company</th>
                <th className="pb-4 font-medium px-4">Status</th>
                <th className="pb-4 font-medium px-4 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.recent_companies.map((c: any) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-4 px-4 font-medium text-white/90">{c.name}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      c.status === 'trial' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-white/40 text-right group-hover:text-white/60 transition-colors">
                    {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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

function StatCard({ title, value, icon: Icon, sub, trend, isRevenue }: any) {
  return (
    <div className="bg-[#131316] border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-500" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-white/70 group-hover:text-white transition-colors group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
          <ArrowUpRight className="w-3 h-3" />
          {trend}
        </div>
      </div>
      
      <div className="relative z-10">
        <div className={`text-3xl font-bold tracking-tight mb-1 ${isRevenue ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400' : 'text-white'}`}>
          {value}
        </div>
        <div className="text-sm font-medium text-white/50 mb-1">{title}</div>
        <div className="text-xs text-white/30">{sub}</div>
      </div>
    </div>
  );
}

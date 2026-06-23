"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Building2, Search, MoreHorizontal, ChevronDown, Check } from "lucide-react";
import * as Select from "@radix-ui/react-select";

export default function SaasCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = () => {
    api.get("/saas/companies/").then(res => setCompanies(res.data.results || res.data)).catch(console.error);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await api.patch(`/saas/companies/${id}/`, { status: newStatus });
    fetchCompanies();
  };

  return (
    <div className="space-y-8 animate-fade-in relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Building2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Tenants</h1>
            <p className="text-white/50 text-sm mt-1">Manage workspaces and subscriptions across the platform.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-2xl overflow-hidden shadow-xl relative">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Search tenants..." 
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/20 text-white/40">
              <tr>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Company Name</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Slug</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {companies.map((c: any) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-white/90">{c.name}</div>
                    <div className="text-white/40 text-xs mt-0.5">ID: {c.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-white/5 px-2.5 py-1 rounded-md text-white/60 font-mono text-xs inline-block border border-white/10">
                      {c.slug}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                      c.status === 'trial' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/40">
                    {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <Select.Root
                      value={c.status}
                      onValueChange={(value) => handleStatusChange(c.id, value)}
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
                              { value: "trial", label: "Trial" },
                              { value: "active", label: "Active" },
                              { value: "suspended", label: "Suspended" },
                              { value: "cancelled", label: "Cancelled" },
                            ].map((status) => (
                              <Select.Item
                                key={status.value}
                                value={status.value}
                                className="relative flex items-center px-6 py-2 text-xs text-white/80 font-medium rounded-md hover:bg-indigo-500/10 hover:text-indigo-300 focus:bg-indigo-500/10 focus:text-indigo-300 focus:outline-none cursor-pointer transition-colors select-none"
                              >
                                <Select.ItemText>{status.label}</Select.ItemText>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

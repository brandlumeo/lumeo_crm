"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, Search, ShieldAlert, ShieldCheck } from "lucide-react";

export default function SaasUsers() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    api.get("/saas/users/").then(res => setUsers(res.data.results || res.data)).catch(console.error);
  };

  const handleActiveToggle = async (id: number, isActive: boolean) => {
    await api.patch(`/saas/users/${id}/`, { is_active: isActive });
    fetchUsers();
  };

  return (
    <div className="space-y-8 animate-fade-in relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Global Users</h1>
            <p className="text-white/50 text-sm mt-1">Manage user accounts and access across all tenants.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#131316] border border-white/5 rounded-2xl overflow-hidden shadow-xl relative">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input 
              type="text" 
              placeholder="Search users by name or email..." 
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/20 text-white/40">
              <tr>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">User</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                        {u.first_name?.[0] || u.email[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-white/90">{u.first_name || u.username} {u.last_name}</div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <div className="text-white/40 text-xs">Email: {u.email}</div>
                          {u.username !== u.email && (
                            <div className="text-white/30 text-[10px]">Username: {u.username}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-white/60 capitalize text-xs">
                      {u.is_superuser ? <ShieldAlert className="w-3.5 h-3.5 text-purple-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-white/40" />}
                      <span className={u.is_superuser ? "text-purple-400 font-medium" : ""}>
                        {u.is_superuser ? "Superadmin" : u.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white/80 font-medium">{u.company_name || <span className="text-white/30 italic">Unassigned</span>}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      u.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleActiveToggle(u.id, !u.is_active)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${
                        u.is_active 
                          ? 'text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20' 
                          : 'text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20'
                      }`}
                    >
                      {u.is_active ? 'Revoke Access' : 'Restore Access'}
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

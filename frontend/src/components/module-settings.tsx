"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Target, Users, DollarSign, FolderOpen, Clock, 
  Ticket as TicketIcon, Calendar, Bell, Loader2, CheckCircle, XCircle, Shield, Blocks
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ModuleSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [modules, setModules] = useState({
    crm: company?.module_crm_enabled ?? true,
    hr: company?.module_hr_enabled ?? true,
    finance: company?.module_finance_enabled ?? true,
    projects: company?.module_projects_enabled ?? true,
    attendance: company?.module_attendance_enabled ?? true,
    tickets: company?.module_tickets_enabled ?? true,
    events: company?.module_events_enabled ?? true,
    notice_board: company?.module_notice_board_enabled ?? true,
  });

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Module settings saved. Changes take effect on next page load." });
      setTimeout(() => setMsg(null), 5000);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to save module settings. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading modules...</div>
    </div>
  );

  type ModuleKey = keyof typeof modules;

  const moduleList: {
    key: ModuleKey;
    label: string;
    desc: string;
    icon: React.ReactNode;
    gradient: string;
    critical?: boolean;
  }[] = [
    {
      key: "crm",
      label: "CRM & Sales",
      desc: "Leads, clients, pipelines, proposals and sales reporting.",
      icon: <Target className="w-5 h-5 text-blue-600" />,
      gradient: "from-blue-400 to-indigo-500",
      critical: true,
    },
    {
      key: "hr",
      label: "HR & Staff",
      desc: "Employee profiles, departments, and HR management tools.",
      icon: <Users className="w-5 h-5 text-violet-600" />,
      gradient: "from-violet-400 to-purple-600",
    },
    {
      key: "finance",
      label: "Finance",
      desc: "Invoices, expenses, payments, and financial reporting.",
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      gradient: "from-emerald-400 to-teal-500",
    },
    {
      key: "projects",
      label: "Projects & Work",
      desc: "Project management, task boards, milestones and time tracking.",
      icon: <FolderOpen className="w-5 h-5 text-amber-600" />,
      gradient: "from-amber-400 to-orange-500",
    },
    {
      key: "attendance",
      label: "Attendance",
      desc: "Clock-in/out, leaves, timesheets and attendance reports.",
      icon: <Clock className="w-5 h-5 text-sky-600" />,
      gradient: "from-sky-400 to-blue-500",
    },
    {
      key: "tickets",
      label: "Tickets & Support",
      desc: "Customer support tickets, priorities, and SLA management.",
      icon: <TicketIcon className="w-5 h-5 text-rose-600" />,
      gradient: "from-rose-400 to-pink-500",
    },
    {
      key: "events",
      label: "Events",
      desc: "Company events, meetings, and calendar integrations.",
      icon: <Calendar className="w-5 h-5 text-indigo-600" />,
      gradient: "from-indigo-400 to-violet-500",
    },
    {
      key: "notice_board",
      label: "Notice Board",
      desc: "Announcements, company news and internal communications.",
      icon: <Bell className="w-5 h-5 text-orange-500" />,
      gradient: "from-orange-400 to-amber-500",
    },
  ];

  const enabledCount = Object.values(modules).filter(Boolean).length;
  
  const toggle = (key: ModuleKey) => {
    if (!isAdmin) return;
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner shrink-0">
            <Blocks className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1">Module Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Enable or disable workspace modules to tailor the CRM to your team's specific needs.
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => mutation.mutate({
              module_crm_enabled: modules.crm,
              module_hr_enabled: modules.hr,
              module_finance_enabled: modules.finance,
              module_projects_enabled: modules.projects,
              module_attendance_enabled: modules.attendance,
              module_tickets_enabled: modules.tickets,
              module_events_enabled: modules.events,
              module_notice_board_enabled: modules.notice_board,
            })}
            disabled={mutation.isPending}
            className="btn bg-ink hover:bg-ink-2 text-white shadow-md hover:shadow-lg transition-all h-11 px-6 rounded-xl font-medium flex items-center gap-2 shrink-0 group relative overflow-hidden bg-ink hover:bg-black text-white"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-start">
          <Shield className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">Read-only mode</div>
            Only Workspace Owners and Admins can toggle application modules.
          </div>
        </div>
      )}

      {msg && (
        <div className={`flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise ${
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        }`}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Module grid */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-600 via-slate-400 to-zinc-400" />

            <div className="p-6 sm:p-8 pt-9 space-y-4">
              <label className="block text-[13.5px] font-semibold text-ink uppercase tracking-widest mb-5">Available Modules</label>

              <div className="grid grid-cols-1 gap-3">
                {moduleList.map(mod => (
                  <div
                    key={mod.key}
                    onClick={() => toggle(mod.key)}
                    className={`group flex items-center gap-5 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                      modules[mod.key]
                        ? "border-line bg-paper hover:border-slate-300 hover:shadow-md"
                        : "border-dashed border-line bg-bone/30 opacity-60 hover:opacity-80"
                    } ${!isAdmin ? "cursor-default" : ""}`}
                  >
                    {/* Icon tile */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                      modules[mod.key]
                        ? `bg-gradient-to-br ${mod.gradient} border-transparent shadow-md transform group-hover:scale-105`
                        : "bg-bone-2 border-line grayscale"
                    }`}>
                      <div className={modules[mod.key] ? "[&>svg]:text-white [&>svg]:w-6 [&>svg]:h-6" : "[&>svg]:text-muted"}>
                        {mod.icon}
                      </div>
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-ink">{mod.label}</span>
                        {mod.critical && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60 uppercase tracking-wider">Core</span>
                        )}
                      </div>
                      <p className="text-[13px] text-muted leading-relaxed truncate">{mod.desc}</p>
                    </div>

                    {/* Status badge + toggle */}
                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`hidden sm:inline text-[11.5px] font-bold px-2.5 py-1 rounded-md border ${
                        modules[mod.key]
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-bone-2 text-muted border-line"
                      }`}>
                        {modules[mod.key] ? "ENABLED" : "DISABLED"}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={modules[mod.key]}
                          disabled={!isAdmin || mutation.isPending}
                          onChange={() => toggle(mod.key)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-bone-2 border border-line rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner peer-checked:bg-emerald-500 peer-checked:border-emerald-500"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar summary */}
        <div className="space-y-6">
          {/* Active count card */}
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden group/card hover:shadow-md transition-shadow">
            <div className="px-5 py-4 border-b border-line bg-bone/40 flex items-center gap-2">
              <Blocks className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] font-semibold text-ink uppercase tracking-widest">Module Status</span>
            </div>
            <div className="p-5 space-y-3.5">
              {moduleList.map(mod => (
                <div key={mod.key} className="flex items-center justify-between group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: `${moduleList.indexOf(mod) * 30}ms` }}>
                  <span className={`text-[13.5px] ${modules[mod.key] ? "text-ink font-medium" : "text-muted"}`}>{mod.label}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                    modules[mod.key]
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200/50"
                      : "bg-bone-2 text-muted border border-line"
                  }`}>
                    {modules[mod.key] ? "ON" : "OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Info card */}
          <div className="bg-slate-800 text-white rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-md">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-700 rounded-full opacity-50 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2.5 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shadow-inner">
                <Blocks className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[14px] font-bold">{enabledCount} / {moduleList.length} Active</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-1.5 relative z-10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-1000 ease-out"
                style={{ width: `${(enabledCount / moduleList.length) * 100}%` }}
              />
            </div>
            <p className="text-[12.5px] text-slate-300 pt-2 leading-relaxed relative z-10">
              Disabled modules will automatically hide their respective pages and sidebar links for all users in the workspace.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

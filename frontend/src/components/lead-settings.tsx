"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, Loader2, CheckCircle, XCircle, Shield, 
  Hash, ArrowRightCircle, Plus, Trash2, Edit2, 
  Layers, Tags, RefreshCw, UserCheck, Check, Settings2
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany, fetchTeam } from "@/lib/api";
import { cn } from "@/lib/utils";

type TabId = "general" | "sources" | "pipelines" | "agents" | "categories" | "round_robin";

export function LeadSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // General tab local states
  const [leadPrefix, setLeadPrefix] = useState(company?.lead_prefix ?? "LD-");
  const [defaultLeadStatus, setDefaultLeadStatus] = useState(company?.default_lead_status ?? "new");
  const [leadAssignmentRoundRobin, setLeadAssignmentRoundRobin] = useState(company?.lead_assignment_round_robin ?? false);

  // Edit/Add modal or inline states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#3B82F6");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");

  // Fetch company users/team
  const { data: teamData, isLoading: isTeamLoading } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    enabled: activeTab === "agents" || activeTab === "round_robin"
  });

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin";

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Settings updated successfully." });
      setTimeout(() => setMsg(null), 4000);
      setIsAdding(false);
      setNewName("");
      setEditingId(null);
      setEditName("");
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update settings. Please try again." });
    },
  });

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const saveSettings = (fields: any) => {
    mutation.mutate(fields);
  };

  // Safe accessors for array settings
  const leadSources = company.lead_sources || [];
  const leadPipelines = company.lead_pipelines || [];
  const dealAgents = company.deal_agents || [];
  const dealCategories = company.deal_categories || [];
  const leadRoundRobinAgents = company.lead_round_robin_agents || [];

  // Sources Actions
  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const updatedSources = [
      ...leadSources,
      { id: String(Date.now()), name: newName.trim() }
    ];
    saveSettings({ lead_sources: updatedSources });
  };

  const handleEditSource = (id: string, name: string) => {
    if (!name.trim()) return;
    const updatedSources = leadSources.map(s => 
      s.id === id ? { ...s, name: name.trim() } : s
    );
    saveSettings({ lead_sources: updatedSources });
  };

  const handleDeleteSource = (id: string) => {
    const updatedSources = leadSources.filter(s => s.id !== id);
    saveSettings({ lead_sources: updatedSources });
  };

  // Pipelines Actions
  const handleAddPipeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const updatedPipelines = [
      ...leadPipelines,
      { id: String(Date.now()), name: newName.trim(), color: newColor }
    ];
    saveSettings({ lead_pipelines: updatedPipelines });
  };

  const handleEditPipeline = (id: string, name: string, color: string) => {
    if (!name.trim()) return;
    const updatedPipelines = leadPipelines.map(p => 
      p.id === id ? { ...p, name: name.trim(), color } : p
    );
    saveSettings({ lead_pipelines: updatedPipelines });
  };

  const handleDeletePipeline = (id: string) => {
    const updatedPipelines = leadPipelines.filter(p => p.id !== id);
    saveSettings({ lead_pipelines: updatedPipelines });
  };

  // Categories Actions
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const updatedCategories = [
      ...dealCategories,
      { id: String(Date.now()), name: newName.trim() }
    ];
    saveSettings({ deal_categories: updatedCategories });
  };

  const handleEditCategory = (id: string, name: string) => {
    if (!name.trim()) return;
    const updatedCategories = dealCategories.map(c => 
      c.id === id ? { ...c, name: name.trim() } : c
    );
    saveSettings({ deal_categories: updatedCategories });
  };

  const handleDeleteCategory = (id: string) => {
    const updatedCategories = dealCategories.filter(c => c.id !== id);
    saveSettings({ deal_categories: updatedCategories });
  };

  // Deal Agents Toggles
  const handleToggleDealAgent = (userId: string) => {
    const isAgent = dealAgents.includes(userId);
    const updatedAgents = isAgent 
      ? dealAgents.filter(id => id !== userId) 
      : [...dealAgents, userId];
    saveSettings({ deal_agents: updatedAgents });
  };

  // Round Robin Toggles
  const handleToggleRoundRobinAgent = (userId: string) => {
    const isRR = leadRoundRobinAgents.includes(userId);
    const updatedRR = isRR 
      ? leadRoundRobinAgents.filter(id => id !== userId) 
      : [...leadRoundRobinAgents, userId];
    saveSettings({ lead_round_robin_agents: updatedRR });
  };

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "general", label: "General Settings", icon: Settings2 },
    { id: "sources", label: "Lead Sources", icon: Tags },
    { id: "pipelines", label: "Pipelines & Stages", icon: Layers },
    { id: "agents", label: "Deal Agents", icon: Users },
    { id: "categories", label: "Deal Categories", icon: Hash },
    { id: "round_robin", label: "Round Robin", icon: RefreshCw },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner shrink-0">
            <Users className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink tracking-tight mb-1 font-serif">Lead Settings</h3>
            <p className="text-[14px] text-muted max-w-lg leading-relaxed">
              Configure how your sales pipeline, sources, agents, categories, and round-robin structures run.
            </p>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200/60 rounded-xl p-4 text-[13.5px] flex gap-3 shadow-sm items-center">
          <Shield className="w-5 h-5 shrink-0 text-amber-600" />
          <span className="font-medium">Read-only access: Only Owners and Admins can modify lead settings.</span>
        </div>
      )}

      {msg && (
        <div className={cn(
          "flex items-center gap-3 text-[13.5px] font-medium rounded-xl px-5 py-4 shadow-sm animate-rise",
          msg.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60" 
            : "bg-rose-50 text-rose-800 border border-rose-200/60"
        )}>
          {msg.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
          {msg.text}
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-1.5 border-b border-line pb-px">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsAdding(false);
                setEditingId(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-[13.5px] font-medium transition-all border-b-2 -mb-px",
                isActive 
                  ? "border-accent text-accent bg-accent/5 font-semibold" 
                  : "border-transparent text-muted hover:text-ink hover:bg-bone/40"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main card */}
      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden flex flex-col relative min-h-[400px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"></div>
        
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          
          {/* ───────────────── GENERAL SETTINGS ───────────────── */}
          {activeTab === "general" && (
            <div className="space-y-8 animate-fade-in">
              <div className="max-w-2xl space-y-6">
                
                {/* Round Robin Assignment Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-indigo-100 bg-indigo-50/40 rounded-xl hover:border-indigo-200 transition-all gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-paper border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                      <RefreshCw className="w-5 h-5 text-indigo-500" strokeWidth={2} />
                    </div>
                    <div className="pr-4">
                      <div className="text-[15px] font-semibold text-ink mb-0.5">Round-Robin Lead Assignment</div>
                      <div className="text-[13px] text-muted leading-snug">Automatically distribute incoming leads equally among your active sales agents.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 sm:self-center self-end">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={leadAssignmentRoundRobin}
                        disabled={!isAdmin || mutation.isPending}
                        onChange={(e) => {
                          setLeadAssignmentRoundRobin(e.target.checked);
                          saveSettings({ lead_assignment_round_robin: e.target.checked });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500 peer-checked:border-indigo-500 shadow-inner"></div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lead Prefix */}
                  <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted" /> Lead ID Prefix
                    </label>
                    <input
                      type="text"
                      value={leadPrefix}
                      onChange={(e) => setLeadPrefix(e.target.value)}
                      onBlur={() => saveSettings({ lead_prefix: leadPrefix })}
                      disabled={!isAdmin || mutation.isPending}
                      className="input w-full h-11 bg-bone/30 focus:bg-paper font-mono text-sm"
                      placeholder="LD-"
                    />
                    <p className="text-xs text-muted/80">Prepended identifier for lead records (e.g. LD-0023)</p>
                  </div>
                  
                  {/* Default Status */}
                  <div className="space-y-1.5">
                    <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                      <ArrowRightCircle className="w-4 h-4 text-muted" /> Default Lead Status
                    </label>
                    <div className="relative">
                      <select
                        value={defaultLeadStatus}
                        onChange={(e) => {
                          setDefaultLeadStatus(e.target.value);
                          saveSettings({ default_lead_status: e.target.value });
                        }}
                        disabled={!isAdmin || mutation.isPending}
                        className={cn(
                          "select w-full h-11 appearance-none bg-bone/30 focus:bg-paper cursor-pointer pr-10 capitalize",
                          !isAdmin && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {/* We populate this from custom lead pipelines stages list! */}
                        {leadPipelines.map((pipeline: any) => (
                          <option key={pipeline.name} value={pipeline.name.toLowerCase()}>
                            {pipeline.name}
                          </option>
                        ))}
                        {leadPipelines.length === 0 && (
                          <>
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                          </>
                        )}
                      </select>
                    </div>
                    <p className="text-xs text-muted/80">Initial stage applied to newly captured prospects</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ───────────────── LEAD SOURCES ───────────────── */}
          {activeTab === "sources" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[16px] font-semibold text-ink">Lead Channels & Sources</h4>
                  <p className="text-xs text-muted">Identify where your leads originate (e.g., website, advertising campaigns).</p>
                </div>
                {isAdmin && !isAdding && (
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setNewName("");
                    }}
                    className="btn bg-ink text-white hover:bg-ink-2 px-4 h-9 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Source
                  </button>
                )}
              </div>

              {isAdding && (
                <form onSubmit={handleAddSource} className="bg-bone/40 p-4 border border-line rounded-xl flex gap-3 items-end max-w-lg animate-rise">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Source Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. LinkedIn Campaign"
                      className="input w-full bg-paper h-9 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={mutation.isPending} className="btn btn-primary h-9 px-4 text-xs font-semibold">
                      Save
                    </button>
                    <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary h-9 px-3 text-xs font-semibold">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {leadSources.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-line rounded-xl">
                  <p className="text-sm text-muted">No custom lead sources configured.</p>
                </div>
              ) : (
                <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bone/40 border-b border-line text-xs font-bold text-ink uppercase tracking-wider">
                        <th className="px-5 py-3 w-16">#</th>
                        <th className="px-5 py-3">Source Name</th>
                        {isAdmin && <th className="px-5 py-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-[13.5px]">
                      {leadSources.map((source: any, idx: number) => {
                        const isEditing = editingId === source.id;
                        return (
                          <tr key={source.id} className="hover:bg-bone/10 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-muted text-xs">{idx + 1}</td>
                            <td className="px-5 py-3.5 font-medium text-ink">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="input h-8 max-w-xs text-sm"
                                  autoFocus
                                />
                              ) : (
                                source.name
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleEditSource(source.id, editName)}
                                        className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 grid place-items-center hover:bg-emerald-100 transition-colors"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="w-8 h-8 rounded-lg border border-line bg-paper text-muted grid place-items-center hover:bg-bone transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingId(source.id);
                                          setEditName(source.name);
                                        }}
                                        className="w-8 h-8 rounded-lg border border-line bg-paper text-muted hover:text-ink grid place-items-center hover:bg-bone transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSource(source.id)}
                                        className="w-8 h-8 rounded-lg border border-transparent text-muted hover:text-rose-600 hover:bg-rose-50 grid place-items-center transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ───────────────── PIPELINE STAGES ───────────────── */}
          {activeTab === "pipelines" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[16px] font-semibold text-ink">Leads and Deals Pipeline Stages</h4>
                  <p className="text-xs text-muted">Customize the milestones of your sales cycles. Assign distinct colors for easy visual tracking.</p>
                </div>
                {isAdmin && !isAdding && (
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setNewName("");
                      setNewColor("#3B82F6");
                    }}
                    className="btn bg-ink text-white hover:bg-ink-2 px-4 h-9 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stage
                  </button>
                )}
              </div>

              {isAdding && (
                <form onSubmit={handleAddPipeline} className="bg-bone/40 p-4 border border-line rounded-xl flex flex-wrap gap-4 items-end max-w-2xl animate-rise">
                  <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Stage Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Negotiation Started"
                      className="input w-full bg-paper h-9 text-sm"
                    />
                  </div>
                  <div className="w-24 space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="w-8 h-8 rounded border border-line cursor-pointer bg-paper"
                      />
                      <span className="text-xs font-mono uppercase text-muted">{newColor}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={mutation.isPending} className="btn btn-primary h-9 px-4 text-xs font-semibold">
                      Save
                    </button>
                    <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary h-9 px-3 text-xs font-semibold">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {leadPipelines.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-line rounded-xl">
                  <p className="text-sm text-muted">No custom stages defined. Default stages will be used.</p>
                </div>
              ) : (
                <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bone/40 border-b border-line text-xs font-bold text-ink uppercase tracking-wider">
                        <th className="px-5 py-3 w-16">#</th>
                        <th className="px-5 py-3">Stage Label</th>
                        <th className="px-5 py-3">Color Identifier</th>
                        {isAdmin && <th className="px-5 py-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-[13.5px]">
                      {leadPipelines.map((pipeline: any, idx: number) => {
                        const isEditing = editingId === pipeline.id;
                        return (
                          <tr key={pipeline.id} className="hover:bg-bone/10 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-muted text-xs">{idx + 1}</td>
                            <td className="px-5 py-3.5 font-medium text-ink">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="input h-8 max-w-xs text-sm"
                                  autoFocus
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pipeline.color || "#6B7280" }} />
                                  {pipeline.name}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={editColor}
                                    onChange={(e) => setEditColor(e.target.value)}
                                    className="w-6 h-6 rounded cursor-pointer border border-line bg-paper"
                                  />
                                  <span className="text-xs font-mono uppercase text-muted">{editColor}</span>
                                </div>
                              ) : (
                                <span className="font-mono text-xs uppercase text-muted">{pipeline.color || "#6B7280"}</span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleEditPipeline(pipeline.id, editName, editColor)}
                                        className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 grid place-items-center hover:bg-emerald-100 transition-colors"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="w-8 h-8 rounded-lg border border-line bg-paper text-muted grid place-items-center hover:bg-bone transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingId(pipeline.id);
                                          setEditName(pipeline.name);
                                          setEditColor(pipeline.color || "#3B82F6");
                                        }}
                                        className="w-8 h-8 rounded-lg border border-line bg-paper text-muted hover:text-ink grid place-items-center hover:bg-bone transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeletePipeline(pipeline.id)}
                                        className="w-8 h-8 rounded-lg border border-transparent text-muted hover:text-rose-600 hover:bg-rose-50 grid place-items-center transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ───────────────── DEAL AGENTS ───────────────── */}
          {activeTab === "agents" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h4 className="text-[16px] font-semibold text-ink font-serif">Deal Agents Directory</h4>
                <p className="text-xs text-muted">Designate which workspace team members are active Deal Agents authorized to lead sales and negotiate deals.</p>
              </div>

              {isTeamLoading ? (
                <div className="flex justify-center items-center py-12 text-muted gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading company team list...</span>
                </div>
              ) : !teamData?.users || teamData.users.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-line rounded-xl">
                  <p className="text-sm text-muted">No employees found to list.</p>
                </div>
              ) : (
                <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bone/40 border-b border-line text-xs font-bold text-ink uppercase tracking-wider">
                        <th className="px-5 py-3">Member</th>
                        <th className="px-5 py-3">Email Address</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3 text-right">Deal Agent Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-[13.5px]">
                      {teamData.users.map((user: any) => {
                        const isAgent = dealAgents.includes(String(user.id));
                        return (
                          <tr key={user.id} className="hover:bg-bone/10 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
                                  {(user.first_name?.[0] || user.username?.[0] || "?").toUpperCase()}
                                </div>
                                <span className="font-semibold text-ink">{user.first_name} {user.last_name || ""}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-muted">{user.email || user.username}</td>
                            <td className="px-5 py-3.5 capitalize text-xs font-semibold text-muted">
                              {company.roles?.find((r: any) => r.id === user.role)?.name || user.role}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isAgent}
                                  disabled={!isAdmin || mutation.isPending}
                                  onChange={() => handleToggleDealAgent(String(user.id))}
                                  className="sr-only peer"
                                />
                                <div className="w-10 h-5.5 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 shadow-inner"></div>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ───────────────── DEAL CATEGORIES ───────────────── */}
          {activeTab === "categories" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[16px] font-semibold text-ink font-serif">Deal Classifications</h4>
                  <p className="text-xs text-muted">Define categories to classify opportunities (e.g. Corporate, Government, SaaS Subscription).</p>
                </div>
                {isAdmin && !isAdding && (
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setNewName("");
                    }}
                    className="btn bg-ink text-white hover:bg-ink-2 px-4 h-9 rounded-lg flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Category
                  </button>
                )}
              </div>

              {isAdding && (
                <form onSubmit={handleAddCategory} className="bg-bone/40 p-4 border border-line rounded-xl flex gap-3 items-end max-w-lg animate-rise">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-semibold text-ink">Category Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Enterprise Business"
                      className="input w-full bg-paper h-9 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={mutation.isPending} className="btn btn-primary h-9 px-4 text-xs font-semibold">
                      Save
                    </button>
                    <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary h-9 px-3 text-xs font-semibold">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {dealCategories.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-line rounded-xl">
                  <p className="text-sm text-muted">No custom deal categories configured.</p>
                </div>
              ) : (
                <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bone/40 border-b border-line text-xs font-bold text-ink uppercase tracking-wider">
                        <th className="px-5 py-3 w-16">#</th>
                        <th className="px-5 py-3">Category Name</th>
                        {isAdmin && <th className="px-5 py-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-[13.5px]">
                      {dealCategories.map((category: any, idx: number) => {
                        const isEditing = editingId === category.id;
                        return (
                          <tr key={category.id} className="hover:bg-bone/10 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-muted text-xs">{idx + 1}</td>
                            <td className="px-5 py-3.5 font-medium text-ink">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="input h-8 max-w-xs text-sm"
                                  autoFocus
                                />
                              ) : (
                                category.name
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex justify-end gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => handleEditCategory(category.id, editName)}
                                        className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 grid place-items-center hover:bg-emerald-100 transition-colors"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        className="w-8 h-8 rounded-lg border border-line bg-paper text-muted grid place-items-center hover:bg-bone transition-colors"
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingId(category.id);
                                          setEditName(category.name);
                                        }}
                                        className="w-8 h-8 rounded-lg border border-line bg-paper text-muted hover:text-ink grid place-items-center hover:bg-bone transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        className="w-8 h-8 rounded-lg border border-transparent text-muted hover:text-rose-600 hover:bg-rose-50 grid place-items-center transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ───────────────── ROUND ROBIN ASSIGNMENT ───────────────── */}
          {activeTab === "round_robin" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h4 className="text-[16px] font-semibold text-ink font-serif">Round-Robin Participant Roster</h4>
                <p className="text-xs text-muted">Select which sales team members are included in the automatic circular distribution (Round-Robin) of new leads.</p>
              </div>

              {isTeamLoading ? (
                <div className="flex justify-center items-center py-12 text-muted gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading company team list...</span>
                </div>
              ) : !teamData?.users || teamData.users.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-line rounded-xl">
                  <p className="text-sm text-muted">No employees found to list.</p>
                </div>
              ) : (
                <div className="border border-line rounded-xl overflow-hidden bg-paper shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bone/40 border-b border-line text-xs font-bold text-ink uppercase tracking-wider">
                        <th className="px-5 py-3">Member</th>
                        <th className="px-5 py-3">Email Address</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3 text-right">Round Robin Participant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-[13.5px]">
                      {teamData.users.map((user: any) => {
                        const isRR = leadRoundRobinAgents.includes(String(user.id));
                        return (
                          <tr key={user.id} className="hover:bg-bone/10 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700 text-xs font-semibold">
                                  {(user.first_name?.[0] || user.username?.[0] || "?").toUpperCase()}
                                </div>
                                <span className="font-semibold text-ink">{user.first_name} {user.last_name || ""}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-muted">{user.email || user.username}</td>
                            <td className="px-5 py-3.5 capitalize text-xs font-semibold text-muted">
                              {company.roles?.find((r: any) => r.id === user.role)?.name || user.role}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isRR}
                                  disabled={!isAdmin || mutation.isPending}
                                  onChange={() => handleToggleRoundRobinAgent(String(user.id))}
                                  className="sr-only peer"
                                />
                                <div className="w-10 h-5.5 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-violet-500 peer-checked:border-violet-500 shadow-inner"></div>
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
        
        <div className="bg-bone/40 px-8 py-4 border-t border-line mt-auto flex items-center justify-between">
          <div className="text-[12.5px] text-muted flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            System settings are shared across all authorized workspace team members.
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, Plus, Edit, Trash2, X, User, Users, Tag, Headphones, FileText, Check
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

type TicketAgent = {
  id: string;
  name: string;
  group: string;
  status: string;
};

type TicketGroup = {
  id: string;
  name: string;
};

type TicketType = {
  id: string;
  name: string;
};

type TicketChannel = {
  id: string;
  name: string;
};

type TicketReplyTemplate = {
  id: string;
  name: string;
  body: string;
};

export function TicketSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const agents: TicketAgent[] = company?.ticket_agents ?? [];
  const groups: TicketGroup[] = company?.ticket_groups ?? [];
  const types: TicketType[] = company?.ticket_types ?? [];
  const channels: TicketChannel[] = company?.ticket_channels ?? [];
  const templates: TicketReplyTemplate[] = company?.ticket_reply_templates ?? [];

  const [activeTab, setActiveTab] = useState("roundrobin");

  // Modals State
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Form State
  const [agentName, setAgentName] = useState("");
  const [agentGroup, setAgentGroup] = useState("");
  const [agentStatus, setAgentStatus] = useState("Active");
  const [groupName, setGroupName] = useState("");
  const [typeName, setTypeName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setIsAgentModalOpen(false);
      setIsGroupModalOpen(false);
      setIsTypeModalOpen(false);
      setIsChannelModalOpen(false);
      setIsTemplateModalOpen(false);
    },
  });

  // Handlers for Agents
  const handleOpenAddAgent = () => {
    setEditingIndex(null);
    setAgentName("");
    setAgentGroup("");
    setAgentStatus("Active");
    setIsAgentModalOpen(true);
  };
  const handleOpenEditAgent = (index: number) => {
    setEditingIndex(index);
    setAgentName(agents[index].name);
    setAgentGroup(agents[index].group);
    setAgentStatus(agents[index].status);
    setIsAgentModalOpen(true);
  };
  const handleDeleteAgent = (index: number) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this agent?")) {
      const newAgents = [...agents];
      newAgents.splice(index, 1);
      mutation.mutate({ ticket_agents: newAgents });
    }
  };
  const handleSaveAgentModal = () => {
    if (!agentName) return;
    const newAgents = [...agents];
    if (editingIndex !== null) {
      newAgents[editingIndex] = { ...newAgents[editingIndex], name: agentName, group: agentGroup, status: agentStatus };
    } else {
      newAgents.push({ id: Date.now().toString(), name: agentName, group: agentGroup, status: agentStatus });
    }
    mutation.mutate({ ticket_agents: newAgents });
  };

  // Handlers for Groups
  const handleOpenAddGroup = () => {
    setEditingIndex(null);
    setGroupName("");
    setIsGroupModalOpen(true);
  };
  const handleOpenEditGroup = (index: number) => {
    setEditingIndex(index);
    setGroupName(groups[index].name);
    setIsGroupModalOpen(true);
  };
  const handleDeleteGroup = (index: number) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this group?")) {
      const newGroups = [...groups];
      newGroups.splice(index, 1);
      mutation.mutate({ ticket_groups: newGroups });
    }
  };
  const handleSaveGroupModal = () => {
    if (!groupName) return;
    const newGroups = [...groups];
    if (editingIndex !== null) {
      newGroups[editingIndex] = { ...newGroups[editingIndex], name: groupName };
    } else {
      newGroups.push({ id: Date.now().toString(), name: groupName });
    }
    mutation.mutate({ ticket_groups: newGroups });
  };

  // Handlers for Types
  const handleOpenAddType = () => {
    setEditingIndex(null);
    setTypeName("");
    setIsTypeModalOpen(true);
  };
  const handleOpenEditType = (index: number) => {
    setEditingIndex(index);
    setTypeName(types[index].name);
    setIsTypeModalOpen(true);
  };
  const handleDeleteType = (index: number) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this ticket type?")) {
      const newTypes = [...types];
      newTypes.splice(index, 1);
      mutation.mutate({ ticket_types: newTypes });
    }
  };
  const handleSaveTypeModal = () => {
    if (!typeName) return;
    const newTypes = [...types];
    if (editingIndex !== null) {
      newTypes[editingIndex] = { ...newTypes[editingIndex], name: typeName };
    } else {
      newTypes.push({ id: Date.now().toString(), name: typeName });
    }
    mutation.mutate({ ticket_types: newTypes });
  };

  // Handlers for Channels
  const handleOpenAddChannel = () => {
    setEditingIndex(null);
    setChannelName("");
    setIsChannelModalOpen(true);
  };
  const handleOpenEditChannel = (index: number) => {
    setEditingIndex(index);
    setChannelName(channels[index].name);
    setIsChannelModalOpen(true);
  };
  const handleDeleteChannel = (index: number) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this ticket channel?")) {
      const newChannels = [...channels];
      newChannels.splice(index, 1);
      mutation.mutate({ ticket_channels: newChannels });
    }
  };
  const handleSaveChannelModal = () => {
    if (!channelName) return;
    const newChannels = [...channels];
    if (editingIndex !== null) {
      newChannels[editingIndex] = { ...newChannels[editingIndex], name: channelName };
    } else {
      newChannels.push({ id: Date.now().toString(), name: channelName });
    }
    mutation.mutate({ ticket_channels: newChannels });
  };

  // Handlers for Templates
  const handleOpenAddTemplate = () => {
    setEditingIndex(null);
    setTemplateName("");
    setTemplateBody("");
    setIsTemplateModalOpen(true);
  };
  const handleOpenEditTemplate = (index: number) => {
    setEditingIndex(index);
    setTemplateName(templates[index].name);
    setTemplateBody(templates[index].body);
    setIsTemplateModalOpen(true);
  };
  const handleDeleteTemplate = (index: number) => {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to remove this reply template?")) {
      const newTemplates = [...templates];
      newTemplates.splice(index, 1);
      mutation.mutate({ ticket_reply_templates: newTemplates });
    }
  };
  const handleSaveTemplateModal = () => {
    if (!templateName || !templateBody) return;
    const newTemplates = [...templates];
    if (editingIndex !== null) {
      newTemplates[editingIndex] = { ...newTemplates[editingIndex], name: templateName, body: templateBody };
    } else {
      newTemplates.push({ id: Date.now().toString(), name: templateName, body: templateBody });
    }
    mutation.mutate({ ticket_reply_templates: newTemplates });
  };

  const handleToggleRoundRobin = (checked: boolean) => {
    if (!isAdmin) return;
    mutation.mutate({ ticket_round_robin: checked });
  };

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const tabs = [
    { id: "agents", label: "Ticket Agents" },
    { id: "groups", label: "Ticket Groups" },
    { id: "types", label: "Ticket Types" },
    { id: "channels", label: "Ticket Channel" },
    { id: "templates", label: "Reply Templates" },
    { id: "roundrobin", label: "Round Robin" }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* Top Action Button Placeholder Container to keep layout steady */}
      <div className="flex mb-2 h-9">
        {isAdmin && activeTab === "agents" && (
          <button onClick={handleOpenAddAgent} className="btn bg-ink hover:bg-ink-2 text-white shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add New Agents
          </button>
        )}
        {isAdmin && activeTab === "groups" && (
          <button onClick={handleOpenAddGroup} className="btn bg-ink hover:bg-ink-2 text-white shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add New Group
          </button>
        )}
        {isAdmin && activeTab === "types" && (
          <button onClick={handleOpenAddType} className="btn bg-ink hover:bg-ink-2 text-white shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add New Ticket Type
          </button>
        )}
        {isAdmin && activeTab === "channels" && (
          <button onClick={handleOpenAddChannel} className="btn bg-ink hover:bg-ink-2 text-white shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add New Ticket Channel
          </button>
        )}
        {isAdmin && activeTab === "templates" && (
          <button onClick={handleOpenAddTemplate} className="btn bg-ink hover:bg-ink-2 text-white shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add Reply Template
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-line shadow-sm overflow-hidden flex flex-col relative">
        
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-line px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-4 text-[13.5px] font-medium transition-colors whitespace-nowrap border-b-2",
                activeTab === tab.id 
                  ? "border-rose-500 text-rose-600" 
                  : "border-transparent text-muted hover:text-ink"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-0">
          
          <div className="px-6 py-4 border-b border-line/40">
             <h4 className="text-[13.5px] font-medium text-ink">Ticket Visibility Setting</h4>
          </div>

          {activeTab === "agents" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[250px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-3.5 px-6 w-16 text-center">#</th>
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6">Group</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6 text-right w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {agents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <User className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No agent added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      agents.map((agent, index) => (
                        <tr key={agent.id} className="hover:bg-bone/30 transition-colors">
                          <td className="py-4 px-6 text-ink text-center">{index + 1}</td>
                          <td className="py-4 px-6 text-ink font-medium">{agent.name}</td>
                          <td className="py-4 px-6 text-ink">{agent.group || "-"}</td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              agent.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {agent.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAgent(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAgent(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "groups" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[250px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-3.5 px-6 w-16 text-center">#</th>
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6 text-right w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {groups.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Users className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No group added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      groups.map((group, index) => (
                        <tr key={group.id} className="hover:bg-bone/30 transition-colors">
                          <td className="py-4 px-6 text-ink text-center">{index + 1}</td>
                          <td className="py-4 px-6 text-ink font-medium">{group.name}</td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGroup(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGroup(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "types" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[250px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-3.5 px-6 w-16 text-center">#</th>
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6 text-right w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {types.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Tag className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No ticket type added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      types.map((type, index) => (
                        <tr key={type.id} className="hover:bg-bone/30 transition-colors">
                          <td className="py-4 px-6 text-ink text-center">{index + 1}</td>
                          <td className="py-4 px-6 text-ink font-medium">{type.name}</td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditType(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteType(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "channels" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[250px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-3.5 px-6 w-16 text-center">#</th>
                      <th className="py-3.5 px-6">Name</th>
                      <th className="py-3.5 px-6 text-right w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {channels.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Headphones className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No ticket channel added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      channels.map((channel, index) => (
                        <tr key={channel.id} className="hover:bg-bone/30 transition-colors">
                          <td className="py-4 px-6 text-ink text-center">{index + 1}</td>
                          <td className="py-4 px-6 text-ink font-medium">{channel.name}</td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditChannel(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChannel(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[250px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-3.5 px-6 w-16 text-center">#</th>
                      <th className="py-3.5 px-6">Template Name</th>
                      <th className="py-3.5 px-6 text-right w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {templates.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <FileText className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No reply template added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      templates.map((template, index) => (
                        <tr key={template.id} className="hover:bg-bone/30 transition-colors">
                          <td className="py-4 px-6 text-ink text-center">{index + 1}</td>
                          <td className="py-4 px-6 text-ink font-medium">{template.name}</td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTemplate(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTemplate(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-white hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "roundrobin" && (
            <div className="flex flex-col p-8 space-y-6 animate-fade-in">
              <div className="flex flex-col gap-2 border-b border-line pb-6">
                <div className="flex items-center justify-between max-w-2xl">
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">Round Robin</h3>
                    <p className="text-[13.5px] text-muted">Automatically assign incoming tickets to active agents sequentially.</p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={company?.ticket_round_robin ?? false}
                      disabled={!isAdmin || mutation.isPending}
                      onChange={(e) => handleToggleRoundRobin(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 shadow-inner"></div>
                  </label>
                </div>
              </div>

              <div className="bg-[#fffdf2] border border-[#f5eebd] rounded-lg p-6 max-w-4xl text-[#756a33]">
                <h4 className="font-bold mb-6 text-[14px]">Information :</h4>
                <h5 className="font-bold text-[14px] mb-3">Round-Robin Method</h5>
                <ul className="space-y-1 mb-6 text-[13.5px] pl-1">
                  <li><span className="font-semibold text-[#665c2b]">&bull; Equal Distribution:</span> Tasks are evenly distributed among team members.</li>
                  <li><span className="font-semibold text-[#665c2b]">&bull; Sequential Assignment:</span> Each task is assigned to the next team member in order.</li>
                  <li><span className="font-semibold text-[#665c2b]">&bull; Fair Rotation:</span> Ensures balanced workloads and prevents overload.</li>
                </ul>
                <p className="text-[13.5px] mb-4">Example: Tickets go to Agent A, then B, then C, and repeat.</p>
                <p className="text-[13.5px] leading-relaxed">
                  Example: In a customer support system, incoming tickets are assigned in a round-robin fashion. 
                  The first ticket goes to Agent A, the second to Agent B, the third to Agent C, and the fourth back to Agent A, 
                  continuing in this pattern. Using the round-robin method ensures fair and efficient task distribution, 
                  promotes balanced workloads, and streamlines resource allocation.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Agent Modal */}
      {isAgentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                {editingIndex !== null ? "Edit Agent" : "Add New Agent"}
              </h3>
              <button 
                onClick={() => setIsAgentModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Agent Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="input w-full h-10 bg-white"
                  placeholder="e.g. John Doe"
                  autoFocus
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Group</label>
                <input
                  type="text"
                  value={agentGroup}
                  onChange={(e) => setAgentGroup(e.target.value)}
                  className="input w-full h-10 bg-white"
                  placeholder="e.g. Support Team"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Status</label>
                <select
                  value={agentStatus}
                  onChange={(e) => setAgentStatus(e.target.value)}
                  className="input w-full h-10 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsAgentModalOpen(false)}
                className="btn bg-white border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded-lg font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAgentModal}
                disabled={mutation.isPending || !agentName}
                className="btn bg-ink hover:bg-ink-2 text-white shadow-sm h-9 px-5 rounded-lg font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                {editingIndex !== null ? "Edit Group" : "Add New Group"}
              </h3>
              <button 
                onClick={() => setIsGroupModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Group Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input w-full h-10 bg-white"
                  placeholder="e.g. Technical Support"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="btn bg-white border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded-lg font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGroupModal}
                disabled={mutation.isPending || !groupName}
                className="btn bg-ink hover:bg-ink-2 text-white shadow-sm h-9 px-5 rounded-lg font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Type Modal */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                {editingIndex !== null ? "Edit Ticket Type" : "Add New Ticket Type"}
              </h3>
              <button 
                onClick={() => setIsTypeModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Type Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="input w-full h-10 bg-white"
                  placeholder="e.g. Bug"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="btn bg-white border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded-lg font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTypeModal}
                disabled={mutation.isPending || !typeName}
                className="btn bg-ink hover:bg-ink-2 text-white shadow-sm h-9 px-5 rounded-lg font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Modal */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                {editingIndex !== null ? "Edit Ticket Channel" : "Add New Ticket Channel"}
              </h3>
              <button 
                onClick={() => setIsChannelModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Channel Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="input w-full h-10 bg-white"
                  placeholder="e.g. Email, Portal, Phone"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsChannelModalOpen(false)}
                className="btn bg-white border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded-lg font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChannelModal}
                disabled={mutation.isPending || !channelName}
                className="btn bg-ink hover:bg-ink-2 text-white shadow-sm h-9 px-5 rounded-lg font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-lg font-semibold text-ink">
                {editingIndex !== null ? "Edit Reply Template" : "Add Reply Template"}
              </h3>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Template Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="input w-full h-10 bg-white"
                  placeholder="e.g. Greeting, Apology"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Template Body <span className="text-rose-500">*</span></label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  className="input w-full min-h-[120px] resize-y py-3 bg-white"
                  placeholder="Write your template text here..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="btn bg-white border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded-lg font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplateModal}
                disabled={mutation.isPending || !templateName || !templateBody}
                className="btn bg-ink hover:bg-ink-2 text-white shadow-sm h-9 px-5 rounded-lg font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useCurrentCompany, useCurrentUser, useUpdateCompany } from "@/lib/queries";
import { Key, Users, ChevronDown, ChevronUp, Info, X, Trash2, RefreshCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const modulesList = [
  { 
    name: "Clients", 
    hasDropdown: true,
    subPermissions: [
      "Manage Client Category",
      "Manage Client Subcategory",
      "Add Client Contacts",
      "View Client Contacts",
      "Edit Client Contacts",
      "Delete Client Contacts",
      "Add Client Note",
      "View Client Note",
      "Edit Client Note",
      "Delete Client Note",
      "Add Client Document",
      "View Client Document",
      "Edit Client Document",
      "Delete Client Document"
    ]
  },
  { 
    name: "Employees", 
    hasDropdown: true, 
    subPermissions: [
      "Add Designation",
      "View Designation",
      "Edit Designation",
      "Delete Designation",
      "Add Department",
      "View Department",
      "Edit Department",
      "Delete Department",
      "Add Documents",
      "View Documents",
      "Edit Documents",
      "Delete Documents",
      "View Leaves Taken",
      "Update Leaves Quota",
      "View Employee Tasks",
      "View Employee Projects",
      "View Employee Timelogs",
      "Change Employee Role",
      "Manage Emergency Contact",
      "Manage Award",
      "Add Appreciation",
      "View Appreciation",
      "Edit Appreciation",
      "Delete Appreciation",
      "Add Immigration",
      "View Immigration",
      "Edit Immigration",
      "Delete Immigration",
      "View Increment & Promotion",
      "Manage Increment & Promotion"
    ]
  },
  { 
    name: "Projects", 
    hasDropdown: true, 
    subPermissions: [
      "Manage Project Category",
      "View Project Files",
      "Add Project Files",
      "Delete Project Files",
      "View Project Discussions",
      "Add Project Discussions",
      "Edit Project Discussions",
      "Delete Project Discussions",
      "Manage Discussion Category",
      "View Project Milestones",
      "Add Project Milestones",
      "Edit Project Milestones",
      "Delete Project Milestones",
      "View Project Members",
      "Add Project Members",
      "Edit Project Members",
      "Delete Project Members",
      "View Project Rating",
      "Add Project Rating",
      "Edit Project Rating",
      "Delete Project Rating",
      "View Project Budget",
      "View Project Timelogs",
      "View Project Expenses",
      "View Project Tasks",
      "View Project Invoices",
      "View Project Burndown Chart",
      "View Project Payments",
      "View Project Gantt Chart",
      "Add Project Note",
      "View Project Note",
      "Edit Project Note",
      "Delete Project Note",
      "Manage Project Template",
      "View Project Template",
      "View Project Hourly Rates",
      "Create Public Project",
      "View Miroboard"
    ]
  },
  { 
    name: "Attendance", 
    hasDropdown: true,
    subPermissions: [
      "Manage Employee Shifts",
      "View Shift Roster"
    ]
  },
  { 
    name: "Tasks", 
    hasDropdown: true,
    subPermissions: [
      "View Task Category",
      "Add Task Category",
      "Edit Task Category",
      "Delete Task Category",
      "View Task Files",
      "Add Task Files",
      "Delete Task Files",
      "View Sub Tasks",
      "Add Sub Tasks",
      "Edit Sub Tasks",
      "Delete Sub Tasks",
      "View Task Comments",
      "Add Task Comments",
      "Edit Task Comments",
      "Delete Task Comments",
      "View Task Notes",
      "Add Task Notes",
      "Edit Task Notes",
      "Delete Task Notes",
      "Task Labels",
      "Change Status",
      "Send Reminder",
      "Add Status",
      "View Unassigned Tasks",
      "Create Unassigned Tasks"
    ]
  },
  { 
    name: "Estimates", 
    hasDropdown: true,
    subPermissions: [
      "Add Estimate Request",
      "View Estimate Request",
      "Edit Estimate Request",
      "Delete Estimate Request",
      "Reject Estimate Request"
    ]
  },
  { 
    name: "Invoices", 
    hasDropdown: true,
    subPermissions: [
      "Manage Tax",
      "Link Invoice Bank Account",
      "Manage Recurring Invoice"
    ]
  },
  { 
    name: "Payments", 
    hasDropdown: true,
    subPermissions: [
      "Link Payment Bank Account"
    ]
  },
  { 
    name: "Time Logs", 
    hasDropdown: true,
    subPermissions: [
      "Approve Timelogs",
      "Manage Active Timelogs",
      "View Timelog Earnings"
    ]
  },
  { 
    name: "Tickets", 
    hasDropdown: true,
    subPermissions: [
      "Manage Ticket Type",
      "Manage Ticket Agent",
      "Manage Ticket Channel",
      "Manage Ticket Tags",
      "Manage Ticket Groups"
    ]
  },
  { name: "Events", hasDropdown: true, hasMore: false },
  { name: "Notices", hasDropdown: true, hasMore: false },
  { 
    name: "Leaves", 
    hasDropdown: true,
    subPermissions: [
      "Approve Or Reject Leaves",
      "Delete Approve Leaves"
    ]
  },
  { 
    name: "Leads", 
    hasDropdown: true,
    subPermissions: [
      "Manage Lead Custom Forms",
      "View Lead Sources",
      "Add Lead Sources",
      "Edit Lead Sources",
      "Delete Lead Sources",
      "Add Lead Note",
      "View Lead Note",
      "Edit Lead Note",
      "Delete Lead Note",
      "View Deal Category",
      "Add Deal Category",
      "Edit Deal Category",
      "Delete Deal Category",
      "Add Deals",
      "View Deals",
      "Edit Deals",
      "Delete Deals",
      "Change Deal Stages",
      "View Deal Agents",
      "Add Deal Agent",
      "Edit Deal Agent",
      "Delete Deal Agent",
      "View Deal Files",
      "Add Deal Files",
      "Delete Deal Files",
      "View Deal Follow Up",
      "Add Deal Follow Up",
      "Edit Deal Follow Up",
      "Delete Deal Follow Up",
      "View Deal Proposals",
      "Add Deal Proposals",
      "Edit Deal Proposals",
      "Delete Deal Proposals",
      "Manage Proposal Template",
      "Add Deal Note",
      "View Deal Note",
      "Edit Deal Note",
      "Delete Deal Note",
      "Manage Deal Stages",
      "Add Deal pipeline",
      "View Deal pipeline",
      "Edit Deal pipeline",
      "Delete Deal pipeline"
    ]
  },
  { name: "Holidays", hasDropdown: true, hasMore: false },
  { 
    name: "Products", 
    hasDropdown: true,
    subPermissions: [
      "Manage Product Category",
      "Manage Product Sub Category"
    ]
  },
  { 
    name: "Expenses", 
    hasDropdown: true,
    subPermissions: [
      "Manage Expense Category",
      "Manage Recurring Expense",
      "Approve Expenses",
      "Link Expense Bank Account"
    ]
  },
  { 
    name: "Contracts", 
    hasDropdown: true,
    subPermissions: [
      "Manage Contract Type",
      "Renew Contract",
      "Add Contract Discussion",
      "Edit Contract Discussion",
      "View Contract Discussion",
      "Delete Contract Discussion",
      "Add Contract Files",
      "View Contract Files",
      "Delete Contract Files",
      "Manage Contract Template"
    ]
  },
  { 
    name: "Dashboards", 
    hasDropdown: false,
    subPermissions: [
      "View Overview Dashboard",
      "View Project Dashboard",
      "View Client Dashboard",
      "View Hr Dashboard",
      "View Ticket Dashboard",
      "View Finance Dashboard"
    ]
  },
  { 
    name: "Orders", 
    hasDropdown: true,
    subPermissions: [
      "View Project Orders"
    ]
  },
  { 
    name: "Bank Account", 
    hasDropdown: true,
    subPermissions: [
      "Add Bank Transfer",
      "Add Bank Deposit",
      "Add Bank Withdraw"
    ]
  },
  { name: "Assets", hasDropdown: true, info: true, hasMore: false },
  { name: "Letter", hasDropdown: true, info: true, hasMore: false },
  { name: "Payroll", hasDropdown: true, info: true, hasMore: false },
  { name: "Recruit", hasDropdown: false, info: true, hasMore: false },
  { name: "RestAPI", hasDropdown: false, info: true, hasMore: false },
  { name: "SMS", hasDropdown: false, info: true, hasMore: false },
  { name: "Webhooks", hasDropdown: true, info: true, hasMore: false },
  { name: "Zoom", hasDropdown: true, info: true, hasMore: false },
];

const permissionOptions = ["None", "All", "Owned", "Added", "Added & Owned"];
const subPermissionOptions = ["None", "All", "Owned", "Added"];

export function RolesPermissionsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [expandedMore, setExpandedMore] = useState<Record<string, boolean>>({});
  const [isManageRoleOpen, setIsManageRoleOpen] = useState(false);
  const [localRoles, setLocalRoles] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [importRoleId, setImportRoleId] = useState("");

  const { mutate: updateCompany, isPending: isUpdating } = useUpdateCompany();

  React.useEffect(() => {
    if (company?.roles) {
      setLocalRoles(JSON.parse(JSON.stringify(company.roles)));
    }
  }, [company?.roles]);

  const roles = localRoles;

  const togglePermissions = (id: string) => {
    setExpandedRole(expandedRole === id ? null : id);
  };

  const toggleMore = (roleId: string, moduleName: string) => {
    const key = `${roleId}-${moduleName}`;
    setExpandedMore(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePermissionChange = (roleId: string, moduleName: string, action: string, value: string) => {
    const updatedRoles = localRoles.map(r => {
      if (r.id === roleId) {
        const newPerms = { ...(r.permissions || {}) };
        newPerms[moduleName] = { ...(newPerms[moduleName] || {}), [action]: value };
        return { ...r, permissions: newPerms };
      }
      return r;
    });
    setLocalRoles(updatedRoles);
    updateCompany({ roles: updatedRoles });
  };

  const handleSubPermissionChange = (roleId: string, moduleName: string, subName: string, value: string) => {
    const updatedRoles = localRoles.map(r => {
      if (r.id === roleId) {
        const newPerms = { ...(r.permissions || {}) };
        newPerms[moduleName] = { ...(newPerms[moduleName] || {}) };
        newPerms[moduleName].sub = { ...(newPerms[moduleName].sub || {}), [subName]: value };
        return { ...r, permissions: newPerms };
      }
      return r;
    });
    setLocalRoles(updatedRoles);
    updateCompany({ roles: updatedRoles });
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const newId = newRoleName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    let importedPermissions = {};
    if (importRoleId && importRoleId !== "--") {
      const sourceRole = localRoles.find(r => r.id === importRoleId);
      if (sourceRole && sourceRole.permissions) {
        importedPermissions = JSON.parse(JSON.stringify(sourceRole.permissions));
      }
    }

    const newRole = {
      id: newId,
      name: newRoleName.trim(),
      members: 0,
      isAdmin: false,
      permissions: importedPermissions
    };
    
    const updatedRoles = [...localRoles, newRole];
    setLocalRoles(updatedRoles);
    updateCompany({ roles: updatedRoles });
    
    setNewRoleName("");
    setImportRoleId("");
    setIsManageRoleOpen(false);
  };

  const handleDeleteRole = (roleId: string) => {
    const updatedRoles = localRoles.filter(r => r.id !== roleId);
    setLocalRoles(updatedRoles);
    updateCompany({ roles: updatedRoles });
  };

  const handleResetPermissions = (roleId: string) => {
    const updatedRoles = localRoles.map(r => 
      r.id === roleId ? { ...r, permissions: {} } : r
    );
    setLocalRoles(updatedRoles);
    updateCompany({ roles: updatedRoles });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div></div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          {isUpdating && <span className="text-[13px] text-muted mr-3 animate-pulse">Saving changes...</span>}
          <button 
            onClick={() => setIsManageRoleOpen(true)}
            className="flex items-center gap-2 bg-ink text-paper px-4 py-2 rounded-full text-[13px] font-medium hover:bg-ink/90 transition-all shadow-sm active:scale-95"
          >
            <Users className="w-4 h-4" /> Manage Roles
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-paper border border-line rounded-2xl shadow-sm flex flex-col relative overflow-hidden">
        
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-serif text-[22px] text-ink tracking-tight">Roles & Permissions</h3>
          </div>
          
          <div className="space-y-4">
            {roles.map((role: any) => (
              <div key={role.id} className="border border-line rounded-xl bg-paper overflow-hidden shadow-sm hover:shadow transition-shadow">
                {/* Role Header Row */}
                <div className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between p-5 transition-colors cursor-pointer",
                  expandedRole === role.id ? "bg-bone/40 border-b border-line" : "hover:bg-bone/20"
                )} onClick={() => { if (!role.isAdmin) togglePermissions(role.id) }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-bone flex items-center justify-center border border-line">
                      <Users className="w-4 h-4 text-ink-2" />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-ink">{role.name}</div>
                      <div className="text-[12.5px] text-muted mt-0.5">{role.members} Member{role.members !== 1 ? 's' : ''} assigned</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 sm:mt-0 flex items-center">
                    {role.isAdmin ? (
                      <span className="text-[12px] bg-bone-2 text-muted/80 px-3 py-1 rounded-full font-medium italic border border-line">Admin privileges locked</span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); togglePermissions(role.id); }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 border rounded-full transition-all text-[13px] font-medium",
                          expandedRole === role.id 
                            ? "bg-ink text-paper border-ink shadow-sm" 
                            : "bg-paper border-line hover:border-ink hover:text-ink text-muted"
                        )}
                      >
                        <Key className="w-4 h-4" /> 
                        {expandedRole === role.id ? "Hide Permissions" : "View Permissions"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Permissions Table */}
                {expandedRole === role.id && !role.isAdmin && (
                  <div className="overflow-x-auto animate-in slide-in-from-top-2 duration-300">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-bone/20 border-b border-line text-muted font-medium text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-4 px-6 font-semibold">Module Name</th>
                          <th className="py-4 px-6 font-semibold">Create</th>
                          <th className="py-4 px-6 font-semibold">Read</th>
                          <th className="py-4 px-6 font-semibold">Update</th>
                          <th className="py-4 px-6 font-semibold">Delete</th>
                          <th className="py-4 px-6 font-semibold text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {modulesList.map((module) => {
                          const isMoreExpanded = expandedMore[`${role.id}-${module.name}`];
                          
                          return (
                            <React.Fragment key={module.name}>
                              <tr className="hover:bg-bone/20 transition-colors">
                                <td className="py-3 px-6 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 text-ink font-medium">
                                    {module.name}
                                    {module.info && <Info className="w-3.5 h-3.5 text-muted/70" />}
                                  </div>
                                </td>
                                
                                <td className="py-3 px-6">
                                  {module.hasDropdown ? (
                                    <select 
                                      value={role.permissions?.[module.name]?.Add || "None"}
                                      onChange={(e) => handlePermissionChange(role.id, module.name, "Add", e.target.value)}
                                      className="bg-transparent text-ink border-none focus:ring-0 cursor-pointer text-[13px] appearance-none pr-4 relative z-10 w-full hover:text-blue-600"
                                    >
                                      {permissionOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                  ) : <span className="text-muted">--</span>}
                                </td>
                                
                                <td className="py-3 px-6">
                                  {module.hasDropdown ? (
                                    <select 
                                      value={role.permissions?.[module.name]?.View || "None"}
                                      onChange={(e) => handlePermissionChange(role.id, module.name, "View", e.target.value)}
                                      className="bg-transparent text-ink border-none focus:ring-0 cursor-pointer text-[13px] appearance-none pr-4 relative z-10 w-full hover:text-blue-600"
                                    >
                                      {permissionOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                  ) : <span className="text-muted">--</span>}
                                </td>
                                
                                <td className="py-3 px-6">
                                  {module.hasDropdown ? (
                                    <select 
                                      value={role.permissions?.[module.name]?.Update || "None"}
                                      onChange={(e) => handlePermissionChange(role.id, module.name, "Update", e.target.value)}
                                      className="bg-transparent text-ink border-none focus:ring-0 cursor-pointer text-[13px] appearance-none pr-4 relative z-10 w-full hover:text-blue-600"
                                    >
                                      {permissionOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                  ) : <span className="text-muted">--</span>}
                                </td>
                                
                                <td className="py-3 px-6">
                                  {module.hasDropdown ? (
                                    <select 
                                      value={role.permissions?.[module.name]?.Delete || "None"}
                                      onChange={(e) => handlePermissionChange(role.id, module.name, "Delete", e.target.value)}
                                      className="bg-transparent text-ink border-none focus:ring-0 cursor-pointer text-[13px] appearance-none pr-4 relative z-10 w-full hover:text-blue-600"
                                    >
                                      {permissionOptions.map(opt => <option key={opt}>{opt}</option>)}
                                    </select>
                                  ) : <span className="text-muted">--</span>}
                                </td>
                                
                                <td className="py-3 px-6 text-right">
                                  {module.hasMore !== false && (
                                    <button 
                                      onClick={() => toggleMore(role.id, module.name)}
                                      className="text-muted hover:text-ink transition-colors flex items-center justify-end w-full gap-1"
                                    >
                                      More {isMoreExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </td>
                              </tr>

                              {/* Expanded 'More' section */}
                              {isMoreExpanded && module.subPermissions && (
                                <tr className="bg-slate-50/50">
                                  <td colSpan={6} className="p-0 border-t border-line">
                                    <div className="py-3">
                                      {module.subPermissions.map((sub, i) => (
                                        <div key={sub} className="flex items-center py-2 px-6 hover:bg-slate-100/50 transition-colors">
                                          {/* Aligning text between 'Add' and 'View' columns roughly by using fixed/percentage widths */}
                                          <div className="w-[20%] hidden md:block"></div>
                                          <div className="flex-1 text-[13px] text-ink font-medium pl-8 md:pl-0">{sub}</div>
                                          <div className="w-[35%] md:w-[25%] pr-6 md:pr-0">
                                            <div className="relative inline-block w-full max-w-[140px]">
                                              <select 
                                                value={role.permissions?.[module.name]?.sub?.[sub] || "None"}
                                                onChange={(e) => handleSubPermissionChange(role.id, module.name, sub, e.target.value)}
                                                className="w-full bg-paper border border-line rounded px-3 py-1.5 text-[13px] focus:outline-none focus:border-red-500 appearance-none cursor-pointer"
                                              >
                                                {subPermissionOptions.map(opt => <option key={opt}>{opt}</option>)}
                                              </select>
                                              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                                            </div>
                                          </div>
                                          <div className="w-[10%] hidden md:block"></div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manage Role Modal */}
      {isManageRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-paper rounded shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-line">
              <h2 className="text-lg font-medium text-ink">Manage Role</h2>
              <button 
                onClick={() => setIsManageRoleOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-bone/40 text-muted/80 border-b border-line">
                  <tr>
                    <th className="py-3 px-4 font-medium w-10 text-center">#</th>
                    <th className="py-3 px-4 font-medium w-1/4">User Role</th>
                    <th className="py-3 px-4 font-medium w-1/4"></th>
                    <th className="py-3 px-4 font-medium text-right w-auto">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {roles.map((r: any, idx: number) => (
                    <tr key={r.id} className="hover:bg-bone/20">
                      <td className="py-4 px-4 text-ink text-center">{idx + 1}</td>
                      <td className="py-4 px-4 text-ink font-medium whitespace-nowrap">{r.name}</td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#3b82f6] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm shrink-0">{r.members}</span>
                          <span className="text-muted/80">Members</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {r.id === "admin" ? (
                          <span className="text-muted/60 italic whitespace-nowrap">Default role can not be deleted.</span>
                        ) : r.id === "employee" || r.id === "client" ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-muted/60 italic hidden sm:inline-block whitespace-nowrap">Default role can not be deleted.</span>
                            <button 
                              onClick={() => handleResetPermissions(r.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-line rounded text-muted hover:text-ink hover:bg-bone transition-colors whitespace-nowrap shrink-0"
                            >
                              <RefreshCcw className="w-3.5 h-3.5 shrink-0" /> Reset Permissions
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleDeleteRole(r.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-line rounded text-muted hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors ml-auto whitespace-nowrap shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 border-t border-line pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[13px] text-muted mb-2">Role Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. HR" 
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="w-full bg-paper border border-line rounded px-3 py-2 text-[13px] focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-muted mb-2">Import from Role</label>
                    <div className="relative">
                      <select 
                        value={importRoleId}
                        onChange={(e) => setImportRoleId(e.target.value)}
                        className="w-full bg-paper border border-line rounded px-3 py-2 text-[13px] focus:outline-none focus:border-red-500 transition-colors appearance-none text-muted"
                      >
                        <option value="--">--</option>
                        {roles.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-line flex justify-end gap-3 bg-bone/30">
              <button 
                onClick={() => setIsManageRoleOpen(false)}
                className="btn bg-paper border border-line text-ink hover:bg-bone px-5 py-2 rounded text-[13px] font-medium transition-colors"
              >
                Close
              </button>
              <button 
                onClick={handleAddRole}
                disabled={isUpdating}
                className="btn bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded text-[13px] font-medium transition-colors"
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

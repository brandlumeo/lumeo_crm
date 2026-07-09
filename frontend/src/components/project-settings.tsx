"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FolderGit2, Loader2, CheckCircle, XCircle, Shield, AlertTriangle,
  Hash, LayoutGrid, HelpCircle, Plus, Edit, Trash2, X, Circle, Tag
} from "lucide-react";
import { useCurrentCompany, useCurrentUser } from "@/lib/queries";
import { updateCompany } from "@/lib/api";
import { cn } from "@/lib/utils";

type ProjectStatus = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
};

type ProjectCategory = {
  id: string;
  name: string;
};

export function ProjectSettingsForm() {
  const { data: company } = useCurrentCompany();
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("category");

  // General Settings State
  const [projectPrefix, setProjectPrefix] = useState("PRJ-");
  const [defaultView, setDefaultView] = useState("list");
  const [requireApproval, setRequireApproval] = useState(false);
  const [sendReminder, setSendReminder] = useState(false);

  // Statuses State
  const statuses: ProjectStatus[] = company?.project_statuses ?? [];
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingStatusIndex, setEditingStatusIndex] = useState<number | null>(null);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3b82f6");

  // Categories State
  const categories: ProjectCategory[] = company?.project_categories ?? [];
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, index: number | null, type: 'status' | 'category'}>({ isOpen: false, index: null, type: 'status' });

  useEffect(() => {
    if (company) {
      setProjectPrefix(company.project_prefix ?? "PRJ-");
      setDefaultView(company.default_project_view ?? "list");
      setRequireApproval(company.require_project_approval ?? false);
      setSendReminder(company.project_send_reminder ?? false);
    }
  }, [company]);

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const mutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", "current"] });
      setMsg({ type: "success", text: "Project settings updated successfully." });
      setTimeout(() => setMsg(null), 4000);
      setIsStatusModalOpen(false);
      setIsCategoryModalOpen(false);
    },
    onError: () => {
      setMsg({ type: "error", text: "Failed to update project settings. Please try again." });
    },
  });

  // Handlers for Statuses
  const handleOpenAddStatus = () => {
    setEditingStatusIndex(null);
    setStatusName("");
    setStatusColor("#3b82f6");
    setIsStatusModalOpen(true);
  };
  
  const handleOpenEditStatus = (index: number) => {
    setEditingStatusIndex(index);
    setStatusName(statuses[index].name);
    setStatusColor(statuses[index].color);
    setIsStatusModalOpen(true);
  };

  const handleDeleteStatus = (index: number) => {
    if (!isAdmin) return;
    if (statuses[index].isDefault) {
      alert("You cannot delete the default status. Please set another status as default first.");
      return;
    }
    setDeleteConfirmation({ isOpen: true, index, type: 'status' });
  };

  const handleSetDefaultStatus = (index: number) => {
    if (!isAdmin) return;
    const newStatuses = statuses.map((status, i) => ({
      ...status,
      isDefault: i === index
    }));
    mutation.mutate({ project_statuses: newStatuses });
  };

  const handleSaveStatusModal = () => {
    if (!statusName) return;
    const newStatuses = [...statuses];
    
    // If it's the first status being added, make it default automatically
    const isFirst = newStatuses.length === 0;

    if (editingStatusIndex !== null) {
      newStatuses[editingStatusIndex] = { 
        ...newStatuses[editingStatusIndex], 
        name: statusName, 
        color: statusColor 
      };
    } else {
      newStatuses.push({ 
        id: Date.now().toString(), 
        name: statusName, 
        color: statusColor, 
        isDefault: isFirst 
      });
    }
    mutation.mutate({ project_statuses: newStatuses });
  };

  // Handlers for Categories
  const handleOpenAddCategory = () => {
    setEditingCategoryIndex(null);
    setCategoryName("");
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (index: number) => {
    setEditingCategoryIndex(index);
    setCategoryName(categories[index].name);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (index: number) => {
    if (!isAdmin) return;
    setDeleteConfirmation({ isOpen: true, index, type: 'category' });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.index === null) return;
    
    if (deleteConfirmation.type === 'status') {
      const newStatuses = [...statuses];
      newStatuses.splice(deleteConfirmation.index, 1);
      mutation.mutate({ project_statuses: newStatuses });
    } else {
      const newCategories = [...categories];
      newCategories.splice(deleteConfirmation.index, 1);
      mutation.mutate({ project_categories: newCategories });
    }
    
    setDeleteConfirmation({ isOpen: false, index: null, type: 'status' });
  };

  const handleSaveCategoryModal = () => {
    if (!categoryName) return;
    const newCategories = [...categories];
    
    if (editingCategoryIndex !== null) {
      newCategories[editingCategoryIndex] = { 
        ...newCategories[editingCategoryIndex], 
        name: categoryName 
      };
    } else {
      newCategories.push({ 
        id: Date.now().toString(), 
        name: categoryName 
      });
    }
    mutation.mutate({ project_categories: newCategories });
  };

  if (!company) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-brand/40" />
      <div className="text-sm font-medium tracking-wide uppercase">Loading settings...</div>
    </div>
  );

  const tabs = [
    { id: "settings", label: "Project Settings" },
    { id: "status", label: "Project Status Settings" },
    { id: "category", label: "Project Category" }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
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

      {/* Top Action Button Placeholder Container */}
      <div className="flex mb-2 h-9">
        {isAdmin && activeTab === "status" && (
          <button onClick={handleOpenAddStatus} className="btn btn-primary shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add Status
          </button>
        )}
        {isAdmin && activeTab === "category" && (
          <button onClick={handleOpenAddCategory} className="btn btn-primary shadow-sm px-4 rounded font-medium flex items-center gap-1.5 text-[13px] transition-colors">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-paper border border-line shadow-sm overflow-hidden flex flex-col relative">
        
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
        <div className="p-0 min-h-[300px]">
          
          {activeTab === "settings" && (
            <div className="p-8 flex flex-col space-y-8">
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendReminder"
                  checked={sendReminder}
                  onChange={(e) => setSendReminder(e.target.checked)}
                  disabled={!isAdmin}
                  className="w-4 h-4 text-ink border-gray-300 rounded focus:ring-ink"
                />
                <label htmlFor="sendReminder" className="text-[14px] text-ink flex items-center gap-1.5 cursor-pointer">
                  Send Reminder
                  <HelpCircle className="w-4 h-4 text-muted/70" />
                </label>
              </div>

              {/* Keep the existing project settings below the new fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl pt-6 border-t border-line/50 mt-4">
                <div className="space-y-1.5">
                  <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted" /> Project Prefix
                  </label>
                  <input
                    type="text"
                    value={projectPrefix}
                    onChange={(e) => setProjectPrefix(e.target.value)}
                    disabled={!isAdmin}
                    className="input w-full h-11 bg-paper font-mono text-sm"
                    placeholder="PRJ-"
                  />
                  <p className="text-xs text-muted/80 mt-1">Auto-incrementing prefix for projects</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-muted" /> Default View
                  </label>
                  <select
                    value={defaultView}
                    onChange={(e) => setDefaultView(e.target.value)}
                    disabled={!isAdmin}
                    className="input w-full h-11 bg-paper"
                  >
                    <option value="list">List View</option>
                    <option value="kanban">Kanban Board</option>
                    <option value="gantt">Gantt Chart</option>
                    <option value="calendar">Calendar</option>
                  </select>
                  <p className="text-xs text-muted/80 mt-1">Initial layout for new project pages</p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[13.5px] font-medium text-ink flex items-center gap-2">
                    Require Project Approval
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireApproval}
                        disabled={!isAdmin}
                        onChange={(e) => setRequireApproval(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-bone-2 border border-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:border-emerald-500 shadow-inner"></div>
                    </label>
                    <span className="text-[13px] text-muted">New projects will remain "Draft" until approved.</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="pt-4">
                  <button
                    onClick={() => mutation.mutate({
                      project_prefix: projectPrefix,
                      default_project_view: defaultView,
                      require_project_approval: requireApproval,
                      project_send_reminder: sendReminder
                    })}
                    disabled={mutation.isPending}
                    className="btn btn-primary shadow-sm transition-all h-9 px-5 rounded font-medium flex items-center gap-2"
                  >
                    {mutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Save</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "status" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-paper border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-4 px-6 w-16 text-center">#</th>
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Default Status</th>
                      <th className="py-4 px-6 text-right w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {statuses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Circle className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No project statuses added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      statuses.map((status, index) => (
                        <tr key={status.id} className="hover:bg-bone/30 transition-colors group">
                          <td className="py-4 px-6 text-muted text-center">{index + 1}</td>
                          <td className="py-4 px-6 text-ink font-medium flex items-center gap-3">
                            <div 
                              className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" 
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </td>
                          <td className="py-4 px-6 text-ink">
                            <label className="flex items-center gap-2 cursor-pointer w-fit group/radio">
                              <input 
                                type="radio" 
                                name="defaultStatus"
                                checked={status.isDefault}
                                onChange={() => handleSetDefaultStatus(index)}
                                disabled={!isAdmin}
                                className={cn(
                                  "w-4 h-4 cursor-pointer",
                                  status.isDefault ? "text-rose-500 border-rose-500 focus:ring-rose-500" : "text-muted border-gray-300"
                                )}
                              />
                              <span className={cn(
                                "text-[13px]",
                                status.isDefault ? "text-ink font-medium" : "text-muted group-hover/radio:text-ink transition-colors"
                              )}>
                                Default
                              </span>
                            </label>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStatus(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-paper hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStatus(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-paper hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
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

          {activeTab === "category" && (
            <div className="flex flex-col">
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-paper border-b border-line text-muted/80 font-medium">
                    <tr>
                      <th className="py-4 px-6 w-16 text-center">#</th>
                      <th className="py-4 px-6">Category Name</th>
                      <th className="py-4 px-6 text-right w-48">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Tag className="w-8 h-8 text-line mb-3" />
                            <span className="text-muted/70">- No project categories added. -</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      categories.map((category, index) => (
                        <tr key={category.id} className="hover:bg-bone/30 transition-colors group">
                          <td className="py-4 px-6 text-muted text-center">{index + 1}</td>
                          <td className="py-4 px-6 text-ink font-medium uppercase tracking-wide text-xs">{category.name}</td>
                          <td className="py-4 px-6 text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCategory(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-paper hover:bg-bone text-muted hover:text-ink transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(index)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium border border-line rounded bg-paper hover:bg-rose-50 text-muted hover:text-rose-600 transition-colors"
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

        </div>
      </div>

      {/* Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-paper rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-[15px] font-semibold text-ink">
                {editingStatusIndex !== null ? "Edit Status" : "Add Status"}
              </h3>
              <button 
                onClick={() => setIsStatusModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Status Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={statusName}
                  onChange={(e) => setStatusName(e.target.value)}
                  className="input w-full h-10 bg-paper"
                  placeholder="e.g. in progress"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={statusColor}
                    onChange={(e) => setStatusColor(e.target.value)}
                    className="w-10 h-10 rounded border border-line cursor-pointer p-0.5 bg-paper"
                  />
                  <input
                    type="text"
                    value={statusColor}
                    onChange={(e) => setStatusColor(e.target.value)}
                    className="input w-full h-10 bg-paper font-mono text-[13px] uppercase"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="btn bg-paper border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStatusModal}
                disabled={mutation.isPending || !statusName}
                className="btn btn-primary shadow-sm h-9 px-5 rounded font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-paper rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line">
              <h3 className="text-[15px] font-semibold text-ink">
                {editingCategoryIndex !== null ? "Edit Category" : "Add Category"}
              </h3>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-ink">Category Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="input w-full h-10 bg-paper"
                  placeholder="e.g. CCTV"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-bone/30 border-t border-line flex items-center justify-end gap-3">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="btn bg-paper border border-line hover:bg-bone text-ink shadow-sm h-9 px-4 rounded font-medium text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategoryModal}
                disabled={mutation.isPending || !categoryName}
                className="btn btn-primary shadow-sm h-9 px-5 rounded font-medium flex items-center gap-2 text-[13px] transition-colors"
              >
                {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div 
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setDeleteConfirmation({ isOpen: false, index: null, type: 'status' })} 
          />
          <div className="relative w-full max-w-sm bg-paper rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                <AlertTriangle className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">Delete {deleteConfirmation.type === 'status' ? 'Status' : 'Category'}?</h3>
              <p className="text-[14px] text-muted leading-relaxed">
                Are you sure you want to remove this project {deleteConfirmation.type}? This action cannot be undone and may affect related projects.
              </p>
            </div>
            <div className="px-6 py-4 bg-bone/30 border-t border-line flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setDeleteConfirmation({ isOpen: false, index: null, type: 'status' })} 
                className="w-full sm:w-auto flex-1 btn bg-paper border border-line hover:bg-bone text-ink shadow-sm h-10 px-4 rounded-xl font-medium text-[14px] transition-colors"
                disabled={mutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                disabled={mutation.isPending}
                className="w-full sm:w-auto flex-1 btn btn-primary bg-rose-500 border-rose-500 hover:bg-rose-600 text-white dark:text-white dark:bg-rose-600 dark:hover:bg-rose-700 shadow-sm h-10 px-4 rounded-xl font-medium flex items-center justify-center gap-2 text-[14px] transition-colors"
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

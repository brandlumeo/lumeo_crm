"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, LayoutList, FolderKanban, XCircle } from "lucide-react";
import { useProject, useUpdateProject, useCurrentCompany, useCustomerPage, useDealPage, useTeam } from "@/lib/queries";
import { PageShell } from "@/components/page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DocumentLibrary } from "@/components/document-library";
import { formatDateTime } from "@/lib/utils";
import { CustomFieldsDisplay } from "@/components/custom-fields-display";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";
import { toast } from "sonner";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = parseInt(id, 10);
  
  const { data: project, isLoading, error } = useProject(projectId);
  const updateProject = useUpdateProject();
  const { data: company } = useCurrentCompany();
  const { data: customersData } = useCustomerPage({ limit: 100 });
  const { data: dealsData } = useDealPage({ limit: 100 });
  const { data: teamData } = useTeam();

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "",
    category: "",
    customer_id: "",
    deal_id: "",
    member_ids: [] as number[],
    progress: 0,
    start_date: "",
    deadline: "",
    custom_data: {} as any,
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "",
        category: project.category || "",
        customer_id: project.customer?.id?.toString() || "",
        deal_id: project.deal?.id?.toString() || "",
        member_ids: project.members?.map((m: any) => m.id) || [],
        progress: project.progress || 0,
        start_date: project.start_date || "",
        deadline: project.deadline || "",
        custom_data: project.custom_data || {},
      });
    }
  }, [project]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.start_date) payload.start_date = null;
    if (!payload.deadline) payload.deadline = null;
    if (!payload.customer_id) payload.customer_id = null;
    if (!payload.deal_id) payload.deal_id = null;
    if (!payload.category) payload.category = null;

    updateProject.mutate(
      { id: projectId, payload },
      {
        onSuccess: () => {
          toast.success("Project updated successfully");
          setDrawerOpen(false);
        },
        onError: () => toast.error("Failed to update project"),
      }
    );
  };
  if (isLoading) {
    return (
      <PageShell
        eyebrow="Projects"
        title="Loading..."
        description="Fetching project details from your workspace..."
      >
        <div className="p-6 text-muted font-sans text-xs">Loading project details...</div>
      </PageShell>
    );
  }

  if (error || !project) {
    return (
      <PageShell
        eyebrow="Projects"
        title="Not Found"
        description="The requested project is not available or has been moved."
      >
        <div className="p-6 text-muted font-sans text-xs">Project not found.</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={project.name}
      eyebrow="Project Details"
      description="Manage communications, timelines, documentation, and tasks for this project."
      actions={[
        {
          label: "Edit Project",
          onClick: () => setDrawerOpen(true),
          variant: "primary",
        },
      ]}
    >
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center text-[13px] text-muted hover:text-ink transition-colors font-medium px-3 py-1.5 bg-bone-2 border border-line rounded-md">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to projects
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="space-y-6">
          <div className="card animate-rise">
            <div className="p-6 border-b border-line flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-bone-2 rounded-full grid place-items-center mb-3 border border-line shadow-sm">
                <FolderKanban className="w-8 h-8 text-muted" strokeWidth={1.5} />
              </div>
              <h2 className="text-[22px] font-serif text-ink tracking-tight">{project.name}</h2>
              <span className="mt-2 chip bg-surface-muted text-ink-2 border-line">
                {project.status?.replaceAll("_", " ")}
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              {project.customer && (
                <div className="flex items-center gap-3 text-[13px]">
                  <LayoutList className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-ink-2 truncate">
                    Client: <Link href={`/customers/${project.customer.id}`} className="hover:underline">{project.customer.name}</Link>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-[13px]">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <span className="text-ink-2 truncate">Added: {formatDateTime(project.created_at)}</span>
              </div>
              {project.start_date && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Calendar className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-ink-2 truncate">Start: {formatDateTime(project.start_date)}</span>
                </div>
              )}
              {project.deadline && (
                <div className="flex items-center gap-3 text-[13px]">
                  <Calendar className="w-4 h-4 text-muted shrink-0" />
                  <span className="text-ink-2 truncate">Deadline: {formatDateTime(project.deadline)}</span>
                </div>
              )}
              
              <div className="pt-2">
                <div className="flex justify-between text-[11px] text-muted mb-1">
                  <span>Progress</span>
                  <span>{project.progress ?? 0}%</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-1.5">
                  <div 
                    className="bg-accent h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${project.progress ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <CustomFieldsDisplay modelName="project" customData={project.custom_data} />
        </div>

        <div className="animate-rise space-y-6" style={{ animationDelay: "50ms" }}>
          <ActivityTimeline entityId={project.id} entityType="project" />
          <DocumentLibrary entityId={project.id} entityType="project" />
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in bg-ink/30 backdrop-blur-[2px]">
          <div 
            className="w-full max-w-md bg-paper h-full shadow-2xl flex flex-col border-l border-line animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-line bg-paper sticky top-0 z-10 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-[20px] font-medium text-ink">
                  Edit Project
                </h3>
                <p className="text-[13px] text-muted mt-1">Update project details and progress.</p>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bone transition-colors text-muted hover:text-ink"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <form id="project-form" onSubmit={handleSave} className="flex flex-col gap-6">
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                    placeholder="Project scope and details..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Category</label>
                    <select 
                      value={form.category} 
                      onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                    >
                      <option value="">Select Category</option>
                      {Array.isArray(company?.project_categories) ? company.project_categories.map((cat: any) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      )) : null}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Status</label>
                    <select 
                      value={form.status} 
                      onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                    >
                      <option value="">Select Status</option>
                      {Array.isArray(company?.project_statuses) && company.project_statuses.length > 0 ? company.project_statuses.map((stat: any) => (
                        <option key={stat.id} value={stat.name.toLowerCase()}>
                          {stat.name}
                        </option>
                      )) : (
                        <>
                          <option value="not started">Not Started</option>
                          <option value="in progress">In Progress</option>
                          <option value="on hold">On Hold</option>
                          <option value="completed">Completed</option>
                          <option value="canceled">Canceled</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Linked Customer</label>
                    <select 
                      value={form.customer_id} 
                      onChange={(e) => setForm(f => ({ ...f, customer_id: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                    >
                      <option value="">None</option>
                      {customersData?.results?.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Linked Deal</label>
                    <select 
                      value={form.deal_id} 
                      onChange={(e) => setForm(f => ({ ...f, deal_id: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                    >
                      <option value="">None</option>
                      {dealsData?.results?.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Assigned Members</label>
                  <select 
                    multiple
                    value={form.member_ids.map(String)} 
                    onChange={(e) => {
                      const options = Array.from(e.target.selectedOptions);
                      const selectedIds = options.map((option) => parseInt(option.value, 10));
                      setForm(f => ({ ...f, member_ids: selectedIds }));
                    }}
                    className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow h-24"
                  >
                    {teamData?.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted">Hold Ctrl/Cmd to select multiple members</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Progress ({form.progress}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={form.progress}
                    onChange={(e) => setForm(f => ({ ...f, progress: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[13px] font-bold text-ink uppercase tracking-wider">Deadline</label>
                    <input
                      type="date"
                      value={form.deadline}
                      onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-paper border border-line rounded-lg text-[13.5px] focus:outline-none focus:ring-2 focus:ring-accent/20 transition-shadow"
                    />
                  </div>
                </div>

                <CustomFieldsFormInputs
                  modelName="project"
                  values={form.custom_data}
                  onChange={(custom_data) => setForm(f => ({ ...f, custom_data }))}
                />

              </form>
            </div>
            
            <div className="p-6 border-t border-line bg-bone-2/30 flex justify-end gap-3 sticky bottom-0">
              <button 
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-bold text-ink-2 hover:bg-bone transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                form="project-form"
                disabled={updateProject.isPending}
                className="px-6 py-2 rounded-lg text-[13px] font-bold bg-ink text-paper hover:bg-ink-2 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm flex items-center gap-2"
              >
                {updateProject.isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

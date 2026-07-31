"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";

import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { CustomFieldsFormInputs } from "@/components/custom-fields-form-inputs";
import { createProject } from "@/lib/api";
import { useProjects, useCurrentCompany } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { data: company } = useCurrentCompany();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  
  // Fetch default status
  const defaultStatus = company?.project_statuses?.find((s: any) => s.isDefault)?.name?.toLowerCase() || "not started";
  
  const [form, setForm] = useState({
    name: "",
    status: defaultStatus,
    start_date: "",
    end_date: "",
    custom_data: {},
  });

  const { data, isLoading } = useProjects({
    page,
    search,
    status: status || undefined,
    ordering: "-created_at",
  });

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      setForm({ name: "", status: defaultStatus, start_date: "", end_date: "", custom_data: {} });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
  });

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Projects"
      title="Delivery & Fulfillment."
      description="Manage ongoing projects, track progress, and collaborate with your team to deliver on won deals."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_360px] gap-6">
        <div className="card animate-rise">
          <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="card-title">
              Project list
              <span className="card-title-meta">{data?.count ?? 0} total projects</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="input sm:w-[220px]"
                placeholder="Search projects"
              />
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="select sm:w-[180px]"
              >
                <option value="">All statuses</option>
                {company?.project_statuses?.map((stat: any) => (
                  <option key={stat.id} value={stat.name.toLowerCase()}>
                    {stat.name}
                  </option>
                )) || (
                  <>
                    <option value="not started">Not Started</option>
                    <option value="in progress">In Progress</option>
                    <option value="on hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {isLoading && !data ? (
            <div className="p-6 text-sm text-muted">Loading projects...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects found"
              description="Create a project on the right, or widen the current search and status filters. Projects are also automatically created when Deals are Won."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "name",
                  header: "Project",
                  render: (project) => (
                    <Link href={`/projects/${project.id}`} className="font-medium text-ink hover:text-accent transition-colors hover:underline">
                      {project.name}
                    </Link>
                  ),
                },
                {
                  key: "customer",
                  header: "Client",
                  render: (project) => project.customer ? (
                    <Link href={`/customers/${project.customer.id}`} className="text-sm hover:underline">
                      {project.customer.name}
                    </Link>
                  ) : <span className="text-muted/50">-</span>
                },
                {
                  key: "status",
                  header: "Status",
                  sortable: true,
                  render: (project) => (
                    <span className="chip">
                      {project.status?.replaceAll("_", " ")}
                    </span>
                  ),
                },
                {
                  key: "progress",
                  header: "Progress",
                  render: (project) => (
                    <div className="w-full max-w-[100px]">
                      <div className="flex justify-between text-[11px] text-muted mb-1">
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-surface-muted rounded-full h-1.5">
                        <div 
                          className="bg-accent h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${project.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  key: "created_at",
                  header: "Created",
                  render: (project) => formatDateTime(project.created_at),
                },
              ]}
              rows={rows}
              count={data?.count ?? 0}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>

        <div className="card animate-rise">
          <div className="card-head">
            <div className="card-title">
              New project
              <span className="card-title-meta">Manual entry</span>
            </div>
          </div>
          <form
            className="p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const payload: any = { ...form };
              if (!payload.start_date) delete payload.start_date;
              if (!payload.end_date) delete payload.end_date;
              mutation.mutate(payload);
            }}
          >
            <label>
              <span className="label">Project name</span>
              <input
                required
                className="input"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="HQ Renovation"
              />
            </label>
            


            <label>
              <span className="label">Status</span>
              <select
                className="select"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                {company?.project_statuses?.map((stat: any) => (
                  <option key={stat.id} value={stat.name.toLowerCase()}>
                    {stat.name}
                  </option>
                )) || (
                  <>
                    <option value="not started">Not Started</option>
                    <option value="in progress">In Progress</option>
                    <option value="on hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </>
                )}
              </select>
            </label>
            
            <div className="grid grid-cols-2 gap-4">
              <label>
                <span className="label">Start date</span>
                <input
                  type="date"
                  className="input"
                  value={form.start_date}
                  onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
                />
              </label>
              <label>
                <span className="label">Deadline</span>
                <input
                  type="date"
                  className="input"
                  value={form.end_date}
                  onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))}
                />
              </label>
            </div>

            <CustomFieldsFormInputs
              modelName="project"
              values={form.custom_data || {}}
              onChange={(custom_data) => setForm((current) => ({ ...current, custom_data }))}
            />

            {mutation.isError ? (
              <div className="chip chip-warning justify-center">
                Could not create project. Check the data and try again.
              </div>
            ) : null}

            <button type="submit" disabled={mutation.isPending} className="btn btn-primary w-full justify-center">
              {mutation.isPending ? "Creating..." : "Create project"}
            </button>
            
            <div className="surface-muted p-4 text-[12px] text-muted text-center rounded-lg mt-4 border border-ink/5">
              💡 Tip: Projects are also automatically created when a Deal reaches the <strong>Won</strong> stage!
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

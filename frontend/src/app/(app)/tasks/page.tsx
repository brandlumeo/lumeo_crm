"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckSquare } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { createTask, fetchTeam } from "@/lib/api";
import { useCurrentUser, useTaskPage } from "@/lib/queries";
import type { TaskInput } from "@/lib/types";
import { formatDateTime, getDisplayName } from "@/lib/utils";

const PAGE_SIZE = 20;

const statusTone: Record<string, string> = {
  todo: "chip chip-warning",
  in_progress: "chip chip-positive",
  done: "chip chip-neutral",
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<TaskInput>({
    title: "",
    due_date: "",
    status: "todo",
    assigned_to_id: null,
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    enabled: !!me,
  });

  const { data, isLoading } = useTaskPage({
    page,
    search,
    status: status || undefined,
    ordering: "due_date",
  });

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setForm({ title: "", due_date: "", status: "todo", assigned_to_id: null });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-bundle"] });
    },
  });

  const rows = data?.results ?? [];

  return (
    <PageShell
      eyebrow="Tasks"
      title="What is on today."
      description="Tasks stay organized, team-isolated, and date-driven. Search upcoming work and add new follow-ups without leaving the CRM."
    >
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_360px] gap-6">
        <div className="card animate-rise">
          <div className="card-head flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="card-title">
              Task list
              <span className="card-title-meta">{data?.count ?? 0} total tasks</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="input sm:w-[220px]"
                placeholder="Search tasks"
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
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {!mounted || (isLoading && !data) ? (
            <div className="p-6 text-sm text-muted">Loading tasks...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks found"
              description="Create a task on the right, or widen the current search and status filters."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: "title",
                  header: "Task",
                  render: (task) => <div className="font-medium text-ink">{task.title}</div>,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (task) => (
                    <span className={statusTone[task.status] ?? "chip chip-neutral"}>
                      {task.status.replaceAll("_", " ")}
                    </span>
                  ),
                },
                {
                  key: "assigned_to",
                  header: "Assigned",
                  render: (task) => getDisplayName(task.assigned_to),
                },
                {
                  key: "due_date",
                  header: "Due",
                  render: (task) => formatDateTime(task.due_date),
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
              New task
              <span className="card-title-meta">Assigns to you by default</span>
            </div>
          </div>
          <form
            className="p-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate({
                ...form,
                assigned_to_id: form.assigned_to_id || me?.id,
              });
            }}
          >
            <label>
              <span className="label">Task title</span>
              <input
                required
                className="input"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Send revised proposal"
              />
            </label>
            <label>
              <span className="label">Due date</span>
              <input
                required
                type="date"
                className="input"
                value={form.due_date}
                onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))}
              />
            </label>
            <label>
              <span className="label">Status</span>
              <select
                className="select"
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label>
              <span className="label">Assignee</span>
              <select
                className="select"
                value={form.assigned_to_id ?? ""}
                onChange={(event) => {
                  const val = event.target.value;
                  setForm((current) => ({
                    ...current,
                    assigned_to_id: val ? Number(val) : null,
                  }));
                }}
              >
                <option value="">Me (Default)</option>
                {teamData?.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name || user.username} {user.last_name || ""}
                  </option>
                ))}
              </select>
            </label>

            {mutation.isError ? (
              <div className="chip chip-warning justify-center">
                Could not create task. Check the data and try again.
              </div>
            ) : null}

            <button type="submit" disabled={mutation.isPending} className="btn btn-primary w-full justify-center">
              {mutation.isPending ? "Creating..." : "Create task"}
            </button>

            <div className="surface-muted p-4 text-[12px] text-muted flex items-start gap-2">
              <CalendarDays className="w-4 h-4 mt-0.5 text-ink-2" />
              Tasks stay scoped to your team and can be reassigned to any active member.
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

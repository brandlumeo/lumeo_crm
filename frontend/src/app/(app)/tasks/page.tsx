"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CheckSquare, Plus, Search, Calendar, User, 
  MoreVertical, Edit2, Trash2, LayoutList, LayoutGrid, X,
  Clock, AlertCircle
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { createTask, fetchTeam, updateTask, deleteTask } from "@/lib/api";
import { useCurrentUser, useTaskPage } from "@/lib/queries";
import type { TaskInput, Task } from "@/lib/types";
import { formatDateTime, getDisplayName } from "@/lib/utils";
import { cn } from "@/lib/utils";

const statusTone: Record<string, string> = {
  todo: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  
  // View states
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  
  // Forms
  const [form, setForm] = useState<TaskInput>({
    title: "",
    due_date: "",
    status: "todo",
    assigned_to_id: null,
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: teamData } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
    enabled: !!me,
  });

  // Fetch max items for Kanban
  const { data, isLoading } = useTaskPage({
    page: 1,
    limit: 100, // Load up to 100 tasks for board view seamlessly
    search,
    status: status || undefined,
    ordering: "due_date",
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      toast.success("Task created successfully");
      setForm({ title: "", due_date: "", status: "todo", assigned_to_id: null });
      setIsDrawerOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.due_date?.[0] || err.response?.data?.detail || "Failed to create task");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      toast.success("Task updated");
      setIsDrawerOpen(false);
      setEditingTask(null);
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.due_date?.[0] || err.response?.data?.detail || "Failed to update task");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, deletedId) => {
      toast.success("Task deleted");
      setTaskToDelete(null);
      if (editingTask?.id === deletedId) {
        setIsDrawerOpen(false);
        setEditingTask(null);
      }
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: () => {
      toast.error("Failed to delete task");
      setTaskToDelete(null);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Task title is required");
    
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEditDrawer = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      due_date: task.due_date ? task.due_date.slice(0, 10) : "",
      status: task.status,
      assigned_to_id: task.assigned_to?.id || null,
    });
    setIsDrawerOpen(true);
  };

  const openCreateDrawer = () => {
    setEditingTask(null);
    setForm({ title: "", due_date: "", status: "todo", assigned_to_id: null });
    setIsDrawerOpen(true);
  };

  const handleStatusChange = (task: Task, newStatus: string) => {
    updateMutation.mutate({ id: task.id, payload: { status: newStatus as any } });
  };

  const rows = data?.results ?? [];

  // Group for kanban
  const columns = {
    todo: rows.filter(t => t.status === "todo"),
    in_progress: rows.filter(t => t.status === "in_progress"),
    done: rows.filter(t => t.status === "done")
  };

  return (
    <PageShell
      eyebrow="Tasks"
      title="What is on today."
      description="Stay organized with high-performance task management. Track progress visually across teams."
    >
      <div className="flex flex-col gap-6 h-full pb-8">
        
        {/* Toolbar */}
        <div className="bg-paper border border-line rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 animate-rise">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-[280px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input w-full pl-9 bg-bone/30 focus:bg-paper"
                placeholder="Search tasks..."
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="select w-[140px] bg-bone/30 focus:bg-paper"
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex bg-bone-2 p-1 rounded-lg border border-line shadow-inner">
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-white shadow-sm text-ink" : "text-muted hover:text-ink")}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "kanban" ? "bg-white shadow-sm text-ink" : "text-muted hover:text-ink")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            
            <button onClick={openCreateDrawer} className="btn bg-ink text-paper hover:bg-ink-2 shadow-sm font-medium gap-2">
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        </div>

        {/* Content */}
        {!mounted || (isLoading && !data) ? (
          <div className="flex-1 flex items-center justify-center text-muted">Loading workspace...</div>
        ) : rows.length === 0 ? (
          <div className="flex-1 bg-paper border border-line rounded-xl shadow-sm">
            <EmptyState
              icon={CheckSquare}
              title="No tasks found"
              description="Create a task or widen the current search filters."
            />
          </div>
        ) : viewMode === "list" ? (
          <div className="bg-paper border border-line rounded-xl shadow-sm overflow-hidden animate-fade-in flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-line bg-bone/50 text-muted/80 uppercase tracking-wider text-[11px] font-semibold">
                    <th className="px-5 py-3 w-[45%]">Task Title</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Assignee</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((task) => (
                    <tr key={task.id} className="group hover:bg-bone/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-ink cursor-pointer hover:text-accent transition-colors truncate max-w-[300px] xl:max-w-[450px]" onClick={() => openEditDrawer(task)}>
                          {task.title}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task, e.target.value)}
                          className={cn(
                            "appearance-none bg-transparent font-semibold text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-opacity outline-none",
                            statusTone[task.status]
                          )}
                        >
                          <option value="todo">To do</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-bone-2 border border-line flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-muted" />
                          </div>
                          <span className="text-muted text-[13px] truncate max-w-[120px]">
                            {getDisplayName(task.assigned_to)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-muted text-[13px]">
                          <Calendar className="w-3.5 h-3.5" />
                          {task.due_date ? formatDateTime(task.due_date) : "No date"}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditDrawer(task)} className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setTaskToDelete(task.id)} className="p-1.5 text-muted hover:text-rose-600 hover:bg-rose-50 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in flex-1 items-start">
            {/* Kanban Columns */}
            {[
              { id: "todo", title: "To Do", tasks: columns.todo, color: "border-amber-400" },
              { id: "in_progress", title: "In Progress", tasks: columns.in_progress, color: "border-blue-400" },
              { id: "done", title: "Done", tasks: columns.done, color: "border-emerald-400" }
            ].map(col => (
              <div key={col.id} className="bg-bone/30 rounded-xl border border-line p-3 min-h-[400px] flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full border-2", col.color)} />
                    <h3 className="font-semibold text-ink text-[14px]">{col.title}</h3>
                  </div>
                  <span className="bg-paper border border-line px-2 py-0.5 rounded text-xs text-muted font-medium">
                    {col.tasks.length}
                  </span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {col.tasks.map(task => (
                    <div key={task.id} className="bg-paper border border-line shadow-sm rounded-lg p-3 hover:shadow-md transition-shadow group cursor-pointer" onClick={() => openEditDrawer(task)}>
                      <h4 className="text-[13.5px] font-medium text-ink leading-snug mb-3">{task.title}</h4>
                      
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
                          {task.due_date && <><Calendar className="w-3.5 h-3.5" /> {new Date(task.due_date).toLocaleDateString()}</>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-bone-2 border border-line flex items-center justify-center" title={getDisplayName(task.assigned_to)}>
                            <User className="w-3 h-3 text-muted" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-out Drawer */}
      <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
          <Dialog.Content className="fixed right-0 top-0 h-full w-[400px] max-w-[90vw] bg-paper shadow-2xl z-50 border-l border-line flex flex-col animate-slide-in-right">
            
            <div className="flex items-center justify-between p-5 border-b border-line bg-bone/30">
              <Dialog.Title className="font-serif text-[20px] text-ink">
                {editingTask ? "Edit Task" : "New Task"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 text-muted hover:text-ink hover:bg-bone rounded transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Task Title *</label>
                  <textarea
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input w-full min-h-[80px] py-2 resize-none"
                    placeholder="E.g. Follow up with client regarding proposal..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="select w-full"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Due Date *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="input w-full"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-ink">Assign To</label>
                  <select
                    value={form.assigned_to_id || ""}
                    onChange={(e) => setForm({ ...form, assigned_to_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="select w-full"
                  >
                    <option value="">Unassigned</option>
                    {me && <option value={me.id}>Me ({me.email})</option>}
                    {teamData?.users?.map((u: any) => {
                      if (u.id === me?.id) return null;
                      return (
                        <option key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-line bg-bone/30 flex justify-between items-center">
              {editingTask ? (
                <button
                  type="button"
                  onClick={() => setTaskToDelete(editingTask.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 text-[13px] font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              ) : <div/>}
              <div className="flex items-center gap-3">
                <Dialog.Close asChild>
                  <button type="button" className="text-[13.5px] font-medium text-muted hover:text-ink px-3 py-2 transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  form="task-form"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn bg-ink text-paper hover:bg-ink-2 shadow-sm font-medium px-6 py-2"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Task"}
                </button>
              </div>
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmationModal
        open={taskToDelete !== null}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => taskToDelete && deleteMutation.mutate(taskToDelete)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </PageShell>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Task } from "@/lib/types";
import { getDisplayName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask } from "@/lib/api";
import { toast } from "sonner";

function TaskCard({ task, onEdit, isOverlay = false }: { task: Task; onEdit: (t: Task) => void; isOverlay?: boolean }) {
  return (
    <div 
      className={cn(
        "bg-paper border border-line shadow-sm rounded-lg p-3 transition-shadow group cursor-pointer",
        isOverlay ? "shadow-xl rotate-2 scale-105" : "hover:shadow-md active:cursor-grabbing"
      )}
      onClick={() => onEdit(task)}
    >
      <h4 className="text-[13.5px] font-medium text-ink leading-snug mb-3 pointer-events-none">{task.title}</h4>
      
      <div className="flex items-center justify-between mt-auto pointer-events-none">
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
          {task.due_date && <><Calendar className="w-3.5 h-3.5" /> {new Date(task.due_date).toLocaleDateString()}</>}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-bone-2 border border-line flex items-center justify-center" title={getDisplayName(task.assigned_to)}>
            <User className="w-3 h-3 text-muted" />
          </div>
        </div>
      </div>
      {task.created_at && (
        <div className="flex items-center gap-1 text-[10.5px] text-muted/60 mt-2 pt-2 border-t border-line/50 pointer-events-none">
          <Clock className="w-2.5 h-2.5" />
          Created {new Date(task.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      )}
    </div>
  );
}

function SortableTaskCard({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id.toString(),
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} />
    </div>
  );
}

function Column({ id, title, color, tasks, onEdit }: { id: string; title: string; color: string; tasks: Task[]; onEdit: (t: Task) => void }) {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: "Column",
      stage: id,
    },
  });

  return (
    <div className="bg-bone/30 rounded-xl border border-line p-3 min-h-[400px] flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full border-2", color)} />
          <h3 className="font-semibold text-ink text-[14px]">{title}</h3>
        </div>
        <span className="bg-paper border border-line px-2 py-0.5 rounded text-xs text-muted font-medium">
          {tasks.length}
        </span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 min-h-[150px] flex flex-col gap-3">
        <SortableContext items={tasks.map((t) => t.id.toString())} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onEdit={onEdit} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function TaskBoard({ tasks, onEditTask }: { tasks: Task[]; onEditTask: (t: Task) => void }) {
  const queryClient = useQueryClient();
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const updateMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
    onError: () => {
      toast.error("Failed to update task status");
      setLocalTasks(tasks); // revert on error
    }
  });

  const activeTask = localTasks.find((t) => t.id.toString() === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnsDef = [
    { id: "todo", title: "To Do", color: "border-amber-400" },
    { id: "in_progress", title: "In Progress", color: "border-blue-400" },
    { id: "done", title: "Done", color: "border-emerald-400" },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    if (activeIdStr === overIdStr) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    if (isOverTask) {
      const activeTask = localTasks.find(t => t.id.toString() === activeIdStr);
      const overTask = localTasks.find(t => t.id.toString() === overIdStr);
      
      if (!activeTask || !overTask) return;

      if (activeTask.status !== overTask.status) {
        setLocalTasks(prev => {
          const newTasks = [...prev];
          const activeIndex = newTasks.findIndex(t => t.id.toString() === activeIdStr);
          newTasks[activeIndex] = { ...newTasks[activeIndex], status: overTask.status };
          return newTasks;
        });
      }
    }

    if (isOverColumn) {
      const overColumnId = overIdStr;
      const activeTask = localTasks.find(t => t.id.toString() === activeIdStr);
      if (activeTask && activeTask.status !== overColumnId) {
        setLocalTasks(prev => {
          const newTasks = [...prev];
          const activeIndex = newTasks.findIndex(t => t.id.toString() === activeIdStr);
          newTasks[activeIndex] = { ...newTasks[activeIndex], status: overColumnId as any };
          return newTasks;
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeTask = localTasks.find(t => t.id.toString() === active.id.toString());
    const originalTask = tasks.find(t => t.id === activeTask?.id);

    if (activeTask && originalTask && activeTask.status !== originalTask.status) {
      updateMutation.mutate({ id: activeTask.id, payload: { status: activeTask.status } });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in flex-1 items-start">
        {columnsDef.map(col => {
          const colTasks = localTasks.filter(t => t.status === col.id);
          return (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              color={col.color}
              tasks={colTasks}
              onEdit={onEditTask}
            />
          );
        })}
      </div>
      
      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
        {activeTask ? <TaskCard task={activeTask} onEdit={() => {}} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

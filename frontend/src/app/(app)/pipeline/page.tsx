"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers3,
  List,
  Plus,
  X,
  Trophy,
  TrendingUp,
  GripVertical,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

import { useAllDealsBoard } from "@/lib/queries";
import { createDeal, reorderDeals } from "@/lib/api";
import type { Deal, DealInput } from "@/lib/types";
import {
  formatCompactINR,
  formatINR,
  formatShortDate,
  getInitials,
  toNumber,
} from "@/lib/utils";

// ── Stage definitions ──────────────────────────────────────────────────────────

const STAGES = [
  {
    key: "prospect",
    label: "Prospect",
    icon: "○",
    color: "#8B8580",
    headerBg: "bg-bone",
    topBar: "bg-[#8B8580]",
    colBg: "bg-bone-2",
    cardBg: "bg-paper",
    cardBorder: "border-line",
  },
  {
    key: "qualified",
    label: "Qualified",
    icon: "◈",
    color: "#3B82F6",
    headerBg: "bg-blue-50 dark:bg-blue-900/20",
    topBar: "bg-blue-400",
    colBg: "bg-blue-50/40 dark:bg-blue-900/10",
    cardBg: "bg-paper",
    cardBorder: "border-blue-100 dark:border-blue-900/30",
  },
  {
    key: "proposal",
    label: "Proposal",
    icon: "⬡",
    color: "#D97706",
    headerBg: "bg-amber-50 dark:bg-amber-900/20",
    topBar: "bg-amber-400",
    colBg: "bg-amber-50/40 dark:bg-amber-900/10",
    cardBg: "bg-paper",
    cardBorder: "border-amber-100 dark:border-amber-900/30",
  },
  {
    key: "negotiation",
    label: "Negotiation",
    icon: "◎",
    color: "#7C3AED",
    headerBg: "bg-violet-50 dark:bg-violet-900/20",
    topBar: "bg-violet-400",
    colBg: "bg-violet-50/40 dark:bg-violet-900/10",
    cardBg: "bg-paper",
    cardBorder: "border-violet-100 dark:border-violet-900/30",
  },
  {
    key: "won",
    label: "Won",
    icon: "✓",
    color: "#16A34A",
    headerBg: "bg-green-50 dark:bg-green-900/20",
    topBar: "bg-green-400",
    colBg: "bg-green-50/40 dark:bg-green-900/10",
    cardBg: "bg-green-50 dark:bg-green-900/20",
    cardBorder: "border-green-200 dark:border-green-900/30",
  },
  {
    key: "lost",
    label: "Lost",
    icon: "✕",
    color: "#9CA3AF",
    headerBg: "bg-gray-50 dark:bg-gray-800/30",
    topBar: "bg-gray-300 dark:bg-gray-600",
    colBg: "bg-gray-50/40 dark:bg-gray-800/20",
    cardBg: "bg-gray-50 dark:bg-gray-800/40",
    cardBorder: "border-gray-200 dark:border-gray-700/50",
  },
] as const;

type StageKey = (typeof STAGES)[number]["key"];
type StageMeta = (typeof STAGES)[number];
type StageBoards = Record<StageKey, Deal[]>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildBoards(deals: Deal[]): StageBoards {
  const boards = Object.fromEntries(
    STAGES.map((s) => [s.key, [] as Deal[]])
  ) as unknown as StageBoards;
  for (const deal of deals) {
    const key = deal.stage as StageKey;
    if (key in boards) boards[key].push(deal);
    else boards["prospect"].push(deal);
  }
  for (const stage of Object.keys(boards) as StageKey[]) {
    boards[stage].sort((a, b) => (a.row_order ?? 0) - (b.row_order ?? 0));
  }
  return boards;
}

function stageTotal(deals: Deal[]) {
  return deals.reduce((sum, d) => sum + toNumber(d.amount), 0);
}

function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-ink text-paper font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      title={name}
    >
      {getInitials(name).slice(0, 2)}
    </span>
  );
}

// ── Deal Card ──────────────────────────────────────────────────────────────────

function DealCard({ deal, stage, isOverlay = false }: { deal: Deal; stage: StageMeta; isOverlay?: boolean }) {
  const isWon = deal.stage === "won";
  const isLost = deal.stage === "lost";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: "Deal",
      deal,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 border-2 border-dashed border-ink/20 rounded-xl mb-2 min-h-[100px] bg-ink/5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "group relative border rounded-xl p-3.5 mb-2 select-none touch-none",
        "transition-shadow duration-150",
        stage.cardBg,
        stage.cardBorder,
        isOverlay ? "shadow-2xl scale-105 rotate-2 cursor-grabbing" : "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/8 cursor-grab active:cursor-grabbing",
        isLost ? "opacity-60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
        <GripVertical className="w-3.5 h-3.5 text-muted" />
      </div>

      <div className="flex items-start gap-2 mb-2.5 pr-5">
        <span
          className="w-[22px] h-[22px] rounded-md grid place-items-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
          style={{ background: stage.color }}
        >
          {getInitials(deal.title).slice(0, 1)}
        </span>
        <div
          className={[
            "text-[13px] font-semibold leading-snug transition-colors",
            isLost ? "line-through text-muted" : "text-ink hover:text-accent",
          ].join(" ")}
        >
          {deal.title}
        </div>
      </div>

      <div
        className={[
          "font-serif text-[20px] leading-none mb-3",
          isLost ? "text-muted" : "text-ink",
        ].join(" ")}
      >
        {formatINR(toNumber(deal.amount))}
      </div>

      <div className="flex items-center justify-between">
        <span className="chip text-[10px] px-1.5 py-0.5">
          {formatShortDate(deal.created_at)}
        </span>
        <div className="flex items-center gap-1">
          {isWon && <Trophy className="w-3 h-3 text-green-500" />}
          {deal.assigned_to && (
            <Avatar
              name={deal.assigned_to.first_name || deal.assigned_to.username}
              size={20}
            />
          )}
        </div>
      </div>

      {isWon && (
        <div className="absolute inset-0 rounded-xl pointer-events-none bg-gradient-to-br from-green-200/20 to-transparent" />
      )}
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────

import { useDroppable } from "@dnd-kit/core";

function KanbanColumn({
  stage,
  deals,
  onAddClick,
}: {
  stage: StageMeta;
  deals: Deal[];
  onAddClick: (key: StageKey) => void;
}) {
  const total = stageTotal(deals);

  const { setNodeRef, isOver } = useDroppable({
    id: stage.key,
    data: {
      type: "Column",
      stage,
    },
  });

  return (
    <div className="flex flex-col min-w-[250px] w-[260px] flex-shrink-0">
      <div className={`rounded-xl border border-line overflow-hidden mb-2 ${stage.headerBg}`}>
        <div className={`h-1 w-full ${stage.topBar}`} />
        <div className="px-3.5 pt-3 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[15px]" style={{ color: stage.color }}>
                {stage.icon}
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ color: stage.color }}
              >
                {stage.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${stage.color}18`, color: stage.color }}
              >
                {deals.length}
              </span>
              <button
                onClick={() => onAddClick(stage.key as StageKey)}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-opacity opacity-50 hover:opacity-100"
                style={{ background: `${stage.color}22`, color: stage.color }}
                title={`Add deal to ${stage.label}`}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          {total > 0 && (
            <div
              className="text-[11px] font-mono mt-1.5 opacity-70"
              style={{ color: stage.color }}
            >
              {formatCompactINR(total)}
            </div>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={[
          "flex-1 min-h-[480px] rounded-xl transition-all duration-150 p-2 flex flex-col",
          stage.colBg,
          isOver ? "scale-[1.01]" : "",
        ].join(" ")}
        style={
          isOver
            ? { outline: `2px solid ${stage.color}`, outlineOffset: "2px" }
            : {}
        }
      >
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              stage={stage}
            />
          ))}
        </SortableContext>
        
        {deals.length === 0 && !isOver && (
          <div
            className="h-full min-h-[120px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 opacity-40 cursor-default"
            style={{ borderColor: stage.color }}
          >
            <span className="text-2xl opacity-60">{stage.icon}</span>
            <span className="text-[11px] font-medium" style={{ color: stage.color }}>
              Drop here
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Deal Modal ─────────────────────────────────────────────────────────────

function NewDealModal({
  defaultStage,
  onClose,
  onSuccess,
}: {
  defaultStage: StageKey;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DealInput>({
    title: "",
    amount: "",
    stage: defaultStage,
  });

  const mutation = useMutation({
    mutationFn: createDeal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-counts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-bundle"] });
      onSuccess();
    },
  });

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-2xl border border-line w-full max-w-md mx-4 shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-line-2">
          <div>
            <h2 className="font-serif text-[22px]">New Deal</h2>
            <p className="text-[12px] text-muted mt-0.5">Add a deal to your pipeline</p>
          </div>
          <button onClick={onClose} className="btn p-1.5" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <label>
            <span className="label">Deal title</span>
            <input
              required
              autoFocus
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Annual Enterprise Rollout"
            />
          </label>

          <label>
            <span className="label">Amount (₹)</span>
            <input
              required
              className="input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="250000"
            />
          </label>

          <label>
            <span className="label">Starting stage</span>
            <select
              className="select"
              value={form.stage}
              onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            >
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {mutation.isError && (
            <div className="chip chip-warning justify-center w-full text-center">
              Could not create deal. Check your data and try again.
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn flex-1 justify-center">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary flex-1 justify-center"
            >
              {mutation.isPending ? "Creating…" : "Create deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Board Page ─────────────────────────────────────────────────────────────────

export default function DealsBoardPage() {
  const queryClient = useQueryClient();
  const { data: allDeals, isLoading } = useAllDealsBoard();

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addStage, setAddStage] = useState<StageKey>("prospect");

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [boards, setBoards] = useState<StageBoards>(() => buildBoards([]));
  const prevDealsRef = useRef<Deal[]>([]);

  useEffect(() => {
    if (allDeals && allDeals !== prevDealsRef.current) {
      prevDealsRef.current = allDeals;
      setBoards(buildBoards(allDeals));
    }
  }, [allDeals]);

  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const reorderMutation = useMutation({
    mutationFn: reorderDeals,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      void queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragStart = (event: any) => {
    const { active } = event;
    if (active.data.current?.type === "Deal") {
      setActiveDeal(active.data.current.deal);
    }
  };

  const onDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveDeal = active.data.current?.type === "Deal";
    const isOverDeal = over.data.current?.type === "Deal";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveDeal) return;

    setBoards((prev) => {
      const activeDeal = active.data.current?.deal as Deal;
      const activeStage = activeDeal.stage as StageKey;
      let overStage: StageKey;

      if (isOverColumn) {
        overStage = over.id as StageKey;
      } else if (isOverDeal) {
        overStage = over.data.current?.deal.stage as StageKey;
      } else {
        return prev;
      }

      if (activeStage === overStage) return prev;

      const next = { ...prev };
      next[activeStage] = next[activeStage].filter(d => d.id !== activeId);
      
      const newDeal = { ...activeDeal, stage: overStage };
      
      if (isOverDeal) {
        const overIndex = next[overStage].findIndex(d => d.id === overId);
        const newIndex = overIndex >= 0 ? overIndex + (active.rect.current.translated?.top > over.rect.top + over.rect.height / 2 ? 1 : 0) : next[overStage].length;
        next[overStage] = [
          ...next[overStage].slice(0, newIndex),
          newDeal,
          ...next[overStage].slice(newIndex)
        ];
      } else {
        next[overStage] = [newDeal, ...next[overStage]];
      }

      if (active.data.current) active.data.current.deal = newDeal;
      return next;
    });
  };

  const onDragEnd = (event: any) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeDeal = active.data.current?.deal as Deal;
    const overStage = (over.data.current?.type === "Column" ? over.id : over.data.current?.deal.stage) as StageKey;

    setBoards(prev => {
      const stage = activeDeal.stage as StageKey;
      const activeIndex = prev[stage].findIndex(d => d.id === activeId);
      const overIndex = prev[stage].findIndex(d => d.id === overId);
      
      let next = { ...prev };
      if (activeIndex !== overIndex && overIndex !== -1 && stage === overStage) {
         next[stage] = arrayMove(next[stage], activeIndex, overIndex);
      }

      const payload: { id: number; stage: string; row_order: number }[] = [];
      Object.keys(next).forEach(st => {
         next[st as StageKey].forEach((deal, idx) => {
             payload.push({ id: deal.id, stage: st, row_order: idx });
         });
      });
      reorderMutation.mutate({ deals: payload });

      return next;
    });
  };

  const filteredBoards = useMemo<StageBoards>(() => {
    if (!search.trim()) return boards;
    const q = search.toLowerCase();
    return Object.fromEntries(
      (Object.entries(boards) as [StageKey, Deal[]][]).map(([stage, deals]) => [
        stage,
        deals.filter((d) => d.title.toLowerCase().includes(q)),
      ])
    ) as StageBoards;
  }, [boards, search]);

  const allDealsFlat = useMemo(() => (Object.values(boards) as Deal[][]).flat(), [boards]);
  const activeDeals = useMemo(() => allDealsFlat.filter((d) => d.stage !== "lost"), [allDealsFlat]);
  const pipelineValue = useMemo(() => stageTotal(activeDeals), [activeDeals]);
  const wonValue = useMemo(() => stageTotal(boards.won ?? []), [boards]);
  const totalCount = allDealsFlat.length;
  const wonCount = boards.won?.length ?? 0;

  return (
    <>
      <div className="flex flex-col min-h-screen bg-bone">
        <div className="p-4 md:px-6 md:pt-6 md:pb-5 flex-shrink-0">
          <div className="flex items-center gap-2 text-[12px] text-muted mb-3">
            <Link href="/deals" className="hover:text-ink flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Deals list
            </Link>
            <span>/</span>
            <span className="text-ink font-medium">Board</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-[28px] leading-none">Pipeline Board</h1>
              <p className="text-muted text-[13px] mt-1">
                Drag cards between stages · {totalCount} deal{totalCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="input !w-[200px]" placeholder="Search deals…" />
              <Link href="/deals" className="btn">
                <List className="w-4 h-4" />
                List view
              </Link>
              <button onClick={() => { setAddStage("prospect"); setShowAdd(true); }} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                New Deal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Pipeline", icon: <TrendingUp className="w-3 h-3" />, value: formatCompactINR(pipelineValue), color: "text-ink" },
              { label: "Won", icon: <Trophy className="w-3 h-3 text-green-500" />, value: formatCompactINR(wonValue), color: "text-green-600" },
              { label: "Open Deals", icon: <Layers3 className="w-3 h-3" />, value: String(activeDeals.length), color: "text-ink" },
              { label: "Win Rate", icon: null, value: totalCount > 0 ? `${Math.round((wonCount / totalCount) * 100)}%` : "—", color: wonCount > 0 ? "text-green-600" : "text-ink" },
            ].map((stat) => (
              <div key={stat.label} className="card px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted mb-1 flex items-center gap-1">
                  {stat.icon}
                  {stat.label}
                </div>
                <div className={`font-serif text-[20px] leading-none ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {totalCount > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden mt-4 gap-px">
              {STAGES.map((s) => {
                const count = boards[s.key as StageKey]?.length ?? 0;
                const pct = (count / totalCount) * 100;
                return pct > 0 ? <div key={s.key} style={{ width: `${pct}%`, background: s.color }} title={`${s.label}: ${count}`} className="transition-all duration-500" /> : null;
              })}
            </div>
          )}
        </div>

        {!isMounted || isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Layers3 className="w-8 h-8 text-muted animate-pulse" />
              <p className="text-muted text-sm">Loading pipeline…</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 px-4 md:px-6 pb-8 overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            >
              <div className="flex gap-3 min-w-max">
                {STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    deals={filteredBoards[stage.key as StageKey] ?? []}
                    onAddClick={(key) => { setAddStage(key); setShowAdd(true); }}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeDeal ? (
                  <DealCard deal={activeDeal} stage={STAGES.find(s => s.key === activeDeal.stage) as StageMeta} isOverlay />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {showAdd && <NewDealModal defaultStage={addStage} onClose={() => setShowAdd(false)} onSuccess={() => setShowAdd(false)} />}
    </>
  );
}

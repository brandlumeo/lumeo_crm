"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Layers3, ListFilter } from "lucide-react";
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

import { EmptyState } from "@/components/empty-state";
import { useReorderDeals } from "@/lib/queries";
import type { Deal } from "@/lib/types";
import { formatCompactINR, formatINR, formatShortDate, getInitials, toNumber } from "@/lib/utils";

import { useCurrentCompany } from "@/lib/queries";

function getStageLabel(stage: string, company: any) {
  if (!company?.deal_pipelines) return stage;
  const found = company.deal_pipelines.find((s: any) => s.name.toLowerCase() === stage);
  return found ? found.name : stage;
}

function getStageColor(stage: string, company: any) {
  if (!company?.deal_pipelines) return "bg-muted";
  const found = company.deal_pipelines.find((s: any) => s.name.toLowerCase() === stage);
  return found ? found.color : "bg-muted";
}

function DealCard({ deal, isOverlay = false }: { deal: Deal; isOverlay?: boolean }) {
  const { data: company } = useCurrentCompany();
  
  return (
    <div
      className={`border rounded-xl p-3.5 mb-3 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-grab active:cursor-grabbing ${
        deal.stage === "won"
          ? "bg-[#F3F8F1] border-[#BFD9B3]"
          : "bg-paper border-line hover:border-ink hover:bg-bone"
      } ${isOverlay ? "shadow-2xl rotate-3 scale-105" : "hover:-translate-y-1 hover:shadow-lg hover:shadow-ink/5"}`}
    >
      <div className="text-[13px] font-medium mb-1 flex items-center gap-1.5 pointer-events-none">
        <span className="w-[18px] h-[18px] rounded grid place-items-center text-white text-[10px] font-semibold bg-ink shrink-0">
          {getInitials(deal.title).slice(0, 1)}
        </span>
        <span className="truncate">{deal.title}</span>
      </div>
      <div className="font-serif text-[22px] leading-none my-2 pointer-events-none">
        {formatINR(toNumber(deal.amount))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted pointer-events-none">
        <span className="chip">{formatShortDate(deal.created_at)}</span>
        <span className="font-mono text-[10px] text-muted">
          {getStageLabel(deal.stage, company)}
        </span>
      </div>
    </div>
  );
}

function SortableDealCard({ deal }: { deal: Deal }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id.toString(),
    data: {
      type: "Deal",
      deal,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} />
    </div>
  );
}

function Column({ stage, deals }: { stage: string; deals: Deal[] }) {
  const { data: company } = useCurrentCompany();
  const { setNodeRef } = useDroppable({
    id: stage,
    data: {
      type: "Column",
      stage,
    },
  });

  const stageValue = deals.reduce((sum, deal) => sum + toNumber(deal.amount), 0);
  const color = getStageColor(stage, company);
  
  return (
    <div className="bg-paper p-3.5 min-h-[320px] min-w-[210px] flex flex-col">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-dashed border-line">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] font-semibold">
          <span 
            className="w-2 h-2 rounded-full" 
            style={color.startsWith("#") ? { backgroundColor: color } : {}}
            {...(color.startsWith("#") ? {} : { className: `w-2 h-2 rounded-full ${color}` })}
          />
          {getStageLabel(stage, company)}
        </div>
        <div className="font-mono text-[11px] text-muted">
          {deals.length} | {formatCompactINR(stageValue)}
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 min-h-[150px]">
        <SortableContext items={deals.map((d) => d.id.toString())} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function PipelineBoard({ deals }: { deals: Deal[] }) {
  const { data: company } = useCurrentCompany();
  const dynamicStages = company?.deal_pipelines?.map((s: any) => s.name.toLowerCase()) || [];
  const [view, setView] = useState<"board" | "list" | "forecast">("board");
  
  const [filterSearch, setFilterSearch] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState<number | "">("");
  const [filterDays, setFilterDays] = useState<number | "">("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { mutate: reorderDeals } = useReorderDeals();

  const [localDeals, setLocalDeals] = useState<Deal[]>(deals);
  useEffect(() => {
    // Sync external changes (like new deals created via form)
    setLocalDeals(deals);
  }, [deals]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeDeals = useMemo(() => {
    let result = localDeals.filter((deal) => dynamicStages.includes(deal.stage));
    
    if (filterSearch) {
      const lowerSearch = filterSearch.toLowerCase();
      result = result.filter((d) => d.title.toLowerCase().includes(lowerSearch));
    }
    if (filterMinAmount !== "") {
      result = result.filter((d) => toNumber(d.amount) >= Number(filterMinAmount));
    }
    if (filterDays !== "") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(filterDays));
      result = result.filter((d) => new Date(d.created_at) >= cutoff);
    }
    
    // Sort by row_order so they appear correctly initially
    result.sort((a, b) => (a.row_order || 0) - (b.row_order || 0));
    
    return result;
  }, [localDeals, filterSearch, filterMinAmount, filterDays, dynamicStages]);

  const openValue = activeDeals
    .filter((deal) => deal.stage !== "won")
    .reduce((sum, deal) => sum + toNumber(deal.amount), 0);

  const hasActiveFilters = filterSearch || filterMinAmount !== "" || filterDays !== "";

  // DnD logic
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeDeal = useMemo(
    () => localDeals.find((d) => d.id.toString() === activeId),
    [activeId, localDeals]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id.toString());
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id.toString();
    const overIdStr = over.id.toString();

    if (activeIdStr === overIdStr) return;

    const isActiveADeal = active.data.current?.type === "Deal";
    const isOverAColumn = over.data.current?.type === "Column";
    const isOverADeal = over.data.current?.type === "Deal";

    if (!isActiveADeal) return;

    setLocalDeals((prev) => {
      const activeIndex = prev.findIndex((d) => d.id.toString() === activeIdStr);
      if (activeIndex === -1) return prev;

      if (isOverAColumn) {
        const overStage = overIdStr;
        if (prev[activeIndex].stage !== overStage) {
          const newDeals = [...prev];
          newDeals[activeIndex] = { ...newDeals[activeIndex], stage: overStage };
          return newDeals;
        }
      }

      if (isOverADeal) {
        const overIndex = prev.findIndex((d) => d.id.toString() === overIdStr);
        if (overIndex === -1) return prev;

        if (prev[activeIndex].stage !== prev[overIndex].stage) {
          const newDeals = [...prev];
          newDeals[activeIndex] = { ...newDeals[activeIndex], stage: newDeals[overIndex].stage };
          return arrayMove(newDeals, activeIndex, overIndex);
        }
      }

      return prev;
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    setLocalDeals((prev) => {
      const activeIndex = prev.findIndex((d) => d.id.toString() === active.id.toString());
      const overIndex = prev.findIndex((d) => d.id.toString() === over.id.toString());

      let finalDeals = prev;
      if (active.data.current?.type === "Deal" && over.data.current?.type === "Deal") {
        if (activeIndex !== overIndex) {
          finalDeals = arrayMove(prev, activeIndex, overIndex);
        }
      }

      // Dispatch mutation with final order for the affected stage
      const movedDeal = finalDeals.find((d) => d.id.toString() === active.id.toString());
      if (movedDeal) {
        const stageDeals = finalDeals.filter((d) => d.stage === movedDeal.stage);
        const reorderedPayload = stageDeals.map((d, index) => ({
          id: d.id,
          stage: d.stage,
          row_order: index,
        }));
        reorderDeals({ deals: reorderedPayload });
      }

      return finalDeals;
    });
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.4",
        },
      },
    }),
  };

  return (
    <div className="card mb-6 animate-rise !overflow-visible">
      <div className="card-head">
        <div className="card-title">
          Pipeline
          <span className="card-title-meta">
            {activeDeals.length} deals, {formatCompactINR(openValue)}
          </span>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="seg">
            {(["board", "list", "forecast"] as const).map((option) => (
              <button
                key={option}
                className={view === option ? "on" : ""}
                onClick={() => setView(option)}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative" ref={filterRef}>
            <button 
              type="button" 
              className={`btn px-2.5 py-1 text-xs ${filterOpen ? "bg-bone-2" : ""}`}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <ListFilter className="w-3 h-3" />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent ml-0.5" />
              )}
            </button>
            
            {filterOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] bg-paper border border-line rounded-xl shadow-lg p-4 z-[100] animate-rise flex flex-col gap-4 text-left font-sans">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-[13px]">Filter Deals</span>
                  {hasActiveFilters && (
                    <button 
                      onClick={() => { setFilterSearch(""); setFilterMinAmount(""); setFilterDays(""); }}
                      className="text-[11px] text-muted hover:text-ink transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1.5">Search by Name</label>
                  <input 
                    type="text" 
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="e.g. Acme Corp..."
                    className="w-full bg-bone border border-line rounded px-2.5 py-1.5 text-[13px] outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1.5">Minimum Amount (₹)</label>
                  <input 
                    type="number" 
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0"
                    className="w-full bg-bone border border-line rounded px-2.5 py-1.5 text-[13px] outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1.5">Created Within</label>
                  <select 
                    value={filterDays}
                    onChange={(e) => setFilterDays(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-bone border border-line rounded px-2.5 py-1.5 text-[13px] outline-none focus:border-ink appearance-none transition-colors"
                  >
                    <option value="">Any time</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeDeals.length === 0 ? (
        <EmptyState
          icon={Layers3}
          title="No deals in the pipeline"
          description="Create deals from the deals page and Lumeo will start rendering pipeline value and stage movement here."
        />
      ) : view === "board" ? (
        <div className="overflow-x-auto select-none">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            <div className="flex flex-row gap-px bg-line-2 min-w-max">
              {dynamicStages.map((stage: string) => {
                const stageDeals = activeDeals.filter((deal) => deal.stage === stage);
                return <Column key={stage} stage={stage} deals={stageDeals} />;
              })}
            </div>
            <DragOverlay dropAnimation={dropAnimation}>
              {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : view === "list" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-line-2 text-left">
                {["Deal", "Stage", "Amount", "Created"].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-[11px] uppercase tracking-[0.12em] text-muted font-medium"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDeals.map((deal) => (
                <tr
                  key={deal.id}
                  className="border-b border-line-2 last:border-b-0 hover:bg-bone-2/60 transition-colors"
                >
                  <td className="px-5 py-4 font-medium text-ink">{deal.title}</td>
                  <td className="px-5 py-4">
                    <span className="chip">{getStageLabel(deal.stage, company)}</span>
                  </td>
                  <td className="px-5 py-4 font-serif text-[18px] text-ink">
                    {formatINR(toNumber(deal.amount))}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {formatShortDate(deal.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-px bg-line-2 overflow-x-auto">
          {dynamicStages.map((stage: string, index: number) => {
            const stageDeals = activeDeals.filter((deal) => deal.stage === stage);
            const stageValue = stageDeals.reduce(
              (sum, deal) => sum + toNumber(deal.amount),
              0,
            );
            // Compute a simple linear weight based on stage position
            const weight = (index + 1) / dynamicStages.length;
            const weightedValue = stageValue * weight;

            return (
              <div key={stage} className="bg-paper p-5">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted mb-2">
                  {getStageLabel(stage, company)}
                </div>
                <div className="font-serif text-[28px] leading-none mb-2">
                  {formatCompactINR(stageValue)}
                </div>
                <div className="text-[12px] text-muted mb-1">
                  {stageDeals.length} deals
                </div>
                <div className="chip chip-positive">
                  Weighted {formatCompactINR(weightedValue)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

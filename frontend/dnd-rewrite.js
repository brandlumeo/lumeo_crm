const fs = require('fs');

const original = fs.readFileSync('c:/Users/MUHAMMAD SHAMIL CV/PycharmProjects/crm-saas/frontend/src/app/(app)/pipeline/page.tsx', 'utf8');

let newContent = original.replace(
  /import \{ useState, useCallback, useMemo, useRef, useEffect \} from "react";/,
  `import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
import { CSS } from "@dnd-kit/utilities";`
);

// We'll replace the DealCard
newContent = newContent.replace(
  /function DealCard\([\s\S]*?\/\/ ── Kanban Column ──────────────────────────────────────────────────────────────/,
  `function DealCard({ deal, stage, isOverlay = false }: { deal: Deal; stage: StageMeta; isOverlay?: boolean }) {
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

// ── Kanban Column ──────────────────────────────────────────────────────────────`
);

// We'll replace KanbanColumn
newContent = newContent.replace(
  /function KanbanColumn\([\s\S]*?\/\/ ── New Deal Modal ─────────────────────────────────────────────────────────────/,
  `import { useDroppable } from "@dnd-kit/core";

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
      <div className={\`rounded-xl border border-line overflow-hidden mb-2 \${stage.headerBg}\`}>
        <div className={\`h-1 w-full \${stage.topBar}\`} />
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
                style={{ background: \`\${stage.color}18\`, color: stage.color }}
              >
                {deals.length}
              </span>
              <button
                onClick={() => onAddClick(stage.key as StageKey)}
                className="w-5 h-5 rounded-full flex items-center justify-center transition-opacity opacity-50 hover:opacity-100"
                style={{ background: \`\${stage.color}22\`, color: stage.color }}
                title={\`Add deal to \${stage.label}\`}
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
            ? { outline: \`2px solid \${stage.color}\`, outlineOffset: "2px" }
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

// ── New Deal Modal ─────────────────────────────────────────────────────────────`
);

// We'll replace the Board Page implementation
newContent = newContent.replace(
  /\/\/ ── Board Page ─────────────────────────────────────────────────────────────────[\s\S]*/,
  `// ── Board Page ─────────────────────────────────────────────────────────────────

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
      <div className="flex flex-col min-h-screen bg-[#F4EFE6]">
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
              { label: "Win Rate", icon: null, value: totalCount > 0 ? \`\${Math.round((wonCount / totalCount) * 100)}%\` : "—", color: wonCount > 0 ? "text-green-600" : "text-ink" },
            ].map((stat) => (
              <div key={stat.label} className="card px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-muted mb-1 flex items-center gap-1">
                  {stat.icon}
                  {stat.label}
                </div>
                <div className={\`font-serif text-[20px] leading-none \${stat.color}\`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {totalCount > 0 && (
            <div className="flex h-1.5 rounded-full overflow-hidden mt-4 gap-px">
              {STAGES.map((s) => {
                const count = boards[s.key as StageKey]?.length ?? 0;
                const pct = (count / totalCount) * 100;
                return pct > 0 ? <div key={s.key} style={{ width: \`\${pct}%\`, background: s.color }} title={\`\${s.label}: \${count}\`} className="transition-all duration-500" /> : null;
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

              <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ sideEffects: defaultDropAnimationSideEffects.sideEffects })}>
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
`
);

fs.writeFileSync('c:/Users/MUHAMMAD SHAMIL CV/PycharmProjects/crm-saas/frontend/src/app/(app)/pipeline/page.tsx', newContent);

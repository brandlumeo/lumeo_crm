import sys
import re

filepath = "app/(app)/pipeline/page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Add useCurrentCompany import
if "useCurrentCompany" not in content:
    content = content.replace(
        'import { useAllDealsBoard } from "@/lib/queries";',
        'import { useAllDealsBoard, useCurrentCompany } from "@/lib/queries";'
    )

# Replace STAGES constant with getDynamicStages
old_stages = """const STAGES = [
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
}"""

new_stages = """function getDynamicStages(company: any) {
  if (!company?.deal_pipelines || company.deal_pipelines.length === 0) {
    return [
      { key: "prospect", label: "Prospect", icon: "○", color: "#8B8580", headerBg: "bg-bone", topBar: "bg-[#8B8580]", colBg: "bg-bone-2", cardBg: "bg-paper", cardBorder: "border-line" },
      { key: "qualified", label: "Qualified", icon: "◈", color: "#3B82F6", headerBg: "bg-blue-50 dark:bg-blue-900/20", topBar: "bg-blue-400", colBg: "bg-blue-50/40 dark:bg-blue-900/10", cardBg: "bg-paper", cardBorder: "border-blue-100 dark:border-blue-900/30" },
      { key: "proposal", label: "Proposal", icon: "⬡", color: "#D97706", headerBg: "bg-amber-50 dark:bg-amber-900/20", topBar: "bg-amber-400", colBg: "bg-amber-50/40 dark:bg-amber-900/10", cardBg: "bg-paper", cardBorder: "border-amber-100 dark:border-amber-900/30" },
      { key: "negotiation", label: "Negotiation", icon: "◎", color: "#7C3AED", headerBg: "bg-violet-50 dark:bg-violet-900/20", topBar: "bg-violet-400", colBg: "bg-violet-50/40 dark:bg-violet-900/10", cardBg: "bg-paper", cardBorder: "border-violet-100 dark:border-violet-900/30" },
      { key: "won", label: "Won", icon: "✓", color: "#16A34A", headerBg: "bg-green-50 dark:bg-green-900/20", topBar: "bg-green-400", colBg: "bg-green-50/40 dark:bg-green-900/10", cardBg: "bg-green-50 dark:bg-green-900/20", cardBorder: "border-green-200 dark:border-green-900/30" },
      { key: "lost", label: "Lost", icon: "✕", color: "#9CA3AF", headerBg: "bg-gray-50 dark:bg-gray-800/30", topBar: "bg-gray-300 dark:bg-gray-600", colBg: "bg-gray-50/40 dark:bg-gray-800/20", cardBg: "bg-gray-50 dark:bg-gray-800/40", cardBorder: "border-gray-200 dark:border-gray-700/50" },
    ];
  }

  return company.deal_pipelines.map((stage: any) => ({
    key: stage.name.toLowerCase(),
    label: stage.name,
    icon: "○",
    color: stage.color || "#8B8580",
    headerBg: "bg-bone",
    topBar: "bg-[#8B8580]",
    colBg: "bg-bone-2",
    cardBg: "bg-paper",
    cardBorder: "border-line",
  }));
}

type StageKey = string;
type StageMeta = any;
type StageBoards = Record<StageKey, Deal[]>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildBoards(deals: Deal[], stages: any[]): StageBoards {
  const boards = Object.fromEntries(
    stages.map((s) => [s.key, [] as Deal[]])
  ) as unknown as StageBoards;
  for (const deal of deals) {
    const key = deal.stage as StageKey;
    if (key in boards) boards[key].push(deal);
    else if (stages.length > 0) boards[stages[0].key].push(deal);
  }
  for (const stage of Object.keys(boards) as StageKey[]) {
    boards[stage].sort((a, b) => (a.row_order ?? 0) - (b.row_order ?? 0));
  }
  return boards;
}"""

content = content.replace(old_stages, new_stages)

# Update NewDealModal to use dynamic stages
content = content.replace(
    'function NewDealModal({',
    'function NewDealModal({\n  stages,'
)
content = content.replace(
    'defaultStage: StageKey;',
    'defaultStage: StageKey;\n  stages: any[];'
)
content = content.replace(
    '{STAGES.map((s) => (',
    '{stages.map((s) => ('
)
content = content.replace(
    'stage={STAGES.find(s => s.key === activeDeal.stage) as StageMeta}',
    'stage={dynamicStages.find((s: any) => s.key === activeDeal.stage) as StageMeta}'
)


# Update DealsBoardPage to pass stages
content = content.replace(
    'export default function DealsBoardPage() {',
    'export default function DealsBoardPage() {\n  const { data: company } = useCurrentCompany();\n  const dynamicStages = useMemo(() => getDynamicStages(company), [company]);'
)
content = content.replace(
    'const [boards, setBoards] = useState<StageBoards>(() => buildBoards([]));',
    'const [boards, setBoards] = useState<StageBoards>(() => buildBoards([], dynamicStages));'
)
content = content.replace(
    'setBoards(buildBoards(allDeals));',
    'setBoards(buildBoards(allDeals, dynamicStages));'
)
content = content.replace(
    '{STAGES.map((s) => {',
    '{dynamicStages.map((s: any) => {'
)
content = content.replace(
    '{STAGES.map((stage) => (',
    '{dynamicStages.map((stage: any) => ('
)
content = content.replace(
    'defaultStage={addStage}',
    'defaultStage={addStage}\n          stages={dynamicStages}'
)
content = content.replace(
    'buildBoards([])',
    'buildBoards([], dynamicStages)'
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated pipeline page!")

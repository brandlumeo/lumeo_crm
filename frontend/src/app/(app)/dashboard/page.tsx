"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, Plus, Loader2 } from "lucide-react";

import { ActivityFeed, type ActivityItem } from "@/components/activity-feed";
import { KpiStrip, type KpiItem } from "@/components/kpi-strip";
import { NotesList } from "@/components/notes-list";
import { PipelineBoard } from "@/components/pipeline-board";
import { RevenueChart } from "@/components/revenue-chart";
import { DealFunnelChart } from "@/components/deal-funnel-chart";
import { TasksList } from "@/components/tasks-list";
import { 
  useCurrentUser, 
  useCurrentCompany, 
  useLeadPage, 
  useCustomerPage, 
  useDealPage, 
  useTaskPage, 
  useNotePage 
} from "@/lib/queries";
import { formatCompactINR, formatLongDate, getDisplayName, toNumber } from "@/lib/utils";

function buildActivityBundle({
  leads,
  deals,
  tasks,
  notes,
}: { leads: any[]; deals: any[]; tasks: any[]; notes: any[] }): ActivityItem[] {
  const timeline: ActivityItem[] = [
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      actor: lead.assigned_to ? getDisplayName(lead.assigned_to) : "Lumeo",
      body: `added or updated lead ${lead.name}.`,
      timestamp: lead.updated_at,
      tone: "blue" as const,
    })),
    ...deals.map((deal) => ({
      id: `deal-${deal.id}`,
      actor: "Lumeo",
      body: `moved deal ${deal.title} into ${deal.stage.replaceAll("_", " ")}.`,
      timestamp: deal.updated_at,
      tone: deal.stage === "won" ? ("green" as const) : ("accent" as const),
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      actor: task.assigned_to ? getDisplayName(task.assigned_to) : "Lumeo",
      body: `updated task ${task.title}.`,
      timestamp: task.updated_at,
      tone: task.status === "done" ? ("green" as const) : ("gold" as const),
    })),
    ...notes.map((note) => ({
      id: `note-${note.id}`,
      actor: "Lumeo",
      body: `captured note #${note.id}.`,
      timestamp: note.updated_at,
      tone: "accent" as const,
    })),
  ];

  return timeline
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);
}

function buildWeeklySeries(values: number[]) {
  if (values.length === 0) {
    return [0, 0, 0, 0];
  }

  const padded = values.slice(-8);
  while (padded.length < 8) {
    padded.unshift(0);
  }
  return padded;
}

function DashboardHeader() {
  const { data: me, isPending: mePending } = useCurrentUser();
  const { data: company, isPending: companyPending } = useCurrentCompany();
  const { data: leadsRes, isPending: leadsPending } = useLeadPage({ limit: 10 });
  const { data: customersRes, isPending: customersPending } = useCustomerPage({ limit: 10 });
  const { data: dealsRes, isPending: dealsPending } = useDealPage({ limit: 100 });

  if (mePending || companyPending || leadsPending || customersPending || dealsPending) {
    return (
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 md:gap-6 animate-pulse">
        <div>
          <div className="h-3 w-32 bg-accent/20 rounded mb-3" />
          <div className="h-12 w-64 md:w-96 bg-accent/20 rounded mb-3" />
          <div className="h-4 w-48 md:w-80 bg-accent/20 rounded" />
        </div>
      </div>
    );
  }

  const name = me ? (getDisplayName(me).split(" ")[0] ?? "there") : "there";
  const today = formatLongDate(new Date()).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const companyName = company ? company.name : "Your company";
  const leadsCount = leadsRes?.count ?? leadsRes?.results?.length ?? 0;
  const customersCount = customersRes?.count ?? customersRes?.results?.length ?? 0;
  const activeDeals = dealsRes?.results?.filter((d: any) => d.stage !== "won" && d.stage !== "lost").length ?? 0;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 md:gap-6 animate-rise">
      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted mb-1.5">
          <span className="w-[18px] h-px bg-accent" />
          {today}
        </div>
        <h1 className="font-serif text-[40px] md:text-[56px] leading-none">
          {greeting},
          <br />
          <em className="text-accent not-italic">{name}.</em>
        </h1>
        <p className="text-muted mt-2 text-sm max-w-2xl">
          {companyName} is tracking {leadsCount} leads, {customersCount} customers, and {activeDeals} active deals inside Lumeo.
        </p>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        <Link href="/leads" className="btn">
          <Plus className="w-3 h-3" strokeWidth={2.5} />
          New lead
        </Link>
        <Link href="/deals" className="btn btn-primary">
          <Layers className="w-3 h-3" />
          New deal
        </Link>
      </div>
    </div>
  );
}

function DashboardKPIs() {
  const { data: dealsRes, isPending: dealsPending } = useDealPage({ limit: 100 });
  const { data: tasksRes, isPending: tasksPending } = useTaskPage({ limit: 10 });
  const { data: leadsRes, isPending: leadsPending } = useLeadPage({ limit: 10 });

  if (dealsPending || tasksPending || leadsPending) {
    return <div className="h-[120px] bg-card/30 rounded-xl mb-6 animate-pulse border border-border/50" />;
  }

  const deals = dealsRes?.results || [];
  const tasks = tasksRes?.results || [];
  const leads = leadsRes?.results || [];
  
  const leadsCount = leadsRes?.count ?? leads.length;
  const tasksCount = tasksRes?.count ?? tasks.length;

  const wonDeals = deals.filter((deal: any) => deal.stage === "won");
  const openDeals = deals.filter((deal: any) => deal.stage !== "won" && deal.stage !== "lost");
  const revenueValue = wonDeals.reduce((sum: number, deal: any) => sum + toNumber(deal.amount), 0);
  const pipelineValue = openDeals.reduce((sum: number, deal: any) => sum + toNumber(deal.amount), 0);
  const activeDeals = openDeals.length;
  const conversionValue = leadsCount ? (wonDeals.length / leadsCount) * 100 : 0;

  const revenueSeries = buildWeeklySeries(wonDeals.map((deal: any) => toNumber(deal.amount)));
  const pipelineSeries = buildWeeklySeries(openDeals.map((deal: any) => toNumber(deal.amount)));
  const activeSeries = buildWeeklySeries(openDeals.map((_: any, index: number) => index + 1));
  const conversionSeries = buildWeeklySeries(
    leads.map((_: any, index: number) => (leadsCount === 0 ? 0 : ((index + 1) / leadsCount) * 100))
  );

  const kpis: KpiItem[] = [
    {
      label: "Revenue closed",
      value: formatCompactINR(revenueValue),
      meta: `${wonDeals.length} won`,
      tone: wonDeals.length > 0 ? "positive" : "neutral",
      points: revenueSeries,
      lineColor: "#2F6B3A",
      fillColor: "#DCEBD5",
    },
    {
      label: "Pipeline value",
      value: formatCompactINR(pipelineValue),
      meta: `${openDeals.length} open`,
      tone: openDeals.length > 0 ? "positive" : "neutral",
      points: pipelineSeries,
      lineColor: "#1A1714",
    },
    {
      label: "Active deals",
      value: String(activeDeals),
      meta: `${tasksCount} tasks`,
      tone: activeDeals > 0 ? "positive" : "neutral",
      points: activeSeries,
      lineColor: "#B8862C",
    },
    {
      label: "Conversion",
      value: `${conversionValue.toFixed(1)}%`,
      meta: `${leadsCount} leads`,
      tone: conversionValue >= 20 ? "positive" : "warning",
      points: conversionSeries,
      lineColor: "#FF5B1F",
    },
  ];

  return <KpiStrip items={kpis} />;
}

function DashboardPipeline() {
  const { data: dealsRes, isPending } = useDealPage({ limit: 100 });
  
  if (isPending) {
    return (
      <div className="h-[250px] bg-card/30 rounded-xl mb-6 animate-pulse border border-border/50 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  return <PipelineBoard deals={dealsRes?.results || []} />;
}

function DashboardCharts() {
  const { data: dealsRes, isPending } = useDealPage({ limit: 100 });

  if (isPending) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-6">
        <div className="h-[300px] bg-card/30 rounded-xl animate-pulse border border-border/50 flex items-center justify-center">
           <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
        <div className="h-[300px] bg-card/30 rounded-xl animate-pulse border border-border/50 flex items-center justify-center">
           <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  const deals = dealsRes?.results || [];
  const wonDeals = deals.filter((deal: any) => deal.stage === "won");
  const openDeals = deals.filter((deal: any) => deal.stage !== "won" && deal.stage !== "lost");
  const revenueValue = wonDeals.reduce((sum: number, deal: any) => sum + toNumber(deal.amount), 0);
  const pipelineValue = openDeals.reduce((sum: number, deal: any) => sum + toNumber(deal.amount), 0);

  const revenueSeries = buildWeeklySeries(wonDeals.map((deal: any) => toNumber(deal.amount)));
  const revenueForecast = revenueSeries.map((value, index) => value + index * 3500);
  const targetTotal = Math.max(pipelineValue, revenueValue) * 1.15 || 50000;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-6">
      <RevenueChart
        actual={revenueSeries}
        forecast={revenueForecast}
        actualTotal={revenueValue}
        forecastTotal={revenueForecast[revenueForecast.length - 1] ?? revenueValue}
        targetTotal={targetTotal}
      />
      <DealFunnelChart deals={deals} />
    </div>
  );
}

function DashboardTasksNotes() {
  const { data: tasksRes, isPending: tasksPending } = useTaskPage({ limit: 10 });
  const { data: notesRes, isPending: notesPending } = useNotePage({ limit: 10 });

  if (tasksPending || notesPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-[250px] bg-card/30 rounded-xl animate-pulse border border-border/50 flex items-center justify-center">
           <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
        <div className="h-[250px] bg-card/30 rounded-xl animate-pulse border border-border/50 flex items-center justify-center">
           <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  const tasks = tasksRes?.results || [];
  const notes = notesRes?.results || [];

  const dueTasks = [...tasks]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);
  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <TasksList tasks={dueTasks} />
      <NotesList notes={recentNotes} />
    </div>
  );
}

function DashboardActivity() {
  const { data: leadsRes, isPending: leadsPending } = useLeadPage({ limit: 10 });
  const { data: dealsRes, isPending: dealsPending } = useDealPage({ limit: 100 });
  const { data: tasksRes, isPending: tasksPending } = useTaskPage({ limit: 10 });
  const { data: notesRes, isPending: notesPending } = useNotePage({ limit: 10 });

  if (leadsPending || dealsPending || tasksPending || notesPending) {
    return (
      <div className="h-[520px] bg-card/30 rounded-xl animate-pulse border border-border/50 flex items-center justify-center">
         <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  const activities = buildActivityBundle({
    leads: leadsRes?.results || [],
    deals: dealsRes?.results || [],
    tasks: tasksRes?.results || [],
    notes: notesRes?.results || [],
  });

  return <ActivityFeed items={activities} />;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-7 pb-16 max-w-[1400px]">
        <div className="card p-10 animate-rise flex flex-col items-center justify-center h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted mb-4" />
          <div className="font-serif text-[32px] mb-2 text-center">Preparing workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-7 pb-16 max-w-[1400px]">
      <DashboardHeader />
      <DashboardKPIs />
      <DashboardPipeline />
      <DashboardCharts />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mb-6">
        <DashboardTasksNotes />
        <DashboardActivity />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";

import { ActivityFeed, type ActivityItem } from "@/components/activity-feed";
import { KpiStrip, type KpiItem } from "@/components/kpi-strip";
import { NotesList } from "@/components/notes-list";
import { PipelineBoard } from "@/components/pipeline-board";
import { RevenueChart } from "@/components/revenue-chart";
import { DealFunnelChart } from "@/components/deal-funnel-chart";
import { TasksList } from "@/components/tasks-list";
import { useDashboardBundle } from "@/lib/queries";
import { formatCompactINR, formatLongDate, formatINR, getDisplayName, toNumber } from "@/lib/utils";

function buildActivityBundle({
  leads,
  deals,
  tasks,
  notes,
}: NonNullable<ReturnType<typeof useDashboardBundle>["data"]>): ActivityItem[] {
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

export default function DashboardPage() {
  const { data, isPending, isError } = useDashboardBundle();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return (
      <div className="p-7 pb-16 max-w-[1400px]">
        <div className="card p-10 animate-rise">
          <div className="font-serif text-[32px] mb-2">Loading Lumeo workspace...</div>
          <p className="text-muted">Pulling live pipeline, notes, tasks, and revenue snapshots from your CRM.</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-7 pb-16 max-w-[1400px]">
        <div className="card p-10 animate-rise">
          <div className="font-serif text-[32px] mb-2">Dashboard unavailable</div>
          <p className="text-muted">
            Lumeo could not load your CRM data right now. Check the backend API and sign in again.
          </p>
        </div>
      </div>
    );
  }

  const name = getDisplayName(data.me).split(" ")[0] ?? "there";
  const today = formatLongDate(new Date()).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const wonDeals = data.deals.filter((deal) => deal.stage === "won");
  const openDeals = data.deals.filter((deal) => deal.stage !== "won" && deal.stage !== "lost");
  const revenueValue = wonDeals.reduce((sum, deal) => sum + toNumber(deal.amount), 0);
  const pipelineValue = openDeals.reduce((sum, deal) => sum + toNumber(deal.amount), 0);
  const activeDeals = openDeals.length;
  const conversionValue = data.leads.length
    ? (wonDeals.length / data.leads.length) * 100
    : 0;

  const revenueSeries = buildWeeklySeries(wonDeals.map((deal) => toNumber(deal.amount)));
  const pipelineSeries = buildWeeklySeries(openDeals.map((deal) => toNumber(deal.amount)));
  const activeSeries = buildWeeklySeries(openDeals.map((_, index) => index + 1));
  const conversionSeries = buildWeeklySeries(
    data.leads.map((_, index) =>
      data.leads.length === 0 ? 0 : ((index + 1) / data.leads.length) * 100,
    ),
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
      meta: `${data.tasks.length} tasks`,
      tone: activeDeals > 0 ? "positive" : "neutral",
      points: activeSeries,
      lineColor: "#B8862C",
    },
    {
      label: "Conversion",
      value: `${conversionValue.toFixed(1)}%`,
      meta: `${data.leads.length} leads`,
      tone: conversionValue >= 20 ? "positive" : "warning",
      points: conversionSeries,
      lineColor: "#FF5B1F",
    },
  ];

  const revenueForecast = revenueSeries.map((value, index) => value + index * 3500);
  const targetTotal = Math.max(pipelineValue, revenueValue) * 1.15 || 50000;
  const dueTasks = [...data.tasks]
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);
  const recentNotes = [...data.notes]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);
  const activities = buildActivityBundle(data);

  return (
    <div className="p-4 md:p-7 pb-16 max-w-[1400px]">
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
            {data.company.name} is tracking {data.leads.length} leads, {data.customers.length} customers, and {activeDeals} active deals inside Lumeo.
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

      <KpiStrip items={kpis} />
      <PipelineBoard deals={data.deals} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 mb-6">
        <RevenueChart
          actual={revenueSeries}
          forecast={revenueForecast}
          actualTotal={revenueValue}
          forecastTotal={revenueForecast[revenueForecast.length - 1] ?? revenueValue}
          targetTotal={targetTotal}
        />
        <DealFunnelChart deals={data.deals} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mb-6">
        <div className="flex flex-col gap-6">
          <TasksList tasks={dueTasks} />
          <NotesList notes={recentNotes} />
        </div>
        <ActivityFeed items={activities} />
      </div>
    </div>
  );
}

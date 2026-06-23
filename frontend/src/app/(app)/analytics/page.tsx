"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Award, Activity, CheckCircle, XCircle, BarChart3, Clock, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { PageShell } from "@/components/page-shell";
import { usePremiumAnalytics } from "@/lib/queries";
import { formatCompactINR, formatINR, toNumber } from "@/lib/utils";

const stageColorMap: Record<string, string> = {
  prospect: "from-blue-500 to-indigo-500",
  qualified: "from-amber-500 to-orange-500",
  proposal: "from-purple-500 to-pink-500",
  negotiation: "from-rose-500 to-red-500",
  won: "from-emerald-500 to-teal-500",
  lost: "from-slate-500 to-neutral-500",
};

const PIE_COLORS = ["#10b981", "#64748b"]; // Emerald for Won, Slate for Lost

export default function AnalyticsPage() {
  const { data, isLoading, isError } = usePremiumAnalytics();

  const [mounted, setMounted] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState({
    kpis: true,
    revenueChart: true,
    funnel: true,
    leaderboard: true,
    conversionChart: true,
    forecastChart: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <PageShell eyebrow="Analytics" title="Executive intelligence" description="Loading live performance KPIs...">
        <div className="flex items-center justify-center py-20 text-muted">
          Analyzing pipeline velocity and conversions...
        </div>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell eyebrow="Analytics" title="Executive intelligence" description="Live CRM aggregates & forecast indicators.">
        <div className="card p-10 text-center animate-rise">
          <div className="font-serif text-[24px] mb-2 text-ink">Analytics unavailable</div>
          <p className="text-muted text-sm">
            Could not compute premium CRM metrics. Verify that your backend is up and running.
          </p>
        </div>
      </PageShell>
    );
  }

  const {
    expected_pipeline_value,
    funnel,
    leaderboard,
    win_loss,
    sales_velocity_days,
    revenue_by_month,
    lead_conversion,
    revenue_forecast,
  } = data;

  const totalClosedRevenue = leaderboard.reduce((sum: number, rep: any) => sum + toNumber(rep.total_closed), 0) || 1;
  const maxStageValue = Math.max(...funnel.map((item: any) => item.total_value), 1);

  const pieData = [
    { name: "Won", value: win_loss.won },
    { name: "Lost", value: win_loss.lost },
  ];

  const toggleWidget = (key: keyof typeof activeWidgets) => {
    setActiveWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <PageShell
      eyebrow="Analytics"
      title="Executive Intelligence"
      description="Live CRM aggregates, weighted pipeline forecast, conversion metrics, and rep leaderboards."
    >
      {/* Widget Customizer Toggle */}
      <div className="flex items-center gap-4 mb-6 bg-slate-950/40 p-3 border border-slate-900 rounded-xl overflow-x-auto whitespace-nowrap">
        <span className="text-xs text-muted flex items-center gap-1.5 shrink-0 pl-2 pr-4 border-r border-slate-800">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard Layout
        </span>
        {Object.entries(activeWidgets).map(([key, isActive]) => (
          <button
            key={key}
            onClick={() => toggleWidget(key as keyof typeof activeWidgets)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              isActive
                ? "bg-accent/10 border-accent/30 text-accent font-medium"
                : "bg-transparent border-slate-800 text-muted hover:text-ink hover:bg-slate-900"
            }`}
          >
            {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {/* KPI Cards Strip */}
        {activeWidgets.kpis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 overflow-hidden"
          >
            {/* Expected Pipeline Value */}
            <div className="card border-accent/20 bg-gradient-to-br from-accent/10 to-indigo-500/5 p-6 shadow-md shadow-accent/5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-2 font-medium">Weighted Forecast</div>
                <Activity className="w-4 h-4 text-accent/70" />
              </div>
              <h2 className="font-serif text-[32px] leading-tight text-ink">
                {formatCompactINR(expected_pipeline_value)}
              </h2>
              <div className="mt-2 text-xs flex items-center gap-1.5 text-emerald-500 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+12.5% vs last month</span>
              </div>
            </div>

            {/* Closed Won Revenue */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-2 font-medium">Closed Won</div>
                <Award className="w-4 h-4 text-emerald-500/70" />
              </div>
              <h2 className="font-serif text-[32px] leading-tight text-emerald-500">
                {formatCompactINR(totalClosedRevenue)}
              </h2>
              <div className="mt-2 text-xs flex items-center gap-1.5 text-emerald-500 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+8.2% vs last month</span>
              </div>
            </div>

            {/* Sales Velocity */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-2 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  Sales Velocity
                </div>
              </div>
              <h2 className="font-serif text-[32px] leading-tight text-blue-500">
                {sales_velocity_days || "0"} <span className="text-lg font-sans text-muted">days</span>
              </h2>
              <div className="mt-2 text-xs flex items-center gap-1.5 text-emerald-500 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>-2.1 days faster</span>
              </div>
            </div>

            {/* Win Ratio */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs uppercase tracking-wider text-muted-2 font-medium">Win Ratio</div>
                <div className="flex gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-500/70" />
                  <XCircle className="w-4 h-4 text-slate-500/70" />
                </div>
              </div>
              <h2 className="font-serif text-[32px] leading-tight text-ink">
                {win_loss.ratio.toFixed(1)}%
              </h2>
              <div className="mt-2 text-xs flex items-center justify-between">
                <span className="text-muted">{win_loss.won} won / {win_loss.lost} lost</span>
                <span className="text-emerald-500 font-medium">+1.4%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Revenue by Month (Recharts) */}
        <AnimatePresence>
          {activeWidgets.revenueChart && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card animate-rise overflow-hidden"
            >
              <div className="card-head">
                <div className="card-title">
                  Revenue by Month
                  <span className="card-title-meta">Historical closed won revenue over time</span>
                </div>
              </div>
              <div className="p-6 h-[300px]">
                {revenue_by_month?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenue_by_month} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" stroke="#475569" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickFormatter={(val) => formatCompactINR(val)} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                        itemStyle={{ color: "#10b981", fontWeight: "bold" }}
                        formatter={(value: any) => formatINR(value as number)}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted text-sm">No revenue data available yet.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lead Conversion Chart (Recharts) */}
        <AnimatePresence>
          {activeWidgets.conversionChart && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card animate-rise overflow-hidden"
            >
              <div className="card-head">
                <div className="card-title">
                  Lead Conversion Rate
                  <span className="card-title-meta">Leads won vs total leads generated by month</span>
                </div>
              </div>
              <div className="p-6 h-[300px]">
                {lead_conversion?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lead_conversion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#B8862C" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#B8862C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" stroke="#475569" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                        itemStyle={{ color: "#B8862C", fontWeight: "bold" }}
                        formatter={(value: any) => `${(value as number).toFixed(1)}%`}
                      />
                      <Area type="monotone" dataKey="rate" stroke="#B8862C" strokeWidth={3} fillOpacity={1} fill="url(#colorConversion)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted text-sm">No conversion data available yet.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {/* Revenue Forecast Chart */}
        {activeWidgets.forecastChart && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card animate-rise overflow-hidden mb-6"
          >
            <div className="card-head">
              <div className="card-title">
                Revenue Forecasting
                <span className="card-title-meta">Projected future revenue based on weighted active deals</span>
              </div>
            </div>
            <div className="p-6 h-[300px]">
              {revenue_forecast?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue_forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#475569" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={12} tickFormatter={(val) => formatCompactINR(val)} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                      itemStyle={{ color: "#3b82f6", fontWeight: "bold" }}
                      formatter={(value: any) => formatINR(value as number)}
                      cursor={{ fill: "#1e293b", opacity: 0.4 }}
                    />
                    <Bar dataKey="expected_revenue" fill="url(#colorForecast)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted text-sm">No active deals with expected close dates available for forecasting.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Stage Conversion Funnel Chart */}
        <AnimatePresence>
          {activeWidgets.funnel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card animate-rise overflow-hidden"
            >
              <div className="card-head">
                <div className="card-title">
                  Stage Conversion Funnel
                  <span className="card-title-meta">Transaction volume and item counts by stage</span>
                </div>
              </div>
              <div className="p-6 space-y-5 h-[350px] overflow-y-auto custom-scrollbar">
                {funnel.map((item: any) => {
                  const percentage = (item.total_value / maxStageValue) * 100;
                  const normalizedStage = item.stage.toLowerCase().replaceAll(" ", "_");
                  const gradient = stageColorMap[normalizedStage] ?? "from-slate-500 to-neutral-500";

                  return (
                    <div key={item.stage} className="group space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-ink capitalize leading-none flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${gradient}`} />
                          {item.stage.replaceAll("_", " ")}
                        </span>
                        <div className="space-x-2 text-muted">
                          <span>{item.count} deals</span>
                          <span className="font-semibold text-ink">{formatINR(item.total_value)}</span>
                        </div>
                      </div>
                      {/* Progress bar container */}
                      <div className="h-6 w-full bg-slate-900/60 rounded-xl overflow-hidden border border-slate-950 flex items-center">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(percentage, 2)}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full bg-gradient-to-r ${gradient} opacity-80 group-hover:opacity-100 transition-all flex items-center justify-end px-2.5 min-w-[2%]`}
                        >
                          {percentage > 10 && (
                            <span className="text-[10px] text-ink font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
                              {percentage.toFixed(0)}%
                            </span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  );
                })}

                {funnel.length === 0 && (
                  <div className="text-center py-10 text-xs text-muted-3">
                    No active deal data in your funnel
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rep Leaderboard and Win/Loss Pie */}
        <AnimatePresence>
          {activeWidgets.leaderboard && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card animate-rise overflow-hidden"
            >
              <div className="card-head">
                <div className="card-title">
                  Performance & Win/Loss Ratio
                  <span className="card-title-meta">Top performers and overall closing ratio</span>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 h-[350px]">
                {/* Leaderboard List */}
                <div className="space-y-6 overflow-y-auto custom-scrollbar pr-4">
                  {leaderboard.map((rep: any, index: number) => {
                    const repRevenue = toNumber(rep.total_closed);
                    const percentage = (repRevenue / totalClosedRevenue) * 100;
                    const rankColor = index === 0 ? "text-amber-400 bg-amber-400/10" : index === 1 ? "text-slate-300 bg-slate-300/10" : index === 2 ? "text-amber-600 bg-amber-600/10" : "text-slate-400 bg-slate-900";

                    return (
                      <div key={rep.username} className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${rankColor}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink truncate">{rep.username}</span>
                            <span className="font-serif font-bold text-ink">{formatCompactINR(repRevenue)}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-900/60 rounded-full overflow-hidden border border-slate-950">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(percentage, 2)}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-accent to-indigo-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {leaderboard.length === 0 && (
                    <div className="text-center py-10 text-xs text-muted flex flex-col items-center justify-center gap-2">
                      <BarChart3 className="w-8 h-8 opacity-20" />
                      <span>No closed won deals recorded yet</span>
                    </div>
                  )}
                </div>

                {/* Win/Loss Pie Chart */}
                <div className="flex flex-col items-center justify-center border-l border-slate-800/50 pl-4">
                  {win_loss.won > 0 || win_loss.lost > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
                          itemStyle={{ fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-sm text-muted">No closed deals</div>
                  )}
                  <div className="text-center mt-2">
                    <div className="text-2xl font-serif text-ink">{win_loss.ratio.toFixed(1)}%</div>
                    <div className="text-xs text-muted uppercase tracking-wider">Win Ratio</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

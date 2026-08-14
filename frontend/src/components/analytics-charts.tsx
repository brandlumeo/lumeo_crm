"use client";

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
import { formatCompactINR, formatINR } from "@/lib/utils";

const PIE_COLORS = ["#10b981", "#64748b"];

export function RevenueAreaChart({ data }: { data: any[] }) {
  if (!data?.length) {
    return <div className="flex h-full items-center justify-center text-muted text-sm">No revenue data available yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
  );
}

export function ConversionAreaChart({ data }: { data: any[] }) {
  if (!data?.length) {
    return <div className="flex h-full items-center justify-center text-muted text-sm">No conversion data available yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
  );
}

export function ForecastBarChart({ data }: { data: any[] }) {
  if (!data?.length) {
    return <div className="flex h-full items-center justify-center text-muted text-sm">No active deals with expected close dates available for forecasting.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
  );
}

export function WinLossPieChart({ data }: { data: any[] }) {
  if (data[0].value === 0 && data[1].value === 0) {
    return <div className="text-sm text-muted text-center py-10">No closed deals</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip
          contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "8px" }}
          itemStyle={{ fontWeight: "bold" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

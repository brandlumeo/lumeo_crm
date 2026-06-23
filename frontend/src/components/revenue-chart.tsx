"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { formatCompactINR, formatINR } from "@/lib/utils";

interface RevenueChartProps {
  actual: number[];
  forecast: number[];
  actualTotal: number;
  forecastTotal: number;
  targetTotal: number;
}

const ranges = ["4w", "12w", "ytd"] as const;

export function RevenueChart({
  actual,
  forecast,
  actualTotal,
  forecastTotal,
  targetTotal,
}: RevenueChartProps) {
  const [range, setRange] = useState<(typeof ranges)[number]>("12w");

  const actualSeries =
    range === "4w"
      ? actual.slice(-4)
      : range === "ytd"
        ? actual
        : actual.slice(-12);

  const forecastSeries =
    range === "4w"
      ? forecast.slice(-2)
      : range === "ytd"
        ? forecast
        : forecast.slice(-4);

  const chartData = [];
  for (let i = 0; i < actualSeries.length; i++) {
    const isLast = i === actualSeries.length - 1;
    chartData.push({
      name: `Week ${i + 1}`,
      actual: actualSeries[i],
      forecast: isLast ? actualSeries[i] : null,
      target: targetTotal,
    });
  }
  for (let i = 0; i < forecastSeries.length; i++) {
    chartData.push({
      name: `Week ${actualSeries.length + i + 1} (Est)`,
      actual: null,
      forecast: forecastSeries[i],
      target: targetTotal,
    });
  }

  return (
    <div className="card animate-rise overflow-hidden">
      <div className="card-head">
        <div className="card-title">
          Revenue
          <span className="card-title-meta">Live CRM trend</span>
        </div>
        <div className="seg">
          {ranges.map((value) => (
            <button
              key={value}
              className={range === value ? "on" : ""}
              onClick={() => setRange(value)}
            >
              {value === "ytd" ? "YTD" : value}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 px-5 pt-4 pb-4 border-b border-line-2 flex-wrap bg-bone/30">
        <Legend color="#1A1714" label="Actual" value={formatCompactINR(actualTotal)} />
        <Legend color="#FF5B1F" label="Forecast" value={formatCompactINR(forecastTotal)} dashed />
        <Legend color="#7A6F5F" label="Target" value={formatCompactINR(targetTotal)} target />
      </div>

      <div className="pt-6 pb-2 pr-6 pl-0 h-[300px] w-full text-[11px] font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1A1714" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1A1714" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF5B1F" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#FF5B1F" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E0CE" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "#7A6F5F" }} 
              dy={10} 
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7A6F5F" }}
              tickFormatter={(value) => formatCompactINR(value)}
              width={60}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-paper border border-line p-3 rounded-lg shadow-xl shadow-black/5 flex flex-col gap-1.5 min-w-[140px]">
                      <div className="text-[11px] text-muted font-sans font-medium mb-1 border-b border-line pb-1">
                        {label}
                      </div>
                      {payload.map((entry: any) => {
                        if (entry.dataKey === 'target') return null;
                        if (entry.value == null) return null;
                        return (
                          <div key={entry.dataKey} className="flex items-center justify-between gap-4 font-mono text-[12px]">
                            <span className="flex items-center gap-1.5 capitalize text-ink">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.dataKey}
                            </span>
                            <span className="font-semibold text-ink">
                              {formatCompactINR(entry.value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={targetTotal} stroke="#7A6F5F" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#1A1714"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorActual)"
              isAnimationActive={true}
              animationDuration={800}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#FF5B1F"
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorForecast)"
              isAnimationActive={true}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  value,
  dashed,
  target,
}: {
  color: string;
  label: string;
  value: string;
  dashed?: boolean;
  target?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{
          background: target ? "#DDD4C0" : color,
          border: target ? "1px solid #7A6F5F" : "none",
          backgroundImage: dashed
            ? `repeating-linear-gradient(90deg, ${color}, ${color} 3px, transparent 3px, transparent 5px)`
            : undefined,
        }}
      />
      {label}
      <span className="font-mono text-muted ml-1">{value}</span>
    </div>
  );
}

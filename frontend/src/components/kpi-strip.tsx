"use client";

import { cn } from "@/lib/utils";
import { LineChart, Line, AreaChart, Area, ResponsiveContainer } from "recharts";

export interface KpiItem {
  label: string;
  value: React.ReactNode;
  meta: string;
  tone: "positive" | "warning" | "neutral";
  points: number[];
  lineColor: string;
  fillColor?: string;
}

const toneClassMap: Record<KpiItem["tone"], string> = {
  positive: "chip chip-positive",
  warning: "chip chip-warning",
  neutral: "chip chip-neutral",
};

export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-paper border border-line rounded-lg overflow-hidden mb-6 animate-rise">
      {items.map((item, index) => {
        const chartData = item.points.map((val, i) => ({ value: val, index: i }));
        const minVal = Math.min(...item.points);
        const maxVal = Math.max(...item.points, minVal + 1);

        return (
          <div
            key={item.label}
            className={cn(
              "p-6",
              index < items.length - 1 && "lg:border-r border-line-2",
              index % 2 === 0 && "sm:border-r",
              index < items.length - 1 && "border-b lg:border-b-0 border-line-2",
              index >= 2 && "sm:border-b-0"
            )}
          >
            <div className="text-[11px] uppercase tracking-[0.1em] text-muted mb-3.5 flex justify-between items-center gap-3">
              <span>{item.label}</span>
              <span className={toneClassMap[item.tone]}>{item.meta}</span>
            </div>
            <div className="font-serif text-[38px] leading-none mb-3.5 tabular-nums">
              {item.value}
            </div>
            <div className="h-10 w-full overflow-visible">
              <ResponsiveContainer width="100%" height="100%">
                {item.fillColor ? (
                  <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={item.fillColor} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={item.fillColor} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={item.lineColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#fill-${index})`}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={item.lineColor}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={1000}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

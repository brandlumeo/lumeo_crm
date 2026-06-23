"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { type Deal } from "@/lib/types";

const STAGES = [
  { key: "prospect", label: "Prospect", color: "#6B7280" },
  { key: "qualified", label: "Qualified", color: "#3B82F6" },
  { key: "proposal", label: "Proposal", color: "#F59E0B" },
  { key: "negotiation", label: "Negotiation", color: "#8B5CF6" },
  { key: "won", label: "Won", color: "#10B981" },
];

export function DealFunnelChart({ deals }: { deals: Deal[] }) {
  const data = useMemo(() => {
    return STAGES.map((stage) => {
      const count = deals.filter((d) => d.stage === stage.key).length;
      return {
        name: stage.label,
        count,
        color: stage.color,
      };
    });
  }, [deals]);

  return (
    <div className="card animate-rise overflow-hidden flex flex-col">
      <div className="card-head">
        <div className="card-title">
          Sales Pipeline
          <span className="card-title-meta">Active deals by stage</span>
        </div>
      </div>
      <div className="flex-1 p-5 pt-6 pb-2 min-h-[300px] w-full text-[11px] font-mono">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            barSize={32}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E8E0CE" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7A6F5F" }}
              width={90}
            />
            <Tooltip
              cursor={{ fill: "transparent" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-paper border border-line p-3 rounded-lg shadow-xl shadow-black/5 flex flex-col gap-1.5 min-w-[120px]">
                      <div className="text-[11px] text-muted font-sans font-medium mb-1 border-b border-line pb-1">
                        {data.name}
                      </div>
                      <div className="flex items-center justify-between gap-4 font-mono text-[12px]">
                        <span className="flex items-center gap-1.5 text-ink">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: data.color }}
                          />
                          Deals
                        </span>
                        <span className="font-semibold text-ink">
                          {data.count}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 6, 6, 0]}
              isAnimationActive={true}
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

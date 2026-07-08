"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { ShimmerBlock } from "@/components/ui/shimmer-skeleton";
import { useState } from "react";

const data = [
  { bucket: "<100ms", count: 420, color: "#34d399" },
  { bucket: "100–300ms", count: 310, color: "#6366f1" },
  { bucket: ">300ms", count: 120, color: "#f472b6" },
];

export default function PerformanceChart() {
  const [loading] = useState(false);

  if (loading) {
    return <ShimmerBlock className="h-[360px] w-full rounded-[var(--radius-xl)]" />;
  }

  const total = data.reduce((a, d) => a + d.count, 0);
  const fast = Math.round((data[0].count / total) * 100);

  return (
    <div className="surface-3 hairline h-full rounded-[var(--radius-xl)] p-5">
      <div className="shell-head">
        <div>
          <h3 className="shell-title">Performance</h3>
          <p className="shell-sub">Query execution latency distribution</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Fast (&lt;100ms)</p>
          <p className="text-lg font-semibold text-white">{fast}%</p>
        </div>
        <div className="h-8 w-px" style={{ background: "var(--border-soft)" }} />
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Total</p>
          <p className="text-lg font-semibold text-white">{total.toLocaleString()}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fill: "#8a90b5", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(10,14,35,0.95)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              color: "#eef1ff",
              fontSize: 12,
            }}
            cursor={{ fill: "rgba(99,102,241,0.1)" }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
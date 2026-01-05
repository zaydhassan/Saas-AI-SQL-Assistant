"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const data = [
  { bucket: "<100ms", count: 420 },
  { bucket: "100–300ms", count: 310 },
  { bucket: ">300ms", count: 120 },
];

export default function PerformanceChart() {
  return (
    <div className="rounded-xl bg-linear-to-br from-white/8 to-white/3
    border border-white/10 p-6 backdrop-blur-xl">
      <h3 className="text-white font-medium mb-1">
        Performance Optimization
      </h3>
      <p className="text-xs text-neutral-400 mb-4">
        Query execution latency
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.08)"
          />

          <XAxis
            dataKey="bucket"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.15)" }}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#e5e7eb",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#c7d2fe" }}
            cursor={{ fill: "rgba(99,102,241,0.1)" }}
          />

          <Bar
            dataKey="count"
            fill="#22c55e"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
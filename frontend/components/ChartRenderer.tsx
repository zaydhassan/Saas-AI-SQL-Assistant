"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

type Props = {
  rows: Record<string, any>[];
};

const tooltipStyle = {
  background: "rgba(10,14,35,0.95)",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  color: "#eef1ff",
  fontSize: 12,
};

export default function ChartRenderer({ rows }: Props) {
  if (!rows || rows.length === 0) return null;

  const columns = Object.keys(rows[0]);
  if (columns.length < 2) return null;

  const xKey = columns[0];
  const yKey = columns.find((key) => typeof rows[0][key] === "number");

  if (!yKey) return null;

  const isTimeSeries =
    typeof rows[0][xKey] === "string" && /\d{4}-\d{2}(-\d{2})?/.test(rows[0][xKey]);

  const chartLabel = isTimeSeries
    ? "Time series"
    : rows.length <= 6
    ? "Category comparison"
    : "Aggregated data";

  return (
    <div className="glass fade-in mt-6 rounded-[var(--radius-xl)] p-5">
      <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
        Auto-selected visualization: <strong className="text-white">{chartLabel}</strong>
      </p>
      <ResponsiveContainer width="100%" height={300}>
        {isTimeSeries ? (
          <LineChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey={yKey} stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.1)" }} />
            <Bar dataKey={yKey} fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { ShimmerBlock } from "@/components/ui/shimmer-skeleton";

const RANGES = ["24h", "7d", "30d", "90d"] as const;

export default function UsageChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<(typeof RANGES)[number]>("7d");

  useEffect(() => {
    apiFetch("/api/analytics/query-volume")
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <ShimmerBlock className="h-[360px] w-full rounded-[var(--radius-xl)]" />;
  }

  const total = data.reduce((acc, d) => acc + (Number(d.queries) || 0), 0);
  const peak = data.length ? Math.max(...data.map((d) => Number(d.queries) || 0)) : 0;

  return (
    <div className="surface-3 hairline h-full rounded-[var(--radius-xl)] p-5">
      <div className="shell-head">
        <div>
          <h3 className="shell-title">Query Volume</h3>
          <p className="shell-sub">Daily query activity across all datasets</p>
        </div>
        <div className="seg" role="tablist" aria-label="Range">
          {RANGES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className="seg-item"
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Total</p>
          <p className="text-lg font-semibold text-white">{total.toLocaleString()}</p>
        </div>
        <div className="h-8 w-px" style={{ background: "var(--border-soft)" }} />
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Peak / day</p>
          <p className="text-lg font-semibold text-white">{peak.toLocaleString()}</p>
        </div>
        <span className="legend ml-auto">
          <span className="legend-dot" style={{ background: "#8b5cf6" }} /> Queries
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(10,14,35,0.95)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              color: "#eef1ff",
              fontSize: 12,
            }}
            cursor={{ stroke: "rgba(139,92,246,0.3)" }}
          />
          <Area type="monotone" dataKey="queries" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#usageGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
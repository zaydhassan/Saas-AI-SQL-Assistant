"use client";

import { Sparkles, TrendingUp, AlertTriangle, Activity, ArrowUpRight } from "lucide-react";

const insights = [
  {
    icon: <TrendingUp size={15} />,
    text: "Query volume spikes every Friday afternoon",
    tag: "Pattern",
    tint: "#6366f1",
  },
  {
    icon: <AlertTriangle size={15} />,
    text: "DELETE operations cause most failures",
    tag: "Risk",
    tint: "#f472b6",
  },
  {
    icon: <Activity size={15} />,
    text: "Latency increases significantly beyond 300ms",
    tag: "Performance",
    tint: "#22d3ee",
  },
];

export default function AIInsights() {
  return (
    <div
      className="surface-3 hairline relative overflow-hidden rounded-[var(--radius-xl)] p-5"
      style={{
        background: "linear-gradient(180deg, rgba(99,102,241,0.14), rgba(139,92,246,0.04))",
        borderColor: "rgba(99,102,241,0.3)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
        >
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-white">AI Insights</h3>
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>Auto-detected patterns in your usage</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {insights.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl p-3 text-[13px]"
            style={{ background: "rgba(255,255,255,0.045)", color: "var(--text-soft)", border: "1px solid var(--border-soft)" }}
          >
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${it.tint}22`, color: it.tint, border: `1px solid ${it.tint}44` }}
            >
              {it.icon}
            </span>
            <span className="min-w-0 flex-1">{it.text}</span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
            >
              {it.tag}
            </span>
          </li>
        ))}
      </ul>

      <a
        href="/insights"
        className="mt-4 flex items-center justify-between rounded-xl p-3 text-[13px] font-medium text-white transition-colors"
        style={{ background: "rgba(99,102,241,0.16)", border: "1px solid rgba(99,102,241,0.3)" }}
      >
        Explore all insights
        <ArrowUpRight size={15} />
      </a>
    </div>
  );
}
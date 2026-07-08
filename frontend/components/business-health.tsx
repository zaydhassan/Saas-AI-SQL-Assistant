"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Activity, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AnimatedCounter } from "@/components/motion/primitives";
import { ShimmerKPI, ShimmerLine } from "@/components/ui/shimmer-skeleton";

export type HealthDimension = {
  score: number;
  status: string; // Healthy / Watch / Critical
  dot: string; // green / amber / red
  detail?: string;
};

export type HealthData = {
  id?: number;
  score: number;
  overall_status?: string;
  dimensions?: Record<string, HealthDimension>;
  generated_at?: string;
};

const DOT_COLOR: Record<string, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
};

const DIMENSION_LABELS: Record<string, string> = {
  revenue: "Revenue",
  growth: "Growth",
  inventory: "Inventory",
  refunds: "Refunds",
  retention: "Retention",
};

function statusTint(status?: string) {
  if (status === "Healthy") return { color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" };
  if (status === "Critical") return { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" };
  return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" };
}

export default function BusinessHealth({
  data,
  className,
  compact = false,
  showHeader = true,
}: {
  data?: HealthData | null;
  className?: string;
  compact?: boolean;
  showHeader?: boolean;
}) {
  const [health, setHealth] = React.useState<HealthData | null>(data ?? null);
  const [loading, setLoading] = React.useState(!data);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (force = false) => {
    if (data && !force) return;
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      const res = await apiFetch<HealthData>(`/api/health-score${force ? "?force=true" : ""}`);
      setHealth(res);
    } catch {
      // keep last state / null
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className={className}>
        <div className="glass-static rounded-[var(--radius-xl)] p-5">
          <ShimmerKPI />
          <div className="mt-4 space-y-3">
            <ShimmerLine />
            <ShimmerLine />
            <ShimmerLine className="w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const dims = health?.dimensions ?? {};
  const dimEntries = Object.entries(dims);
  const tint = statusTint(health?.overall_status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <div className="glass-static relative overflow-hidden rounded-[var(--radius-xl)] p-5">
        {/* glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
          style={{ background: tint.bg }}
        />

        {showHeader && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
              >
                <Activity size={15} />
              </span>
              <div>
                <h3 className="text-[14px] font-semibold text-white">Business Health Score</h3>
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                  {health?.overall_status ?? "—"} · overall
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => load(true)}
              className="tool-btn"
              aria-label="Refresh health score"
              title="Refresh"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-5">
          {/* Score ring */}
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={tint.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - (health?.score ?? 0) / 100) }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <AnimatedCounter
                value={health?.score ?? 0}
                className="text-2xl font-bold text-white"
              />
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>/ 100</span>
            </div>
          </div>

          {/* Dimensions */}
          <div className="flex-1 space-y-2">
            {dimEntries.length === 0 && (
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                No dimension data yet.
              </p>
            )}
            {dimEntries.map(([key, d]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12.5px] text-white">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: DOT_COLOR[d.dot] ?? "#f59e0b", boxShadow: `0 0 8px ${DOT_COLOR[d.dot] ?? "#f59e0b"}` }}
                  />
                  {DIMENSION_LABELS[key] ?? key}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>{d.status}</span>
                  <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: DOT_COLOR[d.dot] ?? "#f59e0b" }}>
                    {Math.round(d.score)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {!compact && health?.generated_at && (
          <p className="mt-4 text-[10.5px]" style={{ color: "var(--muted-2)" }}>
            Updated {new Date(health.generated_at).toLocaleString()}
          </p>
        )}
      </div>
    </motion.div>
  );
}
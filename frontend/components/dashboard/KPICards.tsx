"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AnimatedCounter } from "@/components/motion/primitives";
import { ShimmerKPI } from "@/components/ui/shimmer-skeleton";
import Sparkline from "@/components/ui/sparkline";
import { TrendingUp, Zap, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";

const SPARK = [12, 18, 14, 22, 19, 28, 24, 33, 30, 38, 35, 44];

export default function KPICards() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/analytics/overview")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <ShimmerKPI />
        <ShimmerKPI />
        <ShimmerKPI />
      </div>
    );
  }

  const stats = [
    {
      label: "Total Queries",
      value: data?.total_queries ?? 0,
      suffix: "",
      icon: <TrendingUp size={15} />,
      delta: "+12.4%",
      deltaPositive: true,
      caption: "vs last 7 days",
      color: "#6366f1",
      spark: [22, 28, 24, 33, 30, 38, 44],
    },
    {
      label: "Avg Execution",
      value: data?.avg_execution_time ?? 0,
      suffix: " ms",
      icon: <Zap size={15} />,
      delta: "-3.1%",
      deltaPositive: true,
      caption: "faster this week",
      color: "#22d3ee",
      spark: [40, 38, 36, 37, 33, 32, 30],
    },
    {
      label: "Failed Queries",
      value: data?.failed_queries ?? 0,
      suffix: "",
      icon: <AlertTriangle size={15} />,
      delta: "-8.2%",
      deltaPositive: true,
      caption: "vs last 7 days",
      color: "#f472b6",
      spark: [14, 12, 13, 10, 9, 8, 7],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="surface-3 group relative overflow-hidden rounded-[var(--radius-xl)] p-5"
          style={{ animation: `fadeIn .5s ${i * 0.08}s both` }}
        >
          <div className="flex items-start justify-between">
            <span className="icon-tile h-9 w-9">
              {s.icon}
            </span>
            <span className={`delta ${s.deltaPositive ? "delta-up" : "delta-down"}`}>
              {s.deltaPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {s.delta}
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                {s.label}
              </p>
              <p className="mt-1 text-[28px] font-bold leading-none tracking-tight text-white">
                <AnimatedCounter value={Number(s.value) || 0} suffix={s.suffix} />
              </p>
            </div>
            <div className="w-24 shrink-0">
              <Sparkline data={s.spark} color={s.color} height={36} />
            </div>
          </div>

          <p className="mt-3 text-[11.5px]" style={{ color: "var(--muted-2)" }}>{s.caption}</p>
        </div>
      ))}
    </div>
  );
}
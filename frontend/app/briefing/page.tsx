"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sunrise, TrendingUp, TrendingDown, Minus, Sparkles, Bell, Lightbulb,
  ShieldCheck, Gauge, ArrowRight, AlertTriangle, RefreshCw,
} from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import BusinessHealth, { type HealthData } from "@/components/business-health";
import { AnimatedCounter, FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { ShimmerKPI, ShimmerLine } from "@/components/ui/shimmer-skeleton";
import { apiFetch } from "@/lib/api";

type Kpi = {
  key: string;
  label: string;
  value: number | null;
  delta: number | null;
  direction: string;
  has_data: boolean;
};

type TopAlert = {
  name?: string;
  metric?: string;
  condition?: string;
  payload?: { delta_pct?: number; direction?: string; latest?: number } | null;
  fired_at?: string | null;
} | null;

type Briefing = {
  greeting?: string;
  summary?: string;
  kpis?: Kpi[];
  top_alert?: TopAlert;
  recommendations?: string[];
  health_score?: number | null;
  health_overall_status?: string | null;
  health_dimensions?: Record<string, any>;
  data_quality_score?: number | null;
  ai_confidence?: number | null;
  date?: string;
  generated_at?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function DeltaBadge({ delta, direction }: { delta: number | null; direction: string }) {
  if (delta === null || delta === undefined) {
    return <span className="text-[11px]" style={{ color: "var(--muted-2)" }}>no change</span>;
  }
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const color = direction === "up" ? "#22c55e" : direction === "down" ? "#ef4444" : "#f59e0b";
  const sign = direction === "up" ? "+" : direction === "down" ? "−" : "";
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color }}>
      <Icon size={13} />
      {sign}
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="glass-static relative overflow-hidden rounded-[var(--radius-lg)] p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-3xl" style={{ background: "rgba(99,102,241,0.12)" }} />
      <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{kpi.label}</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        {kpi.has_data ? (
          <AnimatedCounter value={kpi.value ?? 0} className="text-2xl font-bold text-white" />
        ) : (
          <span className="text-2xl font-bold" style={{ color: "var(--muted-2)" }}>—</span>
        )}
        {kpi.has_data && <DeltaBadge delta={kpi.delta} direction={kpi.direction} />}
      </div>
    </div>
  );
}

function ConfidenceGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="glass-static rounded-[var(--radius-lg)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Gauge size={15} className="text-[var(--accent)]" />
        <h3 className="text-[13.5px] font-semibold text-white">AI Confidence</h3>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
            <motion.circle
              cx="40" cy="40" r="32" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 32}
              initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - value) }}
              transition={{ duration: 1, ease: EASE }}
            />
          </svg>
          <span className="absolute text-[13px] font-bold text-white">{pct}%</span>
        </div>
        <p className="flex-1 text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
          How much real data backed this brief. {pct >= 80 ? "High coverage." : pct >= 60 ? "Moderate coverage." : "Add data to improve."}
        </p>
      </div>
    </div>
  );
}

export default function BriefingPage() {
  const [briefing, setBriefing] = React.useState<Briefing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiFetch<Briefing>(`/api/briefing${force ? "?force=true" : ""}`);
      setBriefing(res);
    } catch (e: any) {
      // keep null
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const actions = (
    <button className="tool-btn" onClick={() => load(true)} title="Refresh brief">
      <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
    </button>
  );

  return (
    <AppShell
      title="Daily Briefing"
      description="Your business at a glance — generated by AI every day."
      breadcrumb={[{ label: "Workspace" }, { label: "Daily Briefing" }]}
      actions={actions}
    >
      {loading ? (
        <div className="space-y-6">
          <div className="glass-static rounded-[var(--radius-xl)] p-6">
            <ShimmerLine className="w-40" />
            <div className="mt-4"><ShimmerLine /><ShimmerLine className="w-2/3" /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ShimmerKPI /><ShimmerKPI /><ShimmerKPI /><ShimmerKPI />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero greeting */}
          <FadeUp>
            <div
              className="relative overflow-hidden rounded-[var(--radius-xl)] p-6 sm:p-8"
              style={{
                background: "linear-gradient(120deg, rgba(99,102,241,0.18), rgba(139,92,246,0.08) 55%, rgba(59,130,246,0.12))",
                border: "1px solid rgba(99,102,241,0.28)",
              }}
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.2)" }} />
              <div className="relative flex items-center gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
                  style={{ background: "var(--gradient-brand)", boxShadow: "0 12px 30px var(--accent-glow)" }}
                >
                  <Sunrise size={20} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
                    {briefing?.greeting || "Good day"}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                    {briefing?.summary || "Your daily brief is being prepared."}
                  </p>
                </div>
              </div>
            </div>
          </FadeUp>

          {/* KPI cards */}
          <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(briefing?.kpis || []).map((k) => (
              <StaggerItem key={k.key}>
                <KpiCard kpi={k} />
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Health + quality + confidence */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <BusinessHealth data={briefing ? {
                score: briefing.health_score ?? 0,
                overall_status: briefing.health_overall_status ?? undefined,
                dimensions: briefing.health_dimensions,
              } : undefined} />
            </div>
            <div className="grid grid-cols-1 gap-5 xl:col-span-7">
              <div className="glass-static rounded-[var(--radius-lg)] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={15} className="text-[var(--accent)]" />
                  <h3 className="text-[13.5px] font-semibold text-white">Data Quality Score</h3>
                </div>
                {briefing?.data_quality_score != null ? (
                  <div className="flex items-center gap-4">
                    <AnimatedCounter value={briefing.data_quality_score} className="text-3xl font-bold text-white" />
                    <span className="text-[12px]" style={{ color: "var(--muted)" }}>/ 100 · across your datasets</span>
                  </div>
                ) : (
                  <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No dataset profiled yet. Upload a dataset to score its quality.</p>
                )}
              </div>
              <ConfidenceGauge value={briefing?.ai_confidence ?? 0} />
            </div>
          </div>

          {/* Top alert + recommendations */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <FadeUp>
                <div className="glass-static rounded-[var(--radius-xl)] p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Bell size={15} className="text-[var(--accent)]" />
                    <h3 className="text-[14px] font-semibold text-white">Top Alert</h3>
                  </div>
                  {briefing?.top_alert ? (
                    <div
                      className="rounded-[var(--radius-md)] p-4"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-red-400" />
                        <p className="text-[13.5px] font-semibold text-white">{briefing.top_alert.name}</p>
                      </div>
                      <p className="mt-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
                        {briefing.top_alert.metric} · {briefing.top_alert.condition}
                      </p>
                      {briefing.top_alert.payload?.delta_pct != null && (
                        <p className="mt-2 text-[12px]" style={{ color: "var(--text-soft)" }}>
                          Latest reading: <strong className="text-white">{briefing.top_alert.payload.latest}</strong> ({briefing.top_alert.payload.delta_pct}% {briefing.top_alert.payload.direction})
                        </p>
                      )}
                      <Link href="/alerts" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-white hover:underline">
                        Manage alerts <ArrowRight size={12} />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <Sparkles size={20} className="text-[var(--accent)]" />
                      <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No active alerts. You're all clear.</p>
                      <Link href="/alerts" className="text-[12px] font-medium text-white hover:underline">Create an alert →</Link>
                    </div>
                  )}
                </div>
              </FadeUp>
            </div>

            <div className="xl:col-span-7">
              <FadeUp delay={0.05}>
                <div className="surface-3 rounded-[var(--radius-xl)] p-5">
                  <div className="mb-3.5 flex items-center gap-2.5">
                    <Lightbulb size={15} className="text-[var(--accent)]" />
                    <h3 className="text-[14px] font-semibold text-white">Today's Recommendations</h3>
                  </div>
                  <div className="space-y-2.5">
                    {(briefing?.recommendations || []).map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: i * 0.06 }}
                        className="flex items-start gap-2.5 rounded-xl p-3 text-[13px] leading-relaxed"
                        style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--text-soft)" }}
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: "var(--gradient-brand)" }}>
                          {i + 1}
                        </span>
                        {r}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
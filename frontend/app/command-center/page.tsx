"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, TrendingUp, TrendingDown, Minus, AlertOctagon, Sparkles,
  RefreshCw, FileText, Lightbulb, Database, ArrowRight, Clock,
  CheckCircle2, Zap,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import { FadeUp, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/motion/primitives";
import { ShimmerLine } from "@/components/ui/shimmer-skeleton";
import EmptyState from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api";

type Weather = { status: "Healthy" | "Stable" | "Warning" | "Critical"; label: string; color: string };
type KPI = { key: string; label: string; value: number | null; delta: number | null; direction: "up" | "down" | "flat"; has_data: boolean };
type Alert = { id: number; name: string; severity: string; metric: string; business_impact: string | null; recommended_action: string | null };
type Forecast = { metric: string; horizon: number; trend: string; last_actual: number | null; final_forecast: number | null; business_explanation: string | null };
type Report = { id: number; title: string; report_type: string; executive_summary: string | null; created_at: string | null };
type Dataset = { id: number; name: string; health_score: number | null; quality_score: number | null; row_count: number | null; profiled: boolean };
type TimelineEv = { type: string; title: string; detail: string | null; at: string | null };
type Rec = { id: number; title: string; priority: string; category: string | null; status: string; source: string | null };

type Payload = {
  weather: Weather;
  scores: {
    business_health: number | null; overall_status: string | null;
    revenue: number | null; growth: number | null; risk: number | null; ai_confidence: number;
  };
  health_dimensions: Record<string, { score: number; status: string; dot: string; detail: string }>;
  critical_alerts: Alert[];
  forecasts: Forecast[];
  recommendations: { pending: Rec[]; recently_accepted: Rec[]; pending_count: number };
  recent_reports: Report[];
  live_kpis: KPI[];
  dataset_status: Dataset[];
  activity_timeline: TimelineEv[];
  ai_summary: string;
  ai_headline: string;
  cached_at: string | null;
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };
const SEV_COLOR: Record<string, string> = { critical: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };

export default function CommandCenterPage() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async (force = false) => {
    if (!force) setLoading(true);
    else setRefreshing(true);
    try {
      const d = await apiFetch<Payload>(`/api/command-center${force ? "?force=true" : ""}`);
      setData(d);
    } catch (e: any) {
      toast.error(e.message || "Failed to load Command Center");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const h = () => load();
    window.addEventListener("ws-notification", h);
    return () => window.removeEventListener("ws-notification", h);
  }, [load]);

  return (
    <AppShell
      title="Command Center"
      description="Your business at a glance — health, alerts, forecasts, and what to do next."
      actions={
        <button
          type="button" onClick={() => load(true)} disabled={refreshing}
          className="tool-btn" style={{ color: "var(--accent)", borderColor: "rgba(99,102,241,0.4)" }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      }
    >
      {loading ? <LoadingState /> : !data ? (
        <EmptyState icon={<Activity size={22} />} title="No data yet" description="Upload a dataset and ask the copilot a few questions to populate your Command Center." />
      ) : (
        <div className="space-y-5">
          {/* Weather hero */}
          <WeatherHero data={data} />

          {/* Score rings */}
          <FadeUp>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <ScoreRing label="Business Health" value={data.scores.business_health} suffix="/100" color="#22c55e" Icon={Activity} />
              <ScoreRing label="Revenue" value={data.scores.revenue} suffix="/100" color="#8b5cf6" Icon={TrendingUp} />
              <ScoreRing label="Growth" value={data.scores.growth} suffix="/100" color="#3b82f6" Icon={Zap} />
              <ScoreRing label="Risk" value={data.scores.risk} suffix="/100" color="#ef4444" Icon={AlertOctagon} invert />
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Left/main column: alerts + KPIs + timeline */}
            <div className="space-y-5 xl:col-span-2">
              <CriticalAlerts alerts={data.critical_alerts} />
              <LiveKPIs kpis={data.live_kpis} />
              <ActivityTimeline events={data.activity_timeline} />
            </div>

            {/* Right column: forecasts + recs + reports + datasets + AI confidence */}
            <div className="space-y-5">
              <AIConfidenceCard confidence={data.scores.ai_confidence} summary={data.ai_summary} headline={data.ai_headline} />
              <ForecastMini forecasts={data.forecasts} />
              <RecommendationsMini recs={data.recommendations} />
              <RecentReports reports={data.recent_reports} />
              <DatasetStatus datasets={data.dataset_status} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="glass-static rounded-[var(--radius-2xl)] p-6"><ShimmerLine className="w-1/2" /><div className="mt-3"><ShimmerLine /></div></div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="glass-static rounded-[var(--radius-lg)] p-5"><ShimmerLine /><div className="mt-3 h-20" /></div>)}</div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="glass-static rounded-[var(--radius-xl)] p-5 xl:col-span-1" style={i === 0 ? { gridColumn: "span 2" } : {}}><ShimmerLine /><div className="mt-3 space-y-2">{[0, 1, 2].map((j) => <ShimmerLine key={j} />)}</div></div>)}</div>
    </div>
  );
}

function WeatherHero({ data }: { data: Payload }) {
  const w = data.weather;
  return (
    <FadeUp>
      <div className="glass-static relative overflow-hidden rounded-[var(--radius-2xl)] p-6"
        style={{ border: `1px solid ${w.color}40` }}>
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: `${w.color}22` }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: `${w.color}1a`, border: `1px solid ${w.color}40` }}>
              <span className="dot-live" style={{ background: w.color, boxShadow: `0 0 16px ${w.color}` }} />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{w.label}</h1>
                <span className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>· business status</span>
              </div>
              <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                {data.ai_summary || "Your Command Center is ready."}
              </p>
              {data.ai_headline && (
                <p className="mt-1.5 text-[12px] font-medium" style={{ color: w.color }}>
                  {data.ai_headline}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <MiniStat label="Health" value={data.scores.business_health} suffix="/100" />
            <MiniStat label="Critical" value={data.critical_alerts.length} />
            <MiniStat label="Open recs" value={data.recommendations.pending_count} />
          </div>
        </div>
      </div>
    </FadeUp>
  );
}

function MiniStat({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="text-right">
      <p className="text-[10.5px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</p>
      <p className="text-lg font-bold text-white">
        <AnimatedCounter value={value ?? 0} decimals={Number.isInteger(value) ? 0 : 1} />
        {suffix}
      </p>
    </div>
  );
}

function ScoreRing({ label, value, suffix, color, Icon, invert }: {
  label: string; value: number | null; suffix: string; color: string; Icon: any; invert?: boolean;
}) {
  const v = value ?? 0;
  const pct = Math.max(0, Math.min(100, v)) / 100;
  const size = 92, stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // For risk, higher is worse → show red fill proportionally; for others, higher is better.
  const displayColor = color;
  return (
    <div className="glass-static rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}1a`, color }}>
          <Icon size={14} />
        </span>
        <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <motion.circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={displayColor} strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={c}
              initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
            <AnimatedCounter value={v} decimals={Number.isInteger(v) ? 0 : 1} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px]" style={{ color: "var(--muted-2)" }}>{suffix}</p>
          <p className="mt-0.5 text-[11px]" style={{ color: invert ? (v >= 60 ? "#ef4444" : v >= 30 ? "#f59e0b" : "#22c55e") : (v >= 70 ? "#22c55e" : v >= 50 ? "#f59e0b" : "#ef4444") }}>
            {invert ? (v >= 60 ? "High" : v >= 30 ? "Moderate" : "Low") : (v >= 70 ? "Strong" : v >= 50 ? "Watch" : "Weak")}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, Icon, children, action }: { title: string; Icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <FadeUp>
      <div className="glass-static rounded-[var(--radius-xl)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={15} className="text-[var(--accent)]" />
            <h3 className="text-[14px] font-semibold text-white">{title}</h3>
          </div>
          {action}
        </div>
        {children}
      </div>
    </FadeUp>
  );
}

function CriticalAlerts({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) {
    return (
      <SectionCard title="Critical alerts" Icon={AlertOctagon}>
        <div className="flex items-center gap-2 rounded-lg p-3" style={{ background: "rgba(34,197,94,0.06)" }}>
          <CheckCircle2 size={15} className="text-[#22c55e]" />
          <p className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>No critical alerts — all clear.</p>
        </div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Critical alerts" Icon={AlertOctagon} action={<Link href="/alerts" className="text-[11px] text-[var(--accent)]">View all <ArrowRight size={11} className="inline" /></Link>}>
      <StaggerContainer className="space-y-2.5">
        {alerts.map((a) => (
          <StaggerItem key={a.id}>
            <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${SEV_COLOR[a.severity] || "#f59e0b"}` }}>
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${SEV_COLOR[a.severity] || "#f59e0b"}1a`, color: SEV_COLOR[a.severity] || "#f59e0b" }}>{a.severity}</span>
                <span className="text-[13px] font-semibold text-white">{a.name}</span>
              </div>
              {a.business_impact && <p className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>{a.business_impact}</p>}
              {a.recommended_action && <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--accent)" }}>→ {a.recommended_action}</p>}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </SectionCard>
  );
}

function LiveKPIs({ kpis }: { kpis: KPI[] }) {
  const withData = kpis.filter((k) => k.has_data);
  if (!withData.length) {
    return (
      <SectionCard title="Live KPIs" Icon={TrendingUp}>
        <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No KPI data yet. Ask the copilot about your revenue, orders, or customers.</p>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Live KPIs" Icon={TrendingUp}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => {
          const Icon = TREND_ICON[k.direction] || Minus;
          const dirColor = k.direction === "up" ? "#22c55e" : k.direction === "down" ? "#ef4444" : "#8a90b5";
          return (
            <div key={k.key} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-soft)" }}>
              <p className="text-[10.5px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{k.label}</p>
              <p className="mt-1 text-xl font-bold text-white">
                <AnimatedCounter value={k.value ?? 0} decimals={Number.isInteger(k.value) ? 0 : 2} />
              </p>
              <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: dirColor }}>
                <Icon size={12} />
                <span>{k.delta != null ? `${k.delta > 0 ? "+" : ""}${k.delta}%` : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function ActivityTimeline({ events }: { events: TimelineEv[] }) {
  if (!events.length) return null;
  const ICON: Record<string, any> = { query: Sparkles, alert_event: AlertOctagon, report: FileText, recommendation: Lightbulb };
  const COLOR: Record<string, string> = { query: "#8b5cf6", alert_event: "#ef4444", report: "#3b82f6", recommendation: "#22c55e" };
  return (
    <SectionCard title="Activity timeline" Icon={Clock}>
      <StaggerContainer className="relative space-y-3 pl-4">
        <span className="absolute left-1 top-1 bottom-1 w-px" style={{ background: "var(--border-soft)" }} />
        {events.map((e, i) => {
          const Icon = ICON[e.type] || Sparkles;
          const color = COLOR[e.type] || "#8a90b5";
          return (
            <StaggerItem key={i}>
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-3.5 mt-1 flex h-3 w-3 items-center justify-center rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon size={12} style={{ color }} />
                    <p className="truncate text-[12.5px] font-medium text-white">{e.title}</p>
                  </div>
                  {(e.detail || e.at) && (
                    <p className="mt-0.5 text-[11px]" style={{ color: "var(--muted-2)" }}>
                      {e.detail ? `${e.detail} · ` : ""}{e.at ? new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  )}
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </SectionCard>
  );
}

function AIConfidenceCard({ confidence, summary, headline }: { confidence: number; summary: string; headline: string }) {
  const pct = Math.round((confidence || 0) * 100);
  const color = pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <SectionCard title="AI confidence" Icon={Sparkles}>
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <svg width={56} height={56} className="-rotate-90">
            <circle cx={28} cy={28} r={22} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
            <motion.circle cx={28} cy={28} r={22} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 22} initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - (confidence || 0)) }} transition={{ duration: 1 }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-white">{pct}%</span>
        </div>
        <div>
          <p className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>{headline || "AI analysis active"}</p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--muted-2)" }}>Based on data coverage & signal quality.</p>
        </div>
      </div>
    </SectionCard>
  );
}

function ForecastMini({ forecasts }: { forecasts: Forecast[] }) {
  if (!forecasts.length) return null;
  return (
    <SectionCard title="Forecast outlook" Icon={TrendingUp} action={<Link href="/forecasts" className="text-[11px] text-[var(--accent)]">All <ArrowRight size={11} className="inline" /></Link>}>
      <div className="space-y-2.5">
        {forecasts.map((f, i) => {
          const color = (f.trend || "").toLowerCase() === "up" ? "#22c55e" : (f.trend || "").toLowerCase() === "down" ? "#ef4444" : "#f59e0b";
          const Icon = (f.trend || "").toLowerCase() === "up" ? TrendingUp : (f.trend || "").toLowerCase() === "down" ? TrendingDown : Minus;
          return (
            <div key={i} className="flex items-center justify-between rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color }} />
                <span className="text-[12.5px] font-medium capitalize text-white">{(f.metric || "").replace("_", " ")}</span>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold text-white"><AnimatedCounter value={f.final_forecast ?? 0} decimals={Number.isInteger(f.final_forecast) ? 0 : 1} /></p>
                <p className="text-[10px] capitalize" style={{ color }}>{f.trend}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function RecommendationsMini({ recs }: { recs: Payload["recommendations"] }) {
  const all = [...(recs.pending || []), ...(recs.recently_accepted || [])].slice(0, 4);
  if (!all.length) return null;
  const PRI: Record<string, string> = { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#64748b" };
  return (
    <SectionCard title="Recommendations" Icon={Lightbulb} action={<Link href="/recommendations" className="text-[11px] text-[var(--accent)]">All <ArrowRight size={11} className="inline" /></Link>}>
      <div className="space-y-2">
        {all.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRI[r.priority] || "#64748b" }} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">{r.title}</span>
            <span className="text-[10px] capitalize" style={{ color: "var(--muted-2)" }}>{r.status}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function RecentReports({ reports }: { reports: Report[] }) {
  if (!reports.length) return null;
  return (
    <SectionCard title="Recent reports" Icon={FileText} action={<Link href="/reports" className="text-[11px] text-[var(--accent)]">All <ArrowRight size={11} className="inline" /></Link>}>
      <div className="space-y-2">
        {reports.map((r) => (
          <Link key={r.id} href="/reports" className="block rounded-lg p-2.5 transition hover:bg-white/[0.04]" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="truncate text-[12.5px] font-medium text-white">{r.title}</p>
            <p className="mt-0.5 text-[10.5px] capitalize" style={{ color: "var(--muted-2)" }}>
              {r.report_type} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
            </p>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

function DatasetStatus({ datasets }: { datasets: Dataset[] }) {
  if (!datasets.length) return null;
  return (
    <SectionCard title="Dataset status" Icon={Database} action={<Link href="/datasets" className="text-[11px] text-[var(--accent)]">All <ArrowRight size={11} className="inline" /></Link>}>
      <div className="space-y-2">
        {datasets.map((d) => {
          const h = d.health_score;
          const color = h == null ? "#8a90b5" : h >= 80 ? "#22c55e" : h >= 60 ? "#f59e0b" : "#ef4444";
          return (
            <div key={d.id} className="flex items-center justify-between rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium text-white">{d.name}</p>
                <p className="text-[10.5px]" style={{ color: "var(--muted-2)" }}>
                  {d.profiled ? `${d.row_count ?? "—"} rows` : "Profiling…"}
                </p>
              </div>
              {h != null ? (
                <span className="text-[13px] font-bold" style={{ color }}>
                  <AnimatedCounter value={h} decimals={0} />/100
                </span>
              ) : (
                <span className="text-[11px]" style={{ color: "var(--muted-2)" }}>—</span>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
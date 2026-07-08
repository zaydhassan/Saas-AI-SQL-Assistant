"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Database, ShieldCheck, ScanLine, BarChart3,
  Lightbulb, HelpCircle, Layers, RefreshCw, AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AnimatedCounter } from "@/components/motion/primitives";
import { ShimmerKPI, ShimmerLine, ShimmerBlock } from "@/components/ui/shimmer-skeleton";
import EmptyState from "@/components/ui/empty-state";

type ColumnProfile = {
  name: string;
  dtype: string;
  missing_pct?: number;
  unique?: number;
  outliers?: number;
  is_numeric?: boolean;
  mean?: number | null;
  max?: number | null;
  min?: number | null;
};

type Intelligence = {
  summary?: string;
  row_count?: number;
  column_count?: number;
  columns?: ColumnProfile[];
  primary_key_candidate?: string | null;
  duplicate_rows?: number;
  numeric_columns?: string[];
  categorical_columns?: string[];
  business_entities?: string[];
  relationships?: { from_column?: string; to_entity?: string; confidence?: string }[];
  suggested_kpis?: string[];
  suggested_dashboards?: string[];
  suggested_charts?: { title?: string; type?: string; x?: string; y?: string }[];
  suggested_questions?: string[];
  suggested_metrics?: string[];
  data_quality_score?: number;
  dataset_health_score?: number;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function Ring({ value, label, color }: { value: number; label: string; color: string }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
          <motion.circle
            cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: circ * (1 - (value ?? 0) / 100) }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        </svg>
        <div className="absolute">
          <AnimatedCounter value={value ?? 0} className="text-lg font-bold text-white" />
        </div>
      </div>
      <span className="mt-2 text-[11px] font-medium" style={{ color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

function CardShell({ icon, title, accent, children, delay }: {
  icon: React.ReactNode; title: string; accent: string; children: React.ReactNode; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="surface-3 rounded-[var(--radius-lg)] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span style={{ color: accent }}>{icon}</span>
        <h4 className="text-[13px] font-semibold text-white">{title}</h4>
      </div>
      {children}
    </motion.div>
  );
}

function ChipList({ items, accent }: { items?: string[]; accent: string }) {
  if (!items || items.length === 0)
    return <p className="text-[12px]" style={{ color: "var(--muted)" }}>None suggested.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.slice(0, 8).map((it, i) => (
        <span
          key={i}
          className="rounded-full px-2.5 py-1 text-[11.5px]"
          style={{ background: `${accent}14`, border: `1px solid ${accent}33`, color: "var(--text-soft)" }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

export default function DatasetIntelligence({ datasetId }: { datasetId: string }) {
  const [data, setData] = React.useState<Intelligence | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "empty" | "error">("loading");
  const [analyzing, setAnalyzing] = React.useState(false);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch<Intelligence>(`/api/datasets/${datasetId}/intelligence`);
      setData(res);
      setStatus("ready");
    } catch (e: any) {
      // 404 => not analyzed yet
      setStatus("empty");
    }
  }, [datasetId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function analyzeNow() {
    setAnalyzing(true);
    try {
      const res = await apiFetch<Intelligence>(`/api/datasets/${datasetId}/analyze`, { method: "POST" });
      setData(res);
      setStatus("ready");
    } catch (e: any) {
      setStatus("error");
    } finally {
      setAnalyzing(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="surface-3 rounded-[var(--radius-xl)] p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)" }}>
            <ScanLine size={15} className="animate-pulse" />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-white">AI Dataset Intelligence</h3>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Analyzing your data…</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ShimmerKPI /><ShimmerKPI /><ShimmerKPI /><ShimmerKPI />
        </div>
        <div className="mt-4 space-y-3">
          <ShimmerLine /><ShimmerLine /><ShimmerLine className="w-2/3" />
        </div>
      </div>
    );
  }

  if (status === "empty" || status === "error") {
    return (
      <div className="surface-3 rounded-[var(--radius-xl)] p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)" }}>
            <Sparkles size={15} />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-white">AI Dataset Intelligence</h3>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>{status === "error" ? "Analysis failed — try again." : "Not analyzed yet"}</p>
          </div>
        </div>
        <EmptyState
          icon={status === "error" ? <AlertCircle size={26} /> : <ScanLine size={26} />}
          title={status === "error" ? "Couldn't analyze dataset" : "Unlock AI intelligence"}
          description={status === "error" ? "Something went wrong while profiling your data. Retry to generate column descriptions, KPIs, and quality scores." : "Run AI analysis to get a data quality score, column descriptions, business entities, and suggested KPIs, charts, and questions."}
          action={
            <button
              type="button"
              onClick={analyzeNow}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
            >
              <RefreshCw size={14} className={analyzing ? "animate-spin" : ""} />
              {analyzing ? "Analyzing…" : "Analyze now"}
            </button>
          }
          className="surface-2"
        />
      </div>
    );
  }

  const quality = data?.data_quality_score ?? 0;
  const health = data?.dataset_health_score ?? 0;
  const qColor = quality >= 85 ? "#22c55e" : quality >= 60 ? "#f59e0b" : "#ef4444";
  const hColor = health >= 85 ? "#22c55e" : health >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="surface-3 rounded-[var(--radius-xl)] p-5"
    >
      {/* header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}>
            <ScanLine size={15} />
          </span>
          <div>
            <h3 className="text-[14px] font-semibold text-white">AI Dataset Intelligence</h3>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>
              {data?.row_count ?? 0} rows · {data?.column_count ?? 0} columns
              {data?.primary_key_candidate ? ` · PK: ${data.primary_key_candidate}` : ""}
            </p>
          </div>
        </div>
        <button type="button" onClick={analyzeNow} disabled={analyzing} className="tool-btn" title="Re-analyze">
          <RefreshCw size={13} className={analyzing ? "animate-spin" : ""} />
        </button>
      </div>

      {data?.summary && (
        <p className="mb-4 rounded-[var(--radius-md)] p-3 text-[12.5px] leading-relaxed" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--text-soft)" }}>
          {data.summary}
        </p>
      )}

      {/* score rings + quick stats */}
      <div className="mb-5 flex flex-wrap items-center justify-around gap-4 rounded-[var(--radius-lg)] p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}>
        <Ring value={quality} label="Data Quality" color={qColor} />
        <Ring value={health} label="Dataset Health" color={hColor} />
        <div className="flex flex-col gap-2">
          <Stat icon={<Database size={13} />} label="Rows" value={data?.row_count ?? 0} />
          <Stat icon={<Layers size={13} />} label="Columns" value={data?.column_count ?? 0} />
          <Stat icon={<AlertCircle size={13} />} label="Duplicates" value={data?.duplicate_rows ?? 0} />
        </div>
      </div>

      {/* grid of intelligence */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardShell icon={<BarChart3 size={14} />} title="Suggested KPIs" accent="#6366f1" delay={0.05}>
          <ChipList items={data?.suggested_kpis} accent="#6366f1" />
        </CardShell>
        <CardShell icon={<Lightbulb size={14} />} title="Suggested Questions" accent="#8b5cf6" delay={0.1}>
          <ul className="space-y-1.5">
            {(data?.suggested_questions || []).slice(0, 6).map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: "var(--text-soft)" }}>
                <HelpCircle size={12} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                {q}
              </li>
            ))}
            {(!data?.suggested_questions || data.suggested_questions.length === 0) && (
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>None suggested.</p>
            )}
          </ul>
        </CardShell>
        <CardShell icon={<BarChart3 size={14} />} title="Suggested Charts" accent="#3b82f6" delay={0.15}>
          <ul className="space-y-1.5">
            {(data?.suggested_charts || []).slice(0, 6).map((c, i) => (
              <li key={i} className="text-[12.5px]" style={{ color: "var(--text-soft)" }}>
                <span className="font-medium text-white">{c.title}</span>
                <span style={{ color: "var(--muted)" }}> · {c.type} · {c.x} → {c.y}</span>
              </li>
            ))}
            {(!data?.suggested_charts || data.suggested_charts.length === 0) && (
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>None suggested.</p>
            )}
          </ul>
        </CardShell>
        <CardShell icon={<ShieldCheck size={14} />} title="Business Entities" accent="#22d3ee" delay={0.2}>
          <ChipList items={data?.business_entities} accent="#22d3ee" />
        </CardShell>
      </div>

      {/* column profiler */}
      {data?.columns && data.columns.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-[12.5px] font-semibold text-white">Column profiler</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.columns.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium text-white">{c.name}</span>
                  <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted)" }}>
                    {c.dtype}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px]" style={{ color: "var(--muted)" }}>
                  <span>{c.unique ?? 0} unique</span>
                  <span>{c.missing_pct ?? 0}% missing</span>
                  {c.is_numeric && c.mean != null && <span>μ {Math.round(Number(c.mean))}</span>}
                  {c.is_numeric && c.max != null && <span>max {Math.round(Number(c.max))}</span>}
                  {c.outliers != null && c.outliers > 0 && <span style={{ color: "#f59e0b" }}>{c.outliers} outliers</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span style={{ color: "var(--muted)" }}>{icon}</span>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-white">{value.toLocaleString()}</span>
    </div>
  );
}
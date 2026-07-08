"use client";

import * as React from "react";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, Target, Gauge,
  GitCompare, Lightbulb, Activity,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import { FadeUp, AnimatedCounter } from "@/components/motion/primitives";
import { ShimmerLine } from "@/components/ui/shimmer-skeleton";
import EmptyState from "@/components/ui/empty-state";
import ForecastChart from "@/components/forecast-chart";
import { apiFetch } from "@/lib/api";

const METRICS = [
  "revenue", "sales", "profit", "demand", "inventory",
  "customers", "churn", "subscriptions", "cash_flow",
];

const HORIZONS = [7, 14, 30, 90];

type ForecastPayload = {
  metric: string;
  horizon: number;
  history: { label: string; value: number }[];
  points: { step: number; value: number; lower: number; upper: number }[];
  confidence_interval: { sigma: number; z: number };
  accuracy_mape: number | null;
  historical_comparison: {
    last_actual: number | null;
    forecast_end: number | null;
    delta_pct: number | null;
    history_min: number | null;
    history_max: number | null;
    history_points: number;
  };
  trend: "up" | "down" | "flat";
  business_explanation: string;
  recommended_actions: string[];
  last_actual: number | null;
  final_forecast: number | null;
};

const TREND_STYLE = {
  up: { color: "#22c55e", Icon: TrendingUp, label: "Trending up" },
  down: { color: "#ef4444", Icon: TrendingDown, label: "Trending down" },
  flat: { color: "#f59e0b", Icon: Minus, label: "Flat" },
};

export default function ForecastsPage() {
  const [metric, setMetric] = React.useState("revenue");
  const [horizon, setHorizon] = React.useState(30);
  const [data, setData] = React.useState<ForecastPayload | null>(null);
  const [loading, setLoading] = React.useState(false);

  const generate = React.useCallback(async (m: string, h: number) => {
    setLoading(true);
    setData(null);
    try {
      const r = await apiFetch<{ id: number; metric: string; horizon: number; forecast: ForecastPayload }>(
        "/api/forecasts/generate",
        { method: "POST", body: { metric: m, horizon: h } },
      );
      setData(r.forecast);
    } catch (e: any) {
      toast.error(e.message || "Forecast failed — ask a few questions about this metric first.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { generate(metric, horizon); /* eslint-disable-next-line */ }, []);

  const trend = data ? TREND_STYLE[data.trend] : null;
  const TrendIcon = trend?.Icon;

  return (
    <AppShell
      title="Forecasting"
      description="AI predicts revenue, demand, churn, and more — with confidence intervals and recommended actions."
    >
      <div className="space-y-6">
        {/* Controls */}
        <FadeUp>
          <div className="glass-static rounded-[var(--radius-lg)] p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--accent)]" />
              <p className="text-[13px] font-semibold text-white">Forecast a metric</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {METRICS.map((m) => (
                <button key={m} type="button" onClick={() => { setMetric(m); generate(m, horizon); }}
                  className="meta-badge capitalize"
                  style={{
                    background: metric === m ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    color: metric === m ? "#c4b5fd" : "var(--muted)",
                    border: `1px solid ${metric === m ? "rgba(99,102,241,0.4)" : "var(--border-soft)"}`,
                  }}>
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Horizon</p>
              <div className="seg mt-2" role="tablist" aria-label="Forecast horizon">
                {HORIZONS.map((h) => (
                  <button key={h} role="tab" type="button" aria-selected={horizon === h}
                    onClick={() => { setHorizon(h); generate(metric, h); }} className="seg-item">
                    {h} periods
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Result */}
        {loading ? (
          <div className="glass-static rounded-[var(--radius-lg)] p-6">
            <ShimmerLine className="w-40" />
            <div className="mt-4 h-72 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }} />
            <div className="mt-4 grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <ShimmerLine key={i} />)}</div>
          </div>
        ) : !data ? (
          <EmptyState
            icon={<TrendingUp size={22} />}
            title="No forecast yet"
            description="Pick a metric above. The AI fits a trend model to your recent data and projects it forward with a confidence band. Ask a few questions about the metric first so there's data to model."
          />
        ) : (
          <div className="space-y-5">
            {/* Hero chart card */}
            <FadeUp>
              <div className="glass-static rounded-[var(--radius-2xl)] p-5 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold capitalize text-white">{data.metric.replace("_", " ")} forecast</h2>
                    <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--muted)" }}>
                      {data.horizon}-period projection · {data.history.length} history points
                    </p>
                  </div>
                  {trend && TrendIcon && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
                      style={{ background: `${trend.color}1a`, color: trend.color, border: `1px solid ${trend.color}40` }}>
                      <TrendIcon size={14} /> {trend.label}
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <ForecastChart history={data.history} points={data.points} height={340} />
                </div>

                <p className="mt-3 text-[12px]" style={{ color: "var(--muted-2)" }}>
                  Solid line = actual history · dashed line = forecast · shaded band = 95% confidence interval.
                </p>
              </div>
            </FadeUp>

            {/* Metric cards */}
            <FadeUp>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={<Activity size={16} />} label="Last actual" value={data.last_actual}
                  color="#8b5cf6" />
                <MetricCard icon={<TrendingUp size={16} />} label="Forecast end" value={data.final_forecast}
                  color="#3b82f6" suffix={` (${(data.historical_comparison.delta_pct ?? 0) > 0 ? "+" : ""}${data.historical_comparison.delta_pct ?? "—"}%)`}
                  deltaColor={(data.historical_comparison.delta_pct ?? 0) >= 0 ? "#22c55e" : "#ef4444"} />
                <MetricCard icon={<Gauge size={16} />} label="Accuracy (MAPE)" value={data.accuracy_mape}
                  color="#22c55e" suffix={data.accuracy_mape != null ? "%" : ""} hint="lower is better" />
                <MetricCard icon={<Target size={16} />} label="Confidence (σ)" value={data.confidence_interval?.sigma}
                  color="#f59e0b" hint="band half-width" />
              </div>
            </FadeUp>

            {/* Explanation + comparison */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <FadeUp>
                <div className="glass-static rounded-[var(--radius-xl)] p-5">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={15} className="text-[var(--accent)]" />
                    <h3 className="text-[14px] font-semibold text-white">Business explanation</h3>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                    {data.business_explanation}
                  </p>
                  {data.recommended_actions.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Recommended actions</p>
                      <ul className="space-y-1.5">
                        {data.recommended_actions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: "var(--text-soft)" }}>
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#22c55e" }} />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </FadeUp>

              <FadeUp>
                <div className="glass-static rounded-[var(--radius-xl)] p-5">
                  <div className="flex items-center gap-2">
                    <GitCompare size={15} className="text-[var(--accent)]" />
                    <h3 className="text-[14px] font-semibold text-white">Historical comparison</h3>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <CompareRow label="Last actual" value={data.historical_comparison.last_actual} />
                    <CompareRow label="Forecast end" value={data.historical_comparison.forecast_end} />
                    <CompareRow label="History min" value={data.historical_comparison.history_min} />
                    <CompareRow label="History max" value={data.historical_comparison.history_max} />
                    <div className="flex items-center justify-between rounded-lg p-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>Projected change</span>
                      <span className="text-[14px] font-bold"
                        style={{ color: (data.historical_comparison.delta_pct ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                        {(data.historical_comparison.delta_pct ?? 0) > 0 ? "+" : ""}{data.historical_comparison.delta_pct ?? "—"}%
                      </span>
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon, label, value, color, suffix, hint, deltaColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  color: string;
  suffix?: string;
  hint?: string;
  deltaColor?: string;
}) {
  const v = value ?? 0;
  const isInt = Number.isInteger(value);
  return (
    <div className="glass-static rounded-[var(--radius-lg)] p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}1a`, color }}>
          {icon}
        </span>
        <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
      </div>
      <p className="mt-2.5 text-2xl font-bold text-white">
        <AnimatedCounter value={v} decimals={isInt ? 0 : 2} />
        {suffix && <span className="ml-0.5 text-[13px]" style={{ color: deltaColor || "var(--muted)" }}>{suffix}</span>}
      </p>
      {hint && <p className="mt-0.5 text-[11px]" style={{ color: "var(--muted-2)" }}>{hint}</p>}
    </div>
  );
}

function CompareRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-semibold text-white">{value == null ? "—" : <AnimatedCounter value={value} decimals={Number.isInteger(value) ? 0 : 2} />}</span>
    </div>
  );
}
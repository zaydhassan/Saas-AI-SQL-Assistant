"use client";

import { AlertTriangle, ShieldAlert, Activity } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import ChartCard from "@/components/ui/chart-card";
import EmptyState from "@/components/ui/empty-state";
import { FadeUp } from "@/components/motion/primitives";
import { mockAnomalies } from "@/lib/mock";

const sevColor: Record<string, { bg: string; fg: string; border: string }> = {
  high: { bg: "rgba(239,68,68,0.14)", fg: "#f87171", border: "rgba(239,68,68,0.3)" },
  medium: { bg: "rgba(245,158,11,0.14)", fg: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  low: { bg: "rgba(34,197,94,0.14)", fg: "#34d399", border: "rgba(34,197,94,0.3)" },
};

export default function AnomaliesPage() {
  return (
    <AppShell
      title="Anomaly Detection"
      description="Statistical anomalies flagged automatically across your metrics."
    >
      <div className="space-y-6">
        <FadeUp>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { l: "Active anomalies", v: "3", icon: <AlertTriangle size={16} /> },
              { l: "High severity", v: "1", icon: <ShieldAlert size={16} /> },
              { l: "Monitored metrics", v: "12", icon: <Activity size={16} /> },
            ].map((s) => (
              <div key={s.l} className="glass-static rounded-[var(--radius-lg)] p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}>
                  {s.icon}
                </span>
                <p className="mt-3 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.l}</p>
                <p className="mt-1 text-2xl font-bold text-white">{s.v}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        <ChartCard title="Detected anomalies" subtitle="Ranked by severity">
          {mockAnomalies.length === 0 ? (
            <EmptyState icon={<Activity size={26} />} title="No anomalies detected" description="Your metrics are within expected ranges." />
          ) : (
            <div className="space-y-3">
              {mockAnomalies.map((a, i) => {
                const c = sevColor[a.severity];
                return (
                  <FadeUp key={i} delay={i * 0.05}>
                    <div className="flex items-start gap-4 rounded-[var(--radius-lg)] p-4" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.08)", color: c.fg }}>
                        <AlertTriangle size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{a.metric}</p>
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.08)", color: c.fg }}>{a.severity}</span>
                        </div>
                        <p className="mt-1 text-sm" style={{ color: "var(--text-soft)" }}>{a.detail}</p>
                        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{a.date} · {a.delta} vs baseline</p>
                      </div>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>
    </AppShell>
  );
}
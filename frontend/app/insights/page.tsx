"use client";

import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, Sparkles, Brain, Target, DollarSign, ShoppingCart, Receipt, Wallet, ArrowUpRight } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import ChartCard from "@/components/ui/chart-card";
import Sparkline from "@/components/ui/sparkline";
import { AnimatedCounter, FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { mockTrend, mockForecast, mockRootCause } from "@/lib/mock";

const KPIS = [
  { l: "Revenue (MTD)", v: 71500, p: "$", d: "+11%", icon: <DollarSign size={15} />, color: "#6366f1", spark: [42, 48, 45, 54, 58, 64, 71] },
  { l: "Orders", v: 560, p: "", d: "+8%", icon: <ShoppingCart size={15} />, color: "#22d3ee", spark: [30, 34, 32, 40, 44, 48, 56] },
  { l: "Avg order value", v: 128, p: "$", d: "+3%", icon: <Receipt size={15} />, color: "#8b5cf6", spark: [118, 120, 122, 124, 125, 126, 128] },
  { l: "Forecast (next mo)", v: 74800, p: "$", d: "+5%", icon: <Wallet size={15} />, color: "#f472b6", spark: [60, 64, 66, 68, 70, 72, 74] },
];

export default function InsightsPage() {
  return (
    <AppShell
      title="Business Insights"
      description="AI-generated insights, trends, and forecasts from your data."
    >
      <div className="space-y-6">
        {/* KPI row */}
        <StaggerContainer className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => (
            <StaggerItem key={k.l}>
              <div className="surface-3 group relative overflow-hidden rounded-[var(--radius-xl)] p-5">
                <div className="flex items-start justify-between">
                  <span className="icon-tile h-9 w-9">{k.icon}</span>
                  <span className="delta delta-up">
                    <ArrowUpRight size={12} /> {k.d}
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>{k.l}</p>
                    <p className="mt-1 text-[24px] font-bold leading-none tracking-tight text-white">
                      <AnimatedCounter value={k.v} prefix={k.p} />
                    </p>
                  </div>
                  <div className="w-20 shrink-0">
                    <Sparkline data={k.spark} color={k.color} height={34} />
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ChartCard className="xl:col-span-2" title="Revenue trend" subtitle="Last 7 months" badge="Trend">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Forecast" subtitle="Next 3 months" badge="AI">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockForecast} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="actual" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Root cause analysis" subtitle="Factors driving the latest spike">
            <div className="space-y-4">
              {mockRootCause.map((r) => (
                <div key={r.factor}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-white">{r.factor}</span>
                    <span style={{ color: "var(--muted)" }}>{r.contribution}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${r.contribution}%`, background: "var(--gradient-brand)" }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Orders by month" subtitle="Volume trend">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mockTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8a90b5", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.1)" }} />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* AI recommendations */}
        <FadeUp>
          <div className="rounded-[var(--radius-xl)] p-6" style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.14), rgba(139,92,246,0.04))", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}>
                <Brain size={16} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">AI Recommendations</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Generated from your trends & anomalies</p>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                "Revenue is trending up 11% MoM — consider forecasting inventory for Q3.",
                "Order volume spikes every Friday — staff support accordingly.",
                "Refund rate rose 22% on Jun 28 — investigate the affected batch.",
                "AOV dipped 12% during the promo — review discount strategy.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 rounded-[var(--radius-sm)] p-3.5 text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-soft)" }}>
                  <Target size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </FadeUp>
      </div>
    </AppShell>
  );
}

const tooltipStyle = {
  background: "rgba(10,14,35,0.95)",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  color: "#eef1ff",
  fontSize: 12,
};
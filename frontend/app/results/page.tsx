"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Share2, Download, FileText, Save, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Table2, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import ChartCard from "@/components/ui/chart-card";
import DataTable from "@/components/ui/data-table";
import { AnimatedCounter, FadeUp } from "@/components/motion/primitives";
import { mockResultsRows, mockRecommendations } from "@/lib/mock";

export default function ResultsPage() {
  return (
    <AppShell
      title="Analysis"
      description="Interactive results, charts, business insights, and AI recommendations."
    >
      <div className="space-y-6">
        {/* Action bar */}
        <FadeUp>
          <div className="glass-static flex flex-wrap items-center gap-2 rounded-[var(--radius-xl)] p-4">
            <div className="mr-auto flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}>
                <Sparkles size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Monthly revenue</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>7 rows · generated just now</p>
              </div>
            </div>
            <ActionBtn icon={<Save size={14} />} label="Save report" onClick={() => toast.success("Saved to reports")} />
            <ActionBtn icon={<Share2 size={14} />} label="Share" onClick={() => toast.info("Share link copied")} />
            <ActionBtn icon={<FileText size={14} />} label="PDF" onClick={() => toast.info("Generating PDF…")} />
            <ActionBtn icon={<Download size={14} />} label="Export CSV" onClick={() => toast.success("Export started")} primary />
          </div>
        </FadeUp>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { l: "Total revenue", v: 414200, p: "$", icon: <TrendingUp size={15} /> },
            { l: "Total orders", v: 2977, p: "", icon: <BarChart3 size={15} /> },
            { l: "Avg / month", v: 59171, p: "$", icon: <Table2 size={15} /> },
            { l: "Anomalies", v: 1, p: "", icon: <AlertTriangle size={15} /> },
          ].map((k) => (
            <div key={k.l} className="glass-static rounded-[var(--radius-lg)] p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}>
                {k.icon}
              </span>
              <p className="mt-3 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{k.l}</p>
              <p className="mt-1 text-2xl font-bold text-white">
                <AnimatedCounter value={k.v} prefix={k.p} />
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Revenue trend" subtitle="By month">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={mockResultsRows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="res" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8a90b5", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8a90b5", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#res)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Orders by month" subtitle="Volume">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mockResultsRows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8a90b5", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8a90b5", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.1)" }} />
                <Bar dataKey="orders" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Interactive table */}
        <ChartCard title="Interactive table" subtitle="Sort and filter your results">
          <DataTable rows={mockResultsRows} />
        </ChartCard>

        {/* Business insights + recommendations */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartCard title="Business insights" subtitle="Trend & anomaly analysis">
            <ul className="space-y-3 text-sm" style={{ color: "var(--text-soft)" }}>
              <li className="flex items-start gap-2.5"><TrendingUp size={15} className="mt-0.5 text-[var(--accent)]" /> Revenue grew 70% from Jan to Jul — strong upward trend.</li>
              <li className="flex items-start gap-2.5"><AlertTriangle size={15} className="mt-0.5 text-amber-400" /> Apr dipped 6% vs Mar — investigate campaign pause.</li>
              <li className="flex items-start gap-2.5"><BarChart3 size={15} className="mt-0.5 text-[var(--accent)]" /> Orders and revenue move together — healthy growth.</li>
            </ul>
          </ChartCard>

          <ChartCard title="AI recommendations" subtitle="What to do next">
            <ul className="space-y-2.5">
              {mockRecommendations.map((r) => (
                <li key={r} className="flex items-start gap-2.5 rounded-[var(--radius-sm)] p-3 text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-soft)" }}>
                  <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-300" /> {r}
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>
    </AppShell>
  );
}

function ActionBtn({ icon, label, onClick, primary }: { icon: React.ReactNode; label: string; onClick?: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-2 text-sm font-medium text-white transition-colors"
      style={primary
        ? { background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }
        : { background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-soft)", boxShadow: "none" }}
    >
      {icon} {label}
    </button>
  );
}

const tooltipStyle = {
  background: "rgba(10,14,35,0.95)",
  border: "1px solid var(--border-soft)",
  borderRadius: 12,
  color: "#eef1ff",
  fontSize: 12,
};
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload, MessageSquare, FileText, Sparkles, ArrowRight, Pin, LayoutGrid,
  RefreshCw, Download, Plus, ChevronRight, TrendingUp, AlertTriangle, Activity,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import KPICards from "@/components/dashboard/KPICards";
import UsageChart from "@/components/dashboard/UsageChart";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import AIInsights from "@/components/dashboard/AIInsights";
import RecentQueries from "@/components/dashboard/RecentQueries";
import BusinessHealth from "@/components/business-health";
import { StaggerContainer, StaggerItem } from "@/components/motion/primitives";

const RANGES = ["Today", "7d", "30d", "Quarter"] as const;

const quickActions = [
  { icon: <Upload size={16} />, label: "Upload dataset", desc: "CSV · XLSX", href: "/playground" },
  { icon: <MessageSquare size={16} />, label: "Ask a question", desc: "Plain English → SQL", href: "/datasets" },
  { icon: <FileText size={16} />, label: "Saved reports", desc: "Export & share", href: "/reports" },
];

const suggestions = [
  "What are the top 5 products by revenue this month?",
  "Show week-over-week growth for the last 8 weeks",
  "Which customers haven't ordered in 30 days?",
];

const pinned = [
  { name: "Sales 2024", rows: "12,480 rows", tint: "#6366f1" },
  { name: "Customer churn", rows: "3,210 rows", tint: "#8b5cf6" },
  { name: "Inventory snapshot", rows: "8,902 rows", tint: "#22d3ee" },
];

export default function DashboardPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("7d");

  const actions = (
    <>
      <span className="hidden items-center gap-2 text-[12px] sm:inline-flex" style={{ color: "var(--muted)" }}>
        <span className="dot dot-live" /> Synced 2m ago
      </span>
      <div className="seg" role="tablist" aria-label="Date range">
        {RANGES.map((r) => (
          <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className="seg-item">
            {r}
          </button>
        ))}
      </div>
      <button className="tool-btn" onClick={() => toast.success("Dashboard refreshed")}>
        <RefreshCw size={14} /> Refresh
      </button>
      <button className="tool-btn" onClick={() => toast.info("Exporting dashboard…")}>
        <Download size={14} /> Export
      </button>
    </>
  );

  return (
    <AppShell
      title="Analytics Overview"
      description="High-level visibility into database usage, performance, and operational health."
      breadcrumb={[{ label: "Acme Analytics" }, { label: "Dashboard" }]}
      actions={actions}
    >
      <div className="space-y-6">
        <KPICards />

        {/* AI summary banner */}
        <div
          className="relative overflow-hidden rounded-[var(--radius-xl)] p-5"
          style={{
            background: "linear-gradient(110deg, rgba(99,102,241,0.16), rgba(139,92,246,0.06) 55%, rgba(59,130,246,0.1))",
            border: "1px solid rgba(99,102,241,0.28)",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
            >
              <Sparkles size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "#c7d2fe" }}>AI Summary</p>
              <p className="mt-1 text-[14px] leading-relaxed text-white">
                Query volume is up <strong className="text-emerald-300">12.4%</strong> week-over-week, with
                73% of queries completing under 100ms. One anomaly detected in revenue on Apr 14.
              </p>
            </div>
            <Link
              href="/insights"
              className="tool-btn shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(255,255,255,0.16)" }}
            >
              View insights <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((a) => (
            <StaggerItem key={a.label}>
              <Link href={a.href} className="surface-3 group flex items-center gap-3.5 rounded-[var(--radius-lg)] p-4 transition-transform hover:-translate-y-0.5">
                <span className="icon-tile h-10 w-10">
                  {a.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-white">{a.label}</span>
                  <span className="block text-[11.5px]" style={{ color: "var(--muted)" }}>{a.desc}</span>
                </span>
                <ArrowRight size={15} className="text-[var(--muted)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <UsageChart />
          </div>
          <div className="xl:col-span-4">
            <PerformanceChart />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-4">
            <BusinessHealth />

            <AIInsights />

            {/* AI suggestions */}
            <div className="surface-3 rounded-[var(--radius-xl)] p-5">
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={15} className="text-[var(--accent)]" />
                  <h3 className="text-[15px] font-semibold text-white">Suggested questions</h3>
                </div>
                <Link href="/datasets" className="text-[12px] hover:text-white" style={{ color: "var(--muted)" }}>
                  Try all
                </Link>
              </div>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <Link
                    key={s}
                    href="/datasets"
                    className="group flex items-start gap-2.5 rounded-xl p-3 text-[13px] transition-colors hover:bg-white/5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}
                  >
                    <ArrowRight size={14} className="mt-0.5 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
                    {s}
                  </Link>
                ))}
              </div>
            </div>

            {/* Pinned datasets */}
            <div className="surface-3 rounded-[var(--radius-xl)] p-5">
              <div className="mb-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Pin size={15} className="text-[var(--accent)]" />
                  <h3 className="text-[15px] font-semibold text-white">Pinned datasets</h3>
                </div>
                <Link href="/datasets" className="text-[12px] hover:text-white" style={{ color: "var(--muted)" }}>
                  Manage
                </Link>
              </div>
              <div className="space-y-2">
                {pinned.map((d) => (
                  <Link
                    key={d.name}
                    href="/datasets"
                    className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}
                  >
                    <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-white">
                      <span className="h-7 w-7 shrink-0 rounded-lg" style={{ background: `${d.tint}22`, border: `1px solid ${d.tint}44` }}>
                        <LayoutGrid size={14} className="m-auto mt-1.5" style={{ color: d.tint }} />
                      </span>
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="text-[11.5px]" style={{ color: "var(--muted)" }}>{d.rows}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:col-span-8">
            <RecentQueries />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
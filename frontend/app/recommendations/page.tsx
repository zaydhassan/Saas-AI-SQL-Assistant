"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, Lightbulb, Check, Bookmark, X, Target, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { ShimmerLine } from "@/components/ui/shimmer-skeleton";
import EmptyState from "@/components/ui/empty-state";
import RecommendationCard, { type Recommendation } from "@/components/recommendation-card";
import { apiFetch } from "@/lib/api";

const STATUS_TABS = ["all", "pending", "accepted", "saved", "dismissed", "tracked"] as const;
const PRIORITY_FILTERS = ["all", "critical", "high", "medium", "low"] as const;

type Stats = {
  pending: number; accepted: number; dismissed: number; tracked: number; high_priority: number;
};

export default function RecommendationsPage() {
  const [recs, setRecs] = React.useState<Recommendation[]>([]);
  const [stats, setStats] = React.useState<Stats>({ pending: 0, accepted: 0, dismissed: 0, tracked: 0, high_priority: 0 });
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [status, setStatus] = React.useState<(typeof STATUS_TABS)[number]>("pending");
  const [priority, setPriority] = React.useState<(typeof PRIORITY_FILTERS)[number]>("all");
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"active" | "history">("active");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = view === "history" ? "/api/recommendations/history" : "/api/recommendations";
      const params = new URLSearchParams();
      if (view !== "history") {
        if (status !== "all") params.set("status", status);
        if (priority !== "all") params.set("priority", priority);
        if (search.trim()) params.set("search", search.trim());
      }
      const [list, s] = await Promise.all([
        apiFetch<Recommendation[]>(`${endpoint}${params.toString() ? `?${params}` : ""}`),
        apiFetch<Stats>("/api/recommendations/stats"),
      ]);
      setRecs(list);
      setStats(s);
    } catch (e: any) {
      toast.error(e.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [view, status, priority, search]);

  React.useEffect(() => { load(); }, [load]);

  // Live refresh on ws notification.
  React.useEffect(() => {
    const handler = () => load();
    window.addEventListener("ws-notification", handler);
    return () => window.removeEventListener("ws-notification", handler);
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const created = await apiFetch<Recommendation[]>("/api/recommendations/generate", { method: "POST", body: {} });
      toast.success(`${created.length} new recommendation${created.length === 1 ? "" : "s"} ready`);
      setView("active"); setStatus("pending");
      load();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const onCardChange = (updated: Recommendation) => {
    setRecs((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    apiFetch<Stats>("/api/recommendations/stats").then(setStats).catch(() => {});
  };

  const statCards = [
    { label: "Pending", value: stats.pending, color: "#3b82f6", Icon: Lightbulb },
    { label: "High priority", value: stats.high_priority, color: "#ef4444", Icon: AlertOctagon },
    { label: "Accepted", value: stats.accepted, color: "#22c55e", Icon: Check },
    { label: "Tracked", value: stats.tracked, color: "#f59e0b", Icon: Target },
  ];

  return (
    <AppShell
      title="Recommendations"
      description="AI tells you exactly what to do next — and why — with expected impact, ROI, and confidence."
    >
      <div className="space-y-6">
        {/* Stat cards + generate */}
        <FadeUp>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {statCards.map(({ label, value, color, Icon }) => (
              <div key={label} className="glass-static rounded-[var(--radius-lg)] p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}1a`, color }}>
                    <Icon size={14} />
                  </span>
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{label}</span>
                </div>
                <motion.p key={value} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="mt-2 text-2xl font-bold text-white">{value}</motion.p>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Controls */}
        <FadeUp>
          <div className="glass-static rounded-[var(--radius-lg)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="seg" role="tablist" aria-label="View">
                <button role="tab" aria-selected={view === "active"} onClick={() => setView("active")} className="seg-item">Active</button>
                <button role="tab" aria-selected={view === "history"} onClick={() => setView("history")} className="seg-item">History</button>
              </div>
              <button
                type="button" onClick={generate} disabled={generating}
                className="tool-btn"
                style={{ color: "var(--accent)", borderColor: "rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.08)" }}
              >
                <Sparkles size={14} /> {generating ? "Analyzing…" : "Generate recommendations"}
              </button>
            </div>

            {view === "active" && (
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="seg" role="tablist" aria-label="Status">
                  {STATUS_TABS.map((s) => (
                    <button key={s} role="tab" aria-selected={status === s}
                      onClick={() => setStatus(s)} className="seg-item capitalize">{s}</button>
                  ))}
                </div>
                <div className="seg" role="tablist" aria-label="Priority">
                  {PRIORITY_FILTERS.map((p) => (
                    <button key={p} role="tab" aria-selected={priority === p}
                      onClick={() => setPriority(p)} className="seg-item capitalize">{p}</button>
                  ))}
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full rounded-lg px-3 py-1.5 text-[12.5px] lg:w-48"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)", color: "#fff" }}
                />
              </div>
            )}
          </div>
        </FadeUp>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-static rounded-[var(--radius-xl)] p-5">
                <ShimmerLine className="w-1/3" />
                <div className="mt-3"><ShimmerLine /></div>
                <div className="mt-2"><ShimmerLine className="w-2/3" /></div>
              </div>
            ))}
          </div>
        ) : recs.length === 0 ? (
          <EmptyState
            icon={<Lightbulb size={22} />}
            title={view === "history" ? "No acted-on recommendations yet" : "No recommendations here"}
            description={view === "history"
              ? "Accept or track recommendations to build your action history."
              : "Generate fresh recommendations — the AI analyzes your insights, alerts, forecasts, and health gaps, then tells you exactly what to do next."}
          />
        ) : (
          <StaggerContainer className="space-y-3">
            {recs.map((r) => (
              <StaggerItem key={r.id}>
                <RecommendationCard rec={r} onChange={onCardChange} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </AppShell>
  );
}
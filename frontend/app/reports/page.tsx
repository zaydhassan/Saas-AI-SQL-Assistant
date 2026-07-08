"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Clock, Plus, Download, Share2, Mail, Calendar, Trash2,
  X, Sparkles, CheckCircle2, AlertTriangle, Lightbulb, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import { FadeUp, StaggerContainer, StaggerItem, AnimatedCounter } from "@/components/motion/primitives";
import { ShimmerLine, ShimmerKPI } from "@/components/ui/shimmer-skeleton";
import EmptyState from "@/components/ui/empty-state";
import ChartCard from "@/components/ui/chart-card";
import DataTable from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

const REPORT_TYPES = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "investor", label: "Investor" },
  { id: "board", label: "Board" },
  { id: "sales", label: "Sales" },
  { id: "finance", label: "Finance" },
  { id: "marketing", label: "Marketing" },
  { id: "inventory", label: "Inventory" },
];

const CADENCES = ["daily", "weekly", "monthly", "quarterly"] as const;

type ReportContent = {
  executive_summary?: string | null;
  key_takeaways?: string[];
  outlook?: string | null;
  kpis?: { key: string; label: string; value: number | null; delta: number | null; direction: string; has_data: boolean }[];
  charts?: { question: string; sql: string; rows: Record<string, any>[]; row_count: number }[];
  insights?: { executive_summary?: string | null; risks?: string[]; opportunities?: string[]; recommendations?: string[]; explanation?: string | null } | null;
  root_causes?: { name: string; metric: string; severity: string; root_cause?: string | null; recommended_action?: string | null }[];
  recommendations?: string[];
};

type Report = {
  id: number;
  report_type: string;
  title: string;
  content: ReportContent;
  status: string;
  schedule_cron?: string | null;
  next_run?: string | null;
  last_generated?: string | null;
  share_token?: string | null;
  created_at?: string | null;
};

export default function ReportsPage() {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState("finance");
  const [active, setActive] = React.useState<Report | null>(null);
  const [scheduling, setScheduling] = React.useState<Report | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<Report[]>("/api/ai-reports");
      setReports(r);
      if (!active && r.length > 0) setActive(r[0]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [active]);

  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function generate() {
    setGenerating(true);
    try {
      const r = await apiFetch<Report>("/api/ai-reports/generate", {
        method: "POST",
        body: { report_type: selectedType },
      });
      setReports((prev) => [r, ...prev]);
      setActive(r);
      toast.success(`${r.title} generated`);
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function del(r: Report) {
    setReports((prev) => prev.filter((x) => x.id !== r.id));
    if (active?.id === r.id) setActive(null);
    try {
      await apiFetch(`/api/ai-reports/${r.id}`, { method: "DELETE" });
      toast.success("Report deleted");
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  }

  async function share(r: Report) {
    try {
      const res = await apiFetch<{ share_token: string }>(`/api/ai-reports/${r.id}/share`, { method: "POST" });
      const url = `${window.location.origin}/reports?shared=${res.share_token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch (e: any) {
      toast.error(e.message || "Share failed");
    }
  }

  function download(r: Report, fmt: string) {
    const url = `${API_BASE}/api/ai-reports/${r.id}/export?format=${fmt}`;
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob().then((b) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = `${r.title}.${fmt === "excel" ? "xlsx" : fmt === "ppt" ? "pptx" : fmt}`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
      })
      .catch((e) => toast.error(e.message || "Export failed"));
  }

  async function email(r: Report) {
    try {
      const res = await apiFetch<{ ok: boolean; detail?: string }>(`/api/ai-reports/${r.id}/email`, {
        method: "POST", body: {},
      });
      if (res.ok) toast.success("Report emailed");
      else toast.error(res.detail || "Email not configured");
    } catch (e: any) {
      toast.error(e.message || "Email failed");
    }
  }

  const savedCount = reports.length;
  const scheduledCount = reports.filter((r) => r.schedule_cron).length;
  const sharedCount = reports.filter((r) => r.share_token).length;

  const stats = [
    { l: "Saved reports", v: savedCount, icon: <FileText size={16} /> },
    { l: "Scheduled", v: scheduledCount, icon: <Clock size={16} /> },
    { l: "Shared", v: sharedCount, icon: <Share2 size={16} /> },
  ];

  const actions = (
    <button
      onClick={generate}
      disabled={generating}
      className="flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
    >
      <Plus size={15} /> {generating ? "Generating…" : "Generate report"}
    </button>
  );

  return (
    <AppShell
      title="Reports"
      description="AI-generated executive reports — build, schedule, export, and share insights."
      actions={actions}
    >
      <div className="space-y-6">
        {/* Stats */}
        <FadeUp>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.l} className="glass-static rounded-[var(--radius-lg)] p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}>
                  {s.icon}
                </span>
                <p className="mt-3 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.l}</p>
                <p className="mt-1 text-2xl font-bold text-white">{loading ? "—" : s.v}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Type picker */}
        <FadeUp>
          <div className="glass-static rounded-[var(--radius-lg)] p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--accent)]" />
              <p className="text-[13px] font-semibold text-white">Report type</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedType(t.id)}
                  className="meta-badge"
                  style={{
                    background: selectedType === t.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    color: selectedType === t.id ? "#c4b5fd" : "var(--muted)",
                    border: `1px solid ${selectedType === t.id ? "rgba(99,102,241,0.4)" : "var(--border-soft)"}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px]" style={{ color: "var(--muted)" }}>
              The AI aggregates your KPIs, charts, insights, open alerts (root causes), and recommendations into a shareable report.
            </p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Viewer */}
          <div className="min-w-0">
            {generating ? (
              <ReportSkeleton />
            ) : active ? (
              <ReportViewer report={active} onShare={() => share(active)} onEmail={() => email(active)}
                onDownload={(fmt) => download(active, fmt)} onSchedule={() => setScheduling(active)} />
            ) : (
              <EmptyState
                icon={<FileText size={22} />}
                title="No reports yet"
                description="Pick a report type above and hit Generate. The AI builds an executive summary, KPIs, charts, root causes, and recommendations you can export or schedule."
                action={
                  <button onClick={generate} className="flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-semibold text-white"
                    style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}>
                    <Plus size={15} /> Generate report
                  </button>
                }
              />
            )}
          </div>

          {/* Saved list */}
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Saved reports</p>
            {loading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <ShimmerLine key={i} className="w-full" />)}</div>
            ) : reports.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>Generated reports appear here.</p>
            ) : (
              <StaggerContainer className="space-y-2">
                {reports.map((r) => (
                  <StaggerItem key={r.id}>
                    <button
                      onClick={() => setActive(r)}
                      className="surface-2 flex w-full items-center gap-3 rounded-[var(--radius-md)] p-3 text-left transition-colors"
                      style={{
                        border: `1px solid ${active?.id === r.id ? "rgba(99,102,241,0.4)" : "var(--border-soft)"}`,
                        background: active?.id === r.id ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-brand-soft)" }}>
                        <FileText size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-white">{r.title}</span>
                        <span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: "var(--muted)" }}>
                          {r.schedule_cron && <span className="inline-flex items-center gap-0.5"><Clock size={10} /> {r.schedule_cron}</span>}
                          {r.share_token && <span className="inline-flex items-center gap-0.5"><Share2 size={10} /> shared</span>}
                        </span>
                      </span>
                      <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); del(r); }}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                        style={{ boxShadow: "none", background: "transparent" }}>
                        <Trash2 size={13} />
                      </span>
                    </button>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {scheduling && (
          <ScheduleModal report={scheduling} onClose={() => setScheduling(null)}
            onScheduled={(updated) => {
              setReports((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
              if (active?.id === updated.id) setActive(updated);
              setScheduling(null);
            }} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function ReportViewer({
  report, onShare, onEmail, onDownload, onSchedule,
}: {
  report: Report;
  onShare: () => void;
  onEmail: () => void;
  onDownload: (fmt: string) => void;
  onSchedule: () => void;
}) {
  const c = report.content || {};
  const kpis = (c.kpis || []).filter((k) => k.has_data);
  const EXPORTS = [
    { fmt: "pdf", label: "PDF" },
    { fmt: "excel", label: "Excel" },
    { fmt: "csv", label: "CSV" },
    { fmt: "ppt", label: "PowerPoint" },
  ];

  return (
    <FadeUp>
      <div className="glass-static rounded-[var(--radius-2xl)] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{report.report_type}</p>
            <h2 className="mt-0.5 text-xl font-semibold text-white">{report.title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {EXPORTS.map((e) => (
              <button key={e.fmt} onClick={() => onDownload(e.fmt)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}>
                <Download size={13} /> {e.label}
              </button>
            ))}
            <button onClick={onEmail} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}>
              <Mail size={13} /> Email
            </button>
            <button onClick={onShare} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)", color: "var(--text-soft)" }}>
              <Share2 size={13} /> Share
            </button>
            <button onClick={onSchedule} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-white"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 22px var(--accent-glow)" }}>
              <Calendar size={13} /> {report.schedule_cron ? "Reschedule" : "Schedule"}
            </button>
          </div>
        </div>

        {/* Executive summary */}
        {c.executive_summary && (
          <div className="mt-5 rounded-[var(--radius-md)] p-4" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Executive summary</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-white">{c.executive_summary}</p>
          </div>
        )}

        {/* KPIs */}
        {kpis.length > 0 && (
          <div className="mt-5">
            <p className="mb-2.5 text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>KPIs</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.key} className="surface-2 rounded-[var(--radius-md)] p-4">
                  <p className="text-[11px]" style={{ color: "var(--muted)" }}>{k.label}</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    <AnimatedCounter value={Number(k.value) || 0} decimals={Number.isInteger(k.value) ? 0 : 1} />
                  </p>
                  {k.delta != null && (
                    <p className="mt-0.5 text-[12px]" style={{ color: k.direction === "up" ? "#22c55e" : k.direction === "down" ? "#ef4444" : "var(--muted)" }}>
                      {k.delta > 0 ? "+" : ""}{k.delta}% {k.direction}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key takeaways */}
        {c.key_takeaways && c.key_takeaways.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              <Lightbulb size={12} /> Key takeaways
            </p>
            <ul className="space-y-1.5">
              {c.key_takeaways.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text-soft)" }}>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Charts */}
        {c.charts && c.charts.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Charts</p>
            {c.charts.slice(0, 3).map((ch, i) => (
              <ChartCard key={i} title={ch.question} subtitle={`${ch.row_count} rows`} badge="data">
                <DataTable rows={ch.rows} maxRows={8} />
              </ChartCard>
            ))}
          </div>
        )}

        {/* Root causes */}
        {c.root_causes && c.root_causes.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              <AlertTriangle size={12} /> Root causes & open alerts
            </p>
            <div className="space-y-2">
              {c.root_causes.map((rc, i) => (
                <div key={i} className="rounded-[var(--radius-md)] p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-[12.5px] font-semibold text-white">{rc.name}</p>
                  {rc.root_cause && <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-soft)" }}>{rc.root_cause}</p>}
                  {rc.recommended_action && <p className="mt-1 text-[11.5px]" style={{ color: "#86efac" }}>→ {rc.recommended_action}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {c.recommendations && c.recommendations.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              <TrendingUp size={12} /> Recommendations
            </p>
            <ul className="space-y-1.5">
              {c.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "var(--text-soft)" }}>
                  <CheckCircle2 size={13} className="mt-0.5 shrink-0" style={{ color: "#22c55e" }} /> {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Outlook */}
        {c.outlook && (
          <div className="mt-5 rounded-[var(--radius-md)] p-4" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>Outlook</p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-soft)" }}>{c.outlook}</p>
          </div>
        )}
      </div>
    </FadeUp>
  );
}

function ReportSkeleton() {
  return (
    <div className="glass-static rounded-[var(--radius-2xl)] p-6">
      <ShimmerLine className="w-40" />
      <div className="mt-4 space-y-2"><ShimmerLine /><ShimmerLine className="w-2/3" /></div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <ShimmerKPI key={i} />)}
      </div>
      <div className="mt-5 space-y-2"><ShimmerLine /><ShimmerLine className="w-3/4" /><ShimmerLine className="w-1/2" /></div>
    </div>
  );
}

function ScheduleModal({
  report, onClose, onScheduled,
}: {
  report: Report;
  onClose: () => void;
  onScheduled: (r: Report) => void;
}) {
  const [cadence, setCadence] = React.useState<string>(report.schedule_cron || "daily");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await apiFetch<Report>(`/api/ai-reports/${report.id}/schedule`, {
        method: "POST", body: { cadence },
      });
      toast.success(`Scheduled ${cadence}`);
      onScheduled(r);
    } catch (e: any) {
      toast.error(e.message || "Schedule failed");
      setSaving(false);
    }
  }

  async function unschedule() {
    setSaving(true);
    try {
      const r = await apiFetch<Report>(`/api/ai-reports/${report.id}/schedule`, { method: "DELETE" });
      toast.success("Schedule cleared");
      onScheduled(r);
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setSaving(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="glass-static relative w-full max-w-md rounded-[var(--radius-xl)] p-6">
        <button type="button" onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-white"
          style={{ boxShadow: "none", background: "transparent" }}>
          <X size={16} />
        </button>
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)" }}>
            <Calendar size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-white">Schedule report</h3>
            <p className="text-[11.5px]" style={{ color: "var(--muted)" }}>Auto-generate + email on a cadence.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CADENCES.map((cad) => (
            <button key={cad} type="button" onClick={() => setCadence(cad)}
              className="rounded-lg py-2.5 text-[12.5px] capitalize transition-colors"
              style={{
                background: cadence === cad ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${cadence === cad ? "rgba(99,102,241,0.4)" : "var(--border-soft)"}`,
                color: cadence === cad ? "#fff" : "var(--muted)",
              }}>
              {cad}
            </button>
          ))}
        </div>
        <div className="mt-6 flex gap-2.5">
          {report.schedule_cron && (
            <button type="button" onClick={unschedule} disabled={saving}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium text-red-300 disabled:opacity-60"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
              Clear
            </button>
          )}
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}>
            {saving ? "Saving…" : "Schedule"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
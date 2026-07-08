"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, Mail, AppWindow, Trash2, ChevronDown, Activity, X, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import { FadeUp, StaggerContainer, StaggerItem } from "@/components/motion/primitives";
import { ShimmerLine } from "@/components/ui/shimmer-skeleton";
import EmptyState from "@/components/ui/empty-state";
import SmartAlertCard, { type SmartAlert } from "@/components/smart-alert-card";
import SmartAlertFiltersBar, { type SmartAlertFilters } from "@/components/smart-alert-filters";
import { apiFetch } from "@/lib/api";

type Alert = {
  id: number;
  name: string;
  metric: string;
  condition: string;
  channel: string;
  active: boolean;
  last_triggered?: string | null;
  created_at?: string | null;
};

type AlertEvent = {
  id: number;
  payload: {
    delta_pct?: number;
    direction?: string;
    latest?: number;
    previous?: number;
    metric?: string;
    condition?: string;
  } | null;
  created_at?: string | null;
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "never";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [openEvents, setOpenEvents] = React.useState<number | null>(null);
  const [events, setEvents] = React.useState<Record<number, AlertEvent[]>>({});
  const [eventsLoading, setEventsLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<Alert[]>("/api/alerts");
      setAlerts(r);
    } catch (e: any) {
      toast.error(e.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const active = alerts.filter((a) => a.active).length;
  const paused = alerts.length - active;
  const triggered7d = alerts.filter((a) => {
    if (!a.last_triggered) return false;
    return Date.now() - new Date(a.last_triggered).getTime() < 7 * 86400 * 1000;
  }).length;

  async function toggle(a: Alert) {
    const next = !a.active;
    setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, active: next } : x)));
    try {
      await apiFetch(`/api/alerts/${a.id}`, { method: "PUT", body: JSON.stringify({ active: next }) });
      toast.success(next ? "Alert activated" : "Alert paused");
    } catch (e: any) {
      setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, active: a.active } : x)));
      toast.error(e.message || "Failed to update alert");
    }
  }

  async function remove(a: Alert) {
    const prev = alerts;
    setAlerts((p) => p.filter((x) => x.id !== a.id));
    try {
      await apiFetch(`/api/alerts/${a.id}`, { method: "DELETE" });
      toast.success("Alert deleted");
    } catch (e: any) {
      setAlerts(prev);
      toast.error(e.message || "Failed to delete alert");
    }
  }

  async function loadEvents(id: number) {
    setEventsLoading(true);
    try {
      const r = await apiFetch<AlertEvent[]>(`/api/alerts/${id}/events`);
      setEvents((p) => ({ ...p, [id]: r }));
    } catch {
      setEvents((p) => ({ ...p, [id]: [] }));
    } finally {
      setEventsLoading(false);
    }
  }

  function toggleEvents(id: number) {
    if (openEvents === id) {
      setOpenEvents(null);
      return;
    }
    setOpenEvents(id);
    if (!events[id]) loadEvents(id);
  }

  async function onCreate(a: Alert) {
    setAlerts((prev) => [a, ...prev]);
    setCreating(false);
  }

  const stats = [
    { l: "Active alerts", v: active },
    { l: "Paused", v: paused },
    { l: "Triggered (7d)", v: triggered7d },
  ];

  const actions = (
    <button
      className="flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-semibold text-white"
      style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
      onClick={() => setCreating(true)}
    >
      <Plus size={15} /> New alert
    </button>
  );

  return (
    <AppShell
      title="Alerts"
      description="Get notified the moment a metric crosses a threshold or an anomaly appears."
      actions={actions}
    >
      <div className="space-y-6">
        {/* Smart Alert Engine (Feature 6) — AI-detected, explained alerts */}
        <SmartAlertsSection />

        {/* Stats */}
        <FadeUp>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.l} className="glass-static rounded-[var(--radius-lg)] p-5">
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.l}</p>
                <p className="mt-1 text-2xl font-bold text-white">{loading ? "—" : s.v}</p>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-static rounded-[var(--radius-lg)] p-5">
                <ShimmerLine className="w-48" />
                <div className="mt-3"><ShimmerLine className="w-2/3" /></div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={<Bell size={22} />}
            title="No alerts yet"
            description="Create your first alert to get notified when a metric spikes or drops. Alerts evaluate automatically after each query."
            action={
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
              >
                <Plus size={15} /> New alert
              </button>
            }
          />
        ) : (
          <StaggerContainer className="space-y-3">
            {alerts.map((a) => (
              <StaggerItem key={a.id}>
                <AlertRow
                  a={a}
                  onToggle={() => toggle(a)}
                  onDelete={() => remove(a)}
                  eventsOpen={openEvents === a.id}
                  onToggleEvents={() => toggleEvents(a.id)}
                  events={events[a.id]}
                  eventsLoading={eventsLoading && openEvents === a.id}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>

      <AnimatePresence>
        {creating && (
          <CreateAlertModal onClose={() => setCreating(false)} onCreated={onCreate} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function AlertRow({
  a, onToggle, onDelete, eventsOpen, onToggleEvents, events, eventsLoading,
}: {
  a: Alert;
  onToggle: () => void;
  onDelete: () => void;
  eventsOpen: boolean;
  onToggleEvents: () => void;
  events?: AlertEvent[];
  eventsLoading: boolean;
}) {
  const ChannelIcon = a.channel === "email" ? Mail : AppWindow;
  return (
    <div className="glass-static overflow-hidden rounded-[var(--radius-lg)]">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: a.active ? "var(--gradient-brand)" : "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
          >
            <Bell size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{a.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: "var(--muted)" }}>
              <span className="font-medium text-white/90">{a.metric}</span>
              <span>·</span>
              <span style={{ color: "var(--text-soft)" }}>{a.condition}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <ChannelIcon size={12} /> {a.channel}
              </span>
              <span>·</span>
              <span>last fired {timeAgo(a.last_triggered)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleEvents}
            className="tool-btn"
            title="View trigger history"
            style={{ color: eventsOpen ? "#fff" : undefined }}
          >
            <Activity size={14} />
            <ChevronDown size={13} className={`transition-transform ${eventsOpen ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
            style={{ boxShadow: "none", background: "transparent" }}
            title="Delete alert"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={onToggle}
            className="relative h-7 w-12 rounded-full transition-colors"
            style={{ background: a.active ? "var(--gradient-brand)" : "rgba(255,255,255,0.1)", boxShadow: "none" }}
            aria-label="Toggle alert"
          >
            <span
              className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
              style={{ left: a.active ? 26 : 4 }}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {eventsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
            style={{ borderTop: "1px solid var(--border-soft)" }}
          >
            <div className="p-4">
              <p className="mb-2.5 text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Trigger history
              </p>
              {eventsLoading ? (
                <div className="space-y-2">
                  <ShimmerLine /><ShimmerLine className="w-2/3" />
                </div>
              ) : !events || events.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>
                  This alert hasn't fired yet. It evaluates automatically after each query.
                </p>
              ) : (
                <div className="space-y-2">
                  {events.map((e) => {
                    const delta = e.payload?.delta_pct;
                    const dir = e.payload?.direction;
                    const color = dir === "up" ? "#22c55e" : dir === "down" ? "#ef4444" : "#f59e0b";
                    return (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded-lg p-3 text-[12.5px]"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}
                      >
                        <span style={{ color: "var(--text-soft)" }}>
                          {e.payload?.metric || a.metric}{" "}
                          {dir === "up" ? "rose" : dir === "down" ? "dropped" : "changed"}{" "}
                          {delta != null && <strong style={{ color }}>{Math.abs(delta)}%</strong>}
                          {e.payload?.latest != null && <> to <strong className="text-white">{e.payload.latest}</strong></>}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--muted-2)" }}>{timeAgo(e.created_at)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const METRIC_SUGGESTIONS = ["revenue", "orders", "refunds", "customers", "inventory", "sales"];
const CONDITION_SUGGESTIONS = ["drops > 10%", "spike > 5%", "decline > 15%", "rise > 20%"];

function CreateAlertModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (a: Alert) => void;
}) {
  const [name, setName] = React.useState("");
  const [metric, setMetric] = React.useState("revenue");
  const [condition, setCondition] = React.useState("drops > 10%");
  const [channel, setChannel] = React.useState<"in-app" | "email">("in-app");
  const [saving, setSaving] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Give your alert a name"); return; }
    setSaving(true);
    try {
      const r = await apiFetch<Alert>("/api/alerts", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), metric, condition, channel, active: true }),
      });
      toast.success("Alert created");
      onCreated(r);
    } catch (e: any) {
      toast.error(e.message || "Failed to create alert");
      setSaving(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.form
        onSubmit={save}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="glass-static relative w-full max-w-md rounded-[var(--radius-xl)] p-6"
      >
        <button
          type="button" onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-white/5 hover:text-white"
          style={{ boxShadow: "none", background: "transparent" }}
        >
          <X size={16} />
        </button>

        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)" }}>
            <Sparkles size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-white">New alert</h3>
            <p className="text-[11.5px]" style={{ color: "var(--muted)" }}>Fires when a metric crosses your threshold.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Alert name</span>
            <input
              value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="e.g. Revenue drop watcher"
              className="mt-1.5 w-full"
              autoFocus
            />
          </label>

          <label className="block">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Metric</span>
            <input
              value={metric} onChange={(e) => setMetric(e.target.value)}
              className="mt-1.5 w-full" placeholder="revenue"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {METRIC_SUGGESTIONS.map((m) => (
                <button
                  key={m} type="button" onClick={() => setMetric(m)}
                  className="meta-badge"
                  style={{
                    background: metric === m ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    color: metric === m ? "#c4b5fd" : "var(--muted)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Condition</span>
            <input
              value={condition} onChange={(e) => setCondition(e.target.value)}
              className="mt-1.5 w-full" placeholder="drops > 10%"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CONDITION_SUGGESTIONS.map((c) => (
                <button
                  key={c} type="button" onClick={() => setCondition(c)}
                  className="meta-badge"
                  style={{
                    background: condition === c ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    color: condition === c ? "#c4b5fd" : "var(--muted)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "var(--muted-2)" }}>
              Use words like “drops”, “spike”, “decline”, “rise” + a percentage.
            </p>
          </label>

          <div>
            <span className="text-xs" style={{ color: "var(--muted)" }}>Channel</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(["in-app", "email"] as const).map((c) => (
                <button
                  key={c} type="button" onClick={() => setChannel(c)}
                  className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-[12.5px] transition-colors"
                  style={{
                    background: channel === c ? "rgba(99,102,241,0.16)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${channel === c ? "rgba(99,102,241,0.4)" : "var(--border-soft)"}`,
                    color: channel === c ? "#fff" : "var(--muted)",
                  }}
                >
                  {c === "email" ? <Mail size={13} /> : <AppWindow size={13} />} {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button" onClick={onClose}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium text-[var(--muted)]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)" }}
          >
            Cancel
          </button>
          <button
            type="submit" disabled={saving}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
          >
            {saving ? "Creating…" : "Create alert"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Smart Alert Engine (Feature 6) — AI continuously monitors business metrics
// and surfaces prioritized, explained alerts. Rendered above the user-rule
// alerts section. Stats come from /api/smart-alerts/stats.
// ---------------------------------------------------------------------------

function SmartAlertsSection() {
  const [alerts, setAlerts] = React.useState<SmartAlert[]>([]);
  const [stats, setStats] = React.useState({ active: 0, critical: 0, triggered_7d: 0, resolved: 0 });
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const [filters, setFilters] = React.useState<SmartAlertFilters>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.severity) params.set("severity", filters.severity);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.pinned) params.set("pinned", "true");
      const [list, st] = await Promise.all([
        apiFetch<SmartAlert[]>(`/api/smart-alerts?${params.toString()}`),
        apiFetch<{ active: number; critical: number; triggered_7d: number; resolved: number }>(
          "/api/smart-alerts/stats"
        ),
      ]);
      setAlerts(list);
      setStats(st);
    } catch (e: any) {
      toast.error(e.message || "Failed to load smart alerts");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => { load(); }, [load]);

  // Live refresh when a ws notification lands (new smart alert detected).
  React.useEffect(() => {
    const onWs = () => load();
    window.addEventListener("ws-notification", onWs);
    return () => window.removeEventListener("ws-notification", onWs);
  }, [load]);

  async function scanNow() {
    setScanning(true);
    try {
      const r = await apiFetch<{ created: number }>("/api/smart-alerts/detect", { method: "POST" });
      if (r.created > 0) toast.success(`${r.created} new smart alert${r.created > 1 ? "s" : ""} detected`);
      else toast("Scan complete — no new alerts right now.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  const statCards = [
    { l: "Active", v: stats.active, c: "#f59e0b" },
    { l: "Critical", v: stats.critical, c: "#ef4444" },
    { l: "Triggered (7d)", v: stats.triggered_7d, c: "#8b5cf6" },
    { l: "Resolved", v: stats.resolved, c: "#22c55e" },
  ];

  return (
    <FadeUp>
      <section className="glass-static rounded-[var(--radius-2xl)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand)" }}>
                <Sparkles size={15} />
              </span>
              <h2 className="text-[15px] font-semibold text-white">Smart Alert Engine</h2>
              <span className="dot-live" />
            </div>
            <p className="mt-1.5 max-w-xl text-[12.5px]" style={{ color: "var(--muted)" }}>
              AI continuously monitors your metrics — revenue drops, churn, refunds, margins — and explains each
              alert with severity, root cause, confidence, and a recommended action.
            </p>
          </div>
          <button
            onClick={scanNow}
            disabled={scanning}
            className="flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
          >
            <Activity size={14} /> {scanning ? "Scanning…" : "Scan now"}
          </button>
        </div>

        {/* Stat row */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.l} className="rounded-[var(--radius-md)] p-3.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.l}</p>
              <p className="mt-0.5 text-xl font-bold" style={{ color: s.c }}>{loading ? "—" : s.v}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-4">
          <SmartAlertFiltersBar filters={filters} onChange={setFilters} />
        </div>

        {/* List */}
        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-[var(--radius-lg)] p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}>
                  <ShimmerLine className="w-56" />
                  <div className="mt-3"><ShimmerLine className="w-2/3" /></div>
                  <div className="mt-2"><ShimmerLine className="w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-8 text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-soft)" }}>
              <Sparkles size={20} style={{ color: "var(--muted-2)" }} />
              <p className="text-[13px] font-medium text-white">No smart alerts yet</p>
              <p className="max-w-sm text-[12px]" style={{ color: "var(--muted)" }}>
                Ask a few questions about your data, then hit “Scan now” — the AI will surface revenue drops, churn,
                refund spikes, and more as they happen.
              </p>
            </div>
          ) : (
            <StaggerContainer className="space-y-3">
              {alerts.map((a) => (
                <StaggerItem key={a.id}>
                  <SmartAlertCard
                    alert={a}
                    onChanged={(next) => setAlerts((prev) => prev.map((x) => (x.id === next.id ? next : x)))}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>
    </FadeUp>
  );
}
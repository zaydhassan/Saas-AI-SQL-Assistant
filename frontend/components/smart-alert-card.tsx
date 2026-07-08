"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, AlertCircle, Info, Pin, PinOff, BellOff, Bell,
  CheckCircle2, Archive, UserCog, ChevronDown, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { ShimmerLine } from "@/components/ui/shimmer-skeleton";

export type SmartAlert = {
  id: number;
  name: string;
  metric: string;
  severity: "critical" | "warning" | "info";
  business_impact?: string | null;
  root_cause?: string | null;
  confidence: number;
  recommended_action?: string | null;
  status: "open" | "resolved" | "archived";
  assigned_to?: string | null;
  pinned: boolean;
  muted: boolean;
  detected_at?: string | null;
  resolved_at?: string | null;
  created_at?: string | null;
};

type TimelineEvent = {
  id: number;
  kind: string;
  payload: any;
  created_at?: string | null;
};

const SEV_STYLE: Record<string, { color: string; bg: string; Icon: any; label: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.10)", Icon: AlertCircle, label: "Critical" },
  warning: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", Icon: AlertTriangle, label: "Warning" },
  info: { color: "#3b82f6", bg: "rgba(59,130,246,0.10)", Icon: Info, label: "Info" },
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const KIND_LABEL: Record<string, string> = {
  detected: "Detected",
  escalated: "Escalated",
  resolved: "Resolved",
  commented: "Comment",
  assigned: "Assigned",
  status_changed: "Status changed",
  pinned: "Pinned",
  muted: "Muted",
};

export default function SmartAlertCard({
  alert,
  onChanged,
}: {
  alert: SmartAlert;
  onChanged?: (next: SmartAlert) => void;
}) {
  const sev = SEV_STYLE[alert.severity] || SEV_STYLE.warning;
  const SevIcon = sev.Icon;
  const [open, setOpen] = React.useState(false);
  const [timeline, setTimeline] = React.useState<TimelineEvent[] | null>(null);
  const [loadingTl, setLoadingTl] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [assignVal, setAssignVal] = React.useState(alert.assigned_to || "");

  async function patch(body: Record<string, any>, successMsg: string) {
    setBusy(true);
    const prev = alert;
    try {
      const next = await apiFetch<SmartAlert>(`/api/smart-alerts/${alert.id}`, {
        method: "PATCH",
        body,
      });
      onChanged?.(next);
      toast.success(successMsg);
      return next;
    } catch (e: any) {
      onChanged?.(prev);
      toast.error(e.message || "Update failed");
      return prev;
    } finally {
      setBusy(false);
    }
  }

  async function loadTimeline() {
    setLoadingTl(true);
    try {
      const r = await apiFetch<TimelineEvent[]>(`/api/smart-alerts/${alert.id}/timeline`);
      setTimeline(r);
    } catch {
      setTimeline([]);
    } finally {
      setLoadingTl(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && timeline === null) loadTimeline();
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="glass-static overflow-hidden rounded-[var(--radius-lg)]"
      style={{ borderLeft: `3px solid ${sev.color}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.color}40` }}
          >
            <SevIcon size={17} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{alert.name}</p>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: sev.bg, color: sev.color }}
              >
                {sev.label}
              </span>
              {alert.status !== "open" && (
                <span className="meta-badge" style={{ background: "rgba(34,197,94,0.12)", color: "#86efac" }}>
                  {alert.status}
                </span>
              )}
              {alert.pinned && <Pin size={12} className="text-amber-300" />}
              {alert.muted && <BellOff size={12} style={{ color: "var(--muted-2)" }} />}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: "var(--muted)" }}>
              <span className="font-medium text-white/90">{alert.metric}</span>
              <span>·</span>
              <span>detected {timeAgo(alert.detected_at)}</span>
              {alert.assigned_to && (<><span>·</span><span>assigned to {alert.assigned_to}</span></>)}
            </p>
          </div>
        </div>

        {/* Confidence ring */}
        <ConfidenceRing value={alert.confidence} color={sev.color} />
      </div>

      {/* Body */}
      <div className="space-y-3 px-5 pb-4">
        {alert.business_impact && (
          <Field label="Business impact" color={sev.color}>{alert.business_impact}</Field>
        )}
        {alert.root_cause && (
          <Field label="Root cause">{alert.root_cause}</Field>
        )}
        {alert.recommended_action && (
          <Field label="Recommended action" color="#22c55e">{alert.recommended_action}</Field>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-1.5 px-5 pb-4">
        <ActionBtn
          disabled={busy || alert.status === "resolved"}
          onClick={() => patch({ status: "resolved" }, "Marked resolved")}
          icon={<CheckCircle2 size={14} />}
          label="Resolve"
          tone="ok"
        />
        <ActionBtn
          disabled={busy}
          onClick={() => patch({ pinned: !alert.pinned }, alert.pinned ? "Unpinned" : "Pinned")}
          icon={alert.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          label={alert.pinned ? "Unpin" : "Pin"}
        />
        <ActionBtn
          disabled={busy}
          onClick={() => patch({ muted: !alert.muted }, alert.muted ? "Unmuted" : "Muted")}
          icon={alert.muted ? <Bell size={14} /> : <BellOff size={14} />}
          label={alert.muted ? "Unmute" : "Mute"}
        />
        <ActionBtn
          disabled={busy || alert.status === "archived"}
          onClick={() => patch({ status: "archived" }, "Archived")}
          icon={<Archive size={14} />}
          label="Archive"
        />
        <ActionBtn
          disabled={busy}
          onClick={() => setAssigning((v) => !v)}
          icon={<UserCog size={14} />}
          label="Assign"
        />
        <button
          type="button"
          onClick={toggleOpen}
          className="tool-btn ml-auto"
          title="View timeline"
        >
          <Activity size={14} />
          <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Assign inline */}
      <AnimatePresence>
        {assigning && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5"
          >
            <div className="flex items-center gap-2 pb-4">
              <input
                value={assignVal}
                onChange={(e) => setAssignVal(e.target.value)}
                placeholder="Assign to (name / team)"
                className="flex-1"
              />
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const next = await patch({ assigned_to: assignVal.trim() || null }, "Assigned");
                  setAssigning(false);
                  setAssignVal(next.assigned_to || "");
                }}
                className="rounded-lg px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 22px var(--accent-glow)" }}
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
            style={{ borderTop: "1px solid var(--border-soft)" }}
          >
            <div className="p-4">
              <p className="mb-3 text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                Alert timeline
              </p>
              {loadingTl ? (
                <div className="space-y-2"><ShimmerLine /><ShimmerLine className="w-2/3" /></div>
              ) : !timeline || timeline.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: "var(--muted)" }}>No timeline events yet.</p>
              ) : (
                <div className="relative space-y-3 pl-4">
                  <span
                    className="absolute left-[3px] top-1 h-[calc(100%-0.5rem)] w-px"
                    style={{ background: "var(--border-soft)" }}
                  />
                  {timeline.map((e) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative"
                    >
                      <span
                        className="absolute -left-4 top-1 h-2 w-2 rounded-full"
                        style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }}
                      />
                      <p className="text-[12.5px] font-medium text-white">{KIND_LABEL[e.kind] || e.kind}</p>
                      <p className="text-[11.5px]" style={{ color: "var(--muted)" }}>
                        {describePayload(e.kind, e.payload)}
                      </p>
                      <p className="mt-0.5 text-[10px]" style={{ color: "var(--muted-2)" }}>{timeAgo(e.created_at)}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function describePayload(kind: string, p: any): string {
  if (!p) return "";
  if (kind === "detected") {
    const dir = p.direction === "up" ? "rose" : p.direction === "down" ? "dropped" : "changed";
    return `${p.metric ?? ""} ${dir} ${p.delta_pct != null ? Math.abs(p.delta_pct) + "%" : ""} to ${p.latest ?? ""}`.trim();
  }
  if (kind === "assigned") return `Assigned to ${p.to ?? "—"}`;
  if (kind === "resolved") return `Resolved from ${p.from ?? "open"}`;
  if (kind === "status_changed") return `Status set to ${p.to ?? "—"}`;
  if (kind === "commented") return p.text ?? "";
  if (kind === "pinned") return p.pinned ? "Pinned" : "Unpinned";
  if (kind === "muted") return p.muted ? "Muted" : "Unmuted";
  return JSON.stringify(p);
}

function Field({
  label, children, color,
}: {
  label: string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: color || "var(--muted)" }}>{label}</p>
      <p className="mt-0.5 text-[13px] leading-snug" style={{ color: "var(--text-soft)" }}>{children}</p>
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, disabled, tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "ok";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors disabled:opacity-40"
      style={{
        background: tone === "ok" ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${tone === "ok" ? "rgba(34,197,94,0.3)" : "var(--border-soft)"}`,
        color: tone === "ok" ? "#86efac" : "var(--text-soft)",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const v = Math.max(0, Math.min(1, value || 0));
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v);
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <motion.circle
          cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-white">{Math.round(v * 100)}%</span>
    </div>
  );
}
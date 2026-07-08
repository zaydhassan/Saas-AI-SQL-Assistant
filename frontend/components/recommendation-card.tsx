"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, Bookmark, TrendingUp, ChevronDown, Target, Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export type Recommendation = {
  id: number;
  title: string;
  category: string | null;
  business_reason: string | null;
  expected_impact: string | null;
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  estimated_roi: number | null;
  difficulty: "easy" | "medium" | "hard";
  status: "pending" | "accepted" | "dismissed" | "saved" | "tracked";
  outcome: string | null;
  source: string | null;
  tracked_at: string | null;
  created_at: string | null;
};

const PRIORITY_STYLE: Record<string, { color: string; label: string }> = {
  critical: { color: "#ef4444", label: "Critical" },
  high: { color: "#f59e0b", label: "High" },
  medium: { color: "#3b82f6", label: "Medium" },
  low: { color: "#64748b", label: "Low" },
};

const DIFFICULTY_STYLE: Record<string, { color: string; label: string }> = {
  easy: { color: "#22c55e", label: "Easy" },
  medium: { color: "#f59e0b", label: "Medium" },
  hard: { color: "#ef4444", label: "Hard" },
};

const SOURCE_LABEL: Record<string, string> = {
  ai: "AI", alert: "Alert", forecast: "Forecast", insight: "Insight", health: "Health",
};

function ConfidenceRing({ value, size = 44 }: { value: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value || 0));
  const color = pct >= 0.75 ? "#22c55e" : pct >= 0.5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function DifficultyMeter({ difficulty }: { difficulty: string }) {
  const d = DIFFICULTY_STYLE[difficulty] || DIFFICULTY_STYLE.medium;
  const bars = difficulty === "easy" ? 1 : difficulty === "hard" ? 3 : 2;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 3, height: 6 + i * 3, borderRadius: 1,
            background: i < bars ? d.color : "rgba(255,255,255,0.1)",
          }} />
        ))}
      </div>
      <span className="text-[11px]" style={{ color: "var(--muted)" }}>{d.label}</span>
    </div>
  );
}

function ActionBtn({
  onClick, Icon, label, color, disabled,
}: {
  onClick: () => void; Icon: any; label: string; color: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tool-btn"
      style={{ color, borderColor: `${color}40`, ...(disabled ? { opacity: 0.4, cursor: "default" } : {}) }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}

export default function RecommendationCard({
  rec, onChange,
}: {
  rec: Recommendation;
  onChange: (updated: Recommendation) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [outcome, setOutcome] = React.useState(rec.outcome || "");
  const [showOutcome, setShowOutcome] = React.useState(rec.status === "tracked");

  const pri = PRIORITY_STYLE[rec.priority] || PRIORITY_STYLE.medium;
  const acted = rec.status !== "pending";

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const updated = await apiFetch<Recommendation>(`/api/recommendations/${rec.id}`, {
        method: "PATCH", body,
      });
      onChange(updated);
      if (updated.status === "tracked") setShowOutcome(true);
    } catch (e: any) {
      // swallow; parent can toast if desired
    } finally {
      setBusy(false);
    }
  };

  const submitOutcome = () => patch({ status: "tracked", outcome });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass-static rounded-[var(--radius-xl)] p-5"
      style={{
        opacity: rec.status === "dismissed" ? 0.55 : 1,
        borderLeft: `3px solid ${pri.color}`,
      }}
    >
      <div className="flex items-start gap-4">
        <ConfidenceRing value={rec.confidence} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide"
              style={{ background: `${pri.color}1a`, color: pri.color }}>
              {pri.label}
            </span>
            {rec.category && (
              <span className="meta-badge capitalize">{rec.category.replace("_", " ")}</span>
            )}
            {rec.source && SOURCE_LABEL[rec.source] && (
              <span className="text-[10.5px] uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                · {SOURCE_LABEL[rec.source]}
              </span>
            )}
            {rec.status !== "pending" && (
              <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize"
                style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                {rec.status}
              </span>
            )}
          </div>

          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-white">{rec.title}</h3>

          {rec.business_reason && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
              <span className="font-medium" style={{ color: "var(--muted)" }}>Why: </span>
              {rec.business_reason}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <DifficultyMeter difficulty={rec.difficulty} />
            {rec.estimated_roi != null && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: "#22c55e" }}>
                <TrendingUp size={12} /> ~{rec.estimated_roi}% ROI
              </span>
            )}
            {rec.expected_impact && (
              <span className="text-[11.5px]" style={{ color: "var(--muted)" }}>
                Impact: {rec.expected_impact.length > 80 ? rec.expected_impact.slice(0, 80) + "…" : rec.expected_impact}
              </span>
            )}
          </div>

          {/* Outcome / track form */}
          <AnimatePresence>
            {showOutcome && rec.status === "tracked" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden"
              >
                <textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Log the outcome of acting on this recommendation…"
                  rows={2}
                  className="w-full rounded-lg p-2.5 text-[12.5px]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)", color: "#fff" }}
                />
                <button type="button" onClick={submitOutcome} disabled={busy}
                  className="mt-1.5 tool-btn" style={{ color: "#22c55e", borderColor: "#22c55e40" }}>
                  <Check size={13} /> Save outcome
                </button>
                {rec.tracked_at && (
                  <p className="mt-1 text-[10.5px]" style={{ color: "var(--muted-2)" }}>
                    Tracked {new Date(rec.tracked_at).toLocaleString()}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action bar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!acted && (
              <>
                <ActionBtn onClick={() => patch({ status: "accepted" })} Icon={Check} label="Accept" color="#22c55e" disabled={busy} />
                <ActionBtn onClick={() => patch({ status: "dismissed" })} Icon={X} label="Dismiss" color="#ef4444" disabled={busy} />
                <ActionBtn onClick={() => patch({ status: "saved" })} Icon={Bookmark} label="Save" color="#3b82f6" disabled={busy} />
                <ActionBtn onClick={() => { setShowOutcome(true); }} Icon={Target} label="Track" color="#f59e0b" disabled={busy} />
              </>
            )}
            {acted && rec.status !== "tracked" && (
              <ActionBtn onClick={() => patch({ status: "tracked", outcome: outcome || "Tracked." })} Icon={Target} label="Track outcome" color="#f59e0b" disabled={busy} />
            )}
            {rec.expected_impact && rec.expected_impact.length > 80 && (
              <button type="button" onClick={() => setExpanded((v) => !v)}
                className="tool-btn" style={{ color: "var(--muted)" }}>
                <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                {expanded ? "Less" : "More"}
              </button>
            )}
          </div>

          <AnimatePresence>
            {expanded && rec.expected_impact && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2.5 overflow-hidden text-[12px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                <span className="font-medium" style={{ color: "var(--muted)" }}>Expected impact: </span>
                {rec.expected_impact}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Lightbulb, Target, ArrowRight, Gauge,
} from "lucide-react";

export type InsightData = {
  executive_summary?: string;
  trend_detection?: string;
  percentage_growth?: { value?: number; direction?: string; metric?: string };
  business_meaning?: string;
  risks?: string[];
  opportunities?: string[];
  recommendations?: string[];
};

const EASE = [0.22, 1, 0.36, 1] as const;

function GrowthBadge({ pg }: { pg: InsightData["percentage_growth"] }) {
  if (!pg || pg.value === undefined || pg.value === null) return null;
  const dir = (pg.direction || "").toLowerCase();
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = dir === "up" ? "#22c55e" : dir === "down" ? "#ef4444" : "#f59e0b";
  const sign = dir === "up" ? "+" : dir === "down" ? "−" : "";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
      style={{ background: `${color}1f`, border: `1px solid ${color}44`, color }}
    >
      <Icon size={13} />
      {sign}
      {Math.abs(pg.value).toFixed(1)}% {pg.metric ? `· ${pg.metric}` : ""}
    </span>
  );
}

function Section({
  icon, title, children, accent, delay,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode; accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="rounded-[var(--radius-lg)] p-4"
      style={{ background: `${accent}0d`, border: `1px solid ${accent}33` }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span style={{ color: accent }}>{icon}</span>
        <h4 className="text-[12.5px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
          {title}
        </h4>
      </div>
      {children}
    </motion.div>
  );
}

function List({ items, color }: { items?: string[]; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.05 }}
          className="flex items-start gap-2 text-[13px] leading-relaxed"
          style={{ color: "var(--text-soft)" }}
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
          {it}
        </motion.li>
      ))}
    </ul>
  );
}

export default function InsightEngine({
  insights,
  className,
}: {
  insights: InsightData | null | undefined;
  className?: string;
}) {
  if (!insights) return null;

  const hasContent =
    insights.executive_summary ||
    insights.business_meaning ||
    (insights.risks && insights.risks.length) ||
    (insights.opportunities && insights.opportunities.length) ||
    (insights.recommendations && insights.recommendations.length);
  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={className}
    >
      <div
        className="overflow-hidden rounded-[var(--radius-xl)]"
        style={{ background: "linear-gradient(120deg, rgba(99,102,241,0.10), rgba(139,92,246,0.05) 60%, rgba(59,130,246,0.08))", border: "1px solid rgba(99,102,241,0.28)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: "1px solid rgba(99,102,241,0.22)" }}>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
          >
            <Sparkles size={15} />
          </span>
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-white">AI Business Insights</h3>
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>Executive read-out · auto-generated</p>
          </div>
          {insights.percentage_growth && <GrowthBadge pg={insights.percentage_growth} />}
        </div>

        <div className="space-y-4 p-5">
          {/* Executive summary */}
          {insights.executive_summary && (
            <Section icon={<Gauge size={14} />} title="Executive Summary" accent="#8b5cf6" delay={0.02}>
              <p className="text-[13.5px] leading-relaxed text-white">{insights.executive_summary}</p>
              {insights.trend_detection && (
                <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
                  <span className="font-medium" style={{ color: "var(--text-soft)" }}>Trend: </span>
                  {insights.trend_detection}
                </p>
              )}
            </Section>
          )}

          {/* Business meaning */}
          {insights.business_meaning && (
            <Section icon={<Target size={14} />} title="Business Meaning" accent="#3b82f6" delay={0.06}>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-soft)" }}>
                {insights.business_meaning}
              </p>
            </Section>
          )}

          {/* Risks + Opportunities two-up */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(insights.risks && insights.risks.length > 0) && (
              <Section icon={<AlertTriangle size={14} />} title="Risks" accent="#ef4444" delay={0.1}>
                <List items={insights.risks} color="#ef4444" />
              </Section>
            )}
            {(insights.opportunities && insights.opportunities.length > 0) && (
              <Section icon={<Lightbulb size={14} />} title="Opportunities" accent="#22c55e" delay={0.14}>
                <List items={insights.opportunities} color="#22c55e" />
              </Section>
            )}
          </div>

          {/* Recommendations */}
          {insights.recommendations && insights.recommendations.length > 0 && (
            <Section icon={<ArrowRight size={14} />} title="Recommendations" accent="#6366f1" delay={0.18}>
              <div className="space-y-2">
                {insights.recommendations.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.06 }}
                    className="flex items-start gap-2.5 rounded-xl p-3 text-[13px] leading-relaxed"
                    style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--text-soft)" }}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {i + 1}
                    </span>
                    {r}
                  </motion.div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </motion.div>
  );
}
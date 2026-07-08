"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export type ForecastPoint = { step: number; value: number; lower: number; upper: number };
export type HistoryPoint = { label: string; value: number };

/**
 * Reusable forecast chart: solid actual history line + dashed forecast line +
 * a shaded confidence band. Animates in on mount. Reuses the /insights
 * actual-vs-forecast pattern with an added confidence Area.
 */
export default function ForecastChart({
  history,
  points,
  height = 320,
}: {
  history: HistoryPoint[];
  points: ForecastPoint[];
  height?: number;
}) {
  // Merge into a single series with a shared index so the band aligns.
  const data = React.useMemo(() => {
    const out: any[] = [];
    history.forEach((h, i) => {
      out.push({ idx: i, label: h.label, actual: h.value });
    });
    const base = history.length;
    points.forEach((p, i) => {
      // Connect: first forecast point repeats the last actual for continuity.
      const idx = base + i;
      out.push({
        idx,
        label: `+${p.step}`,
        forecast: p.value,
        range: [p.lower, p.upper],   // recharts Area renders an array value as a band
        // bridge actual->forecast so the lines visually connect
        ...(i === 0 && history.length ? { forecastBridge: history[history.length - 1].value } : {}),
      });
    });
    return out;
  }, [history, points]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ width: "100%", height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="fcBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8a90b5", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={{ fill: "#8a90b5", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={{
              background: "rgba(10,14,35,0.95)",
              border: "1px solid var(--border-soft)",
              borderRadius: 12,
              color: "#fff",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted)" }}
          />
          {/* Confidence band (array-valued Area renders low–high) */}
          <Area type="monotone" dataKey="range" stroke="none" fill="url(#fcBand)" />
          {/* Actual */}
          <Line type="monotone" dataKey="actual" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 2.5, fill: "#8b5cf6" }} connectNulls />
          {/* Forecast */}
          <Line type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2.5, fill: "#3b82f6" }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
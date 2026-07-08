"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { THEMES, useTheme, type Theme } from "@/lib/theme";

/**
 * Reusable theme picker. Renders a responsive grid of theme cards with live
 * preview swatches; selecting one applies it instantly and persists the choice
 * to localStorage. Used on the Profile > Theme tab.
 */
export default function ThemeSwitcher({
  className,
}: {
  className?: string;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {THEMES.map((t: Theme) => {
          const active = theme === t.id;
          const [bg, a1, a2, a3] = t.swatches;
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-[var(--radius-lg)] p-4 text-left"
              style={{
                background: active ? "rgba(99,102,241,0.10)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? "rgba(99,102,241,0.45)" : "var(--border-soft)"}`,
                boxShadow: active ? "0 0 0 1px var(--accent-glow-soft), 0 16px 40px var(--accent-glow-soft)" : "none",
              }}
            >
              {/* Preview banner */}
              <div
                className="relative mb-3 h-16 overflow-hidden rounded-xl"
                style={{ background: bg }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(120px 70px at 30% 20%, rgba(255,255,255,0.10), transparent 70%)",
                  }}
                />
                <div className="absolute bottom-2 left-2.5 flex gap-1.5">
                  {[a1, a2, a3].map((c, i) => (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full"
                      style={{ background: c, boxShadow: `0 0 10px ${c}66` }}
                    />
                  ))}
                </div>
                <div
                  className="absolute right-2 top-2 h-6 w-10 rounded-md"
                  style={{ background: `linear-gradient(135deg, ${a1}, ${a2} 50%, ${a3})` }}
                />
                {active && (
                  <span
                    className="absolute right-2 bottom-2 flex h-5 w-5 items-center justify-center rounded-full text-white"
                    style={{ background: "var(--accent)", boxShadow: "0 4px 12px var(--accent-glow)" }}
                  >
                    <Check size={12} />
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-white">{t.name}</p>
                  <p className="mt-0.5 truncate text-[11.5px]" style={{ color: "var(--muted)" }}>
                    {t.description}
                  </p>
                </div>
                {active && (
                  <span
                    className="meta-badge shrink-0"
                    style={{ background: "rgba(99,102,241,0.18)", color: "#c4b5fd" }}
                  >
                    Active
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
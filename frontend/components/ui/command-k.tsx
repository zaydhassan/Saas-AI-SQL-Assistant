"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Sparkles,
  Upload,
  Database,
  BarChart3,
  Settings,
  Bell,
  Clock,
  FileText,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

type Cmd = {
  label: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
  group: string;
};

const COMMANDS: Cmd[] = [
  { label: "Dashboard", hint: "Overview & analytics", href: "/dashboard", icon: <LayoutDashboard size={16} />, group: "Navigate" },
  { label: "Playground", hint: "Upload & explore data", href: "/playground", icon: <Upload size={16} />, group: "Navigate" },
  { label: "Dataset Library", hint: "Browse saved datasets", href: "/datasets", icon: <Database size={16} />, group: "Navigate" },
  { label: "SQL History", hint: "Past queries", href: "/history", icon: <Clock size={16} />, group: "Navigate" },
  { label: "Business Insights", hint: "AI-generated insights", href: "/insights", icon: <TrendingUp size={16} />, group: "AI" },
  { label: "Anomalies", hint: "Anomaly detection", href: "/anomalies", icon: <AlertTriangle size={16} />, group: "AI" },
  { label: "Saved Reports", hint: "Reports & schedules", href: "/reports", icon: <FileText size={16} />, group: "AI" },
  { label: "Alerts", hint: "Configure alerts", href: "/alerts", icon: <Bell size={16} />, group: "AI" },
  { label: "Profile & Settings", hint: "Account settings", href: "/profile", icon: <Settings size={16} />, group: "Account" },
  { label: "Pricing", hint: "Plans & billing", href: "/pricing", icon: <Sparkles size={16} />, group: "Account" },
];

export default function CommandK({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const router = useRouter();

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
    );
  }, [query]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => setActive(0), [query]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="glass-static relative w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)]"
          style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.7)" }}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <Search size={18} className="text-[var(--muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, actions…"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--muted-2)]"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && filtered[active]) {
                  e.preventDefault();
                  go(filtered[active].href);
                }
              }}
            />
            <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-[var(--muted)]">
              ESC
            </kbd>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {filtered.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-[var(--muted)]">
                No results
              </div>
            )}
            {filtered.map((c, i) => (
              <button
                key={c.href + c.label}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(c.href)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors"
                style={{
                  background: i === active ? "rgba(99,102,241,0.14)" : "transparent",
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#c7d2fe",
                  }}
                >
                  {c.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm text-white">{c.label}</span>
                  <span className="text-xs text-[var(--muted)]">{c.hint}</span>
                </span>
                <span className="ml-auto text-[11px] uppercase tracking-wide text-[var(--muted-2)]">
                  {c.group}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
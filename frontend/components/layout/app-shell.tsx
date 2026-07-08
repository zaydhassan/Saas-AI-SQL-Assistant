"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  AlertTriangle,
  FileText,
  Bell,
  History,
  Settings,
  Sparkles,
  Menu,
  X,
  Upload,
  ChevronRight,
  ChevronsUpDown,
  Zap,
  Sunrise,
  LineChart,
  Lightbulb,
} from "lucide-react";

type NavEntry = { name: string; href: string; icon: any; badge?: string };

const SECTIONS: { label: string; items: NavEntry[] }[] = [
  {
    label: "Workspace",
    items: [
      { name: "Command Center", href: "/command-center", icon: Sparkles },
      { name: "Daily Briefing", href: "/briefing", icon: Sunrise },
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Datasets", href: "/datasets", icon: Database },
      { name: "Playground", href: "/playground", icon: Upload },
    ],
  },
  {
    label: "Analytics",
    items: [
      { name: "Insights", href: "/insights", icon: TrendingUp },
      { name: "Forecasts", href: "/forecasts", icon: LineChart },
      { name: "Recommendations", href: "/recommendations", icon: Lightbulb },
      { name: "Anomalies", href: "/anomalies", icon: AlertTriangle, badge: "3" },
      { name: "Reports", href: "/reports", icon: FileText },
      { name: "Alerts", href: "/alerts", icon: Bell },
      { name: "SQL History", href: "/history", icon: History },
    ],
  },
  {
    label: "Account",
    items: [{ name: "Settings", href: "/profile", icon: Settings }],
  },
];

export default function AppShell({
  children,
  title,
  description,
  actions,
  breadcrumb,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const SidebarInner = (
    <div className="flex h-full flex-col">
      {/* Workspace switcher */}
      <div className="px-3 pt-3">
        <button type="button" className="ws-switcher w-full" style={{ boxShadow: "none" }}>
          <span className="ws-avatar">A</span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-semibold text-white">Acme Analytics</span>
            <span className="block text-[11px]" style={{ color: "var(--muted-2)" }}>Pro workspace</span>
          </span>
          <ChevronsUpDown size={15} className="shrink-0" style={{ color: "var(--muted)" }} />
        </button>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3" style={{ scrollbarGutter: "stable" }}>
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="nav-section">{section.label}</p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="nav-item"
                    data-active={active}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{ background: "var(--gradient-brand)" }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className="nav-item-icon" />
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Usage + upgrade */}
      <div className="px-3 pb-3">
        <div
          className="surface-2 rounded-2xl p-4"
          style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.14), rgba(139,92,246,0.05))", borderColor: "rgba(99,102,241,0.25)" }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white">
              <Zap size={13} className="text-amber-300" /> AI credits
            </span>
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>68%</span>
          </div>
          <div className="meter mt-2.5">
            <span style={{ width: "68%" }} />
          </div>
          <p className="mt-2.5 text-[11px]" style={{ color: "var(--muted)" }}>
            340 of 500 credits used this cycle.
          </p>
          <Link
            href="/pricing"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[12px] font-semibold text-white"
            style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 22px var(--accent-glow)" }}
          >
            Upgrade plan <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );

  const SidebarContainer = (
    <div className="flex h-full flex-col gap-0 p-0">{SidebarInner}</div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1500px] gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Desktop sidebar */}
      <aside
        className="hairline sticky top-28 hidden h-[calc(100vh-9rem)] w-[252px] shrink-0 overflow-hidden rounded-[var(--radius-xl)] lg:flex"
        style={{
          background: "rgba(10,14,35,0.55)",
          border: "1px solid var(--border-soft)",
          backdropFilter: "blur(20px) saturate(140%)",
          WebkitBackdropFilter: "blur(20px) saturate(140%)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {SidebarContainer}
      </aside>

      {/* Mobile sidebar toggle row */}
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tool-btn"
          >
            <Menu size={15} /> Menu
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[90] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute left-0 top-0 h-full w-72 overflow-y-auto"
                style={{
                  background: "rgba(10,14,35,0.96)",
                  border: "1px solid var(--border-soft)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ background: "rgba(255,255,255,0.06)", boxShadow: "none" }}
                >
                  <X size={16} />
                </button>
                {SidebarContainer}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page header */}
        {(breadcrumb || title || description || actions) && (
          <div className="mb-7">
            {breadcrumb && breadcrumb.length > 0 && (
              <div className="crumb mb-3">
                {breadcrumb.map((c, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight size={13} className="crumb-sep" />}
                    {c.href ? (
                      <Link href={c.href} className="hover:text-white">{c.label}</Link>
                    ) : (
                      <span style={{ color: "var(--text-soft)" }}>{c.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {title && (
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[28px]">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="mt-1.5 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
                    {description}
                  </p>
                )}
              </div>
              {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
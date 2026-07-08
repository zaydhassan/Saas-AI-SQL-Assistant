"use client";

import * as React from "react";

export default function ChartCard({
  title,
  subtitle,
  badge,
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`surface-3 hairline rounded-[var(--radius-xl)] p-5 ${className || ""}`}>
      <div className="shell-head">
        <div>
          <h3 className="shell-title">{title}</h3>
          {subtitle && <p className="shell-sub">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {badge && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: "rgba(99,102,241,0.12)", color: "#c7d2fe", border: "1px solid rgba(99,102,241,0.25)" }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
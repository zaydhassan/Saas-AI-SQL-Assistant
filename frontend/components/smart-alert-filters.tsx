"use client";

import * as React from "react";
import { Search } from "lucide-react";

export type SmartAlertFilters = {
  severity?: string;
  status?: string;
  search?: string;
  pinned?: boolean;
};

const SEVERITIES = ["all", "critical", "warning", "info"] as const;
const STATUSES = ["all", "open", "resolved", "archived"] as const;

export default function SmartAlertFiltersBar({
  filters,
  onChange,
}: {
  filters: SmartAlertFilters;
  onChange: (next: SmartAlertFilters) => void;
}) {
  const sev = filters.severity || "all";
  const st = filters.status || "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg" role="tablist" aria-label="Severity">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={sev === s}
              onClick={() => onChange({ ...filters, severity: s === "all" ? undefined : s })}
              className="seg-item"
            >
              {s === "all" ? "All severities" : s}
            </button>
          ))}
        </div>
        <div className="seg" role="tablist" aria-label="Status">
          {STATUSES.map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={st === s}
              onClick={() => onChange({ ...filters, status: s === "all" ? undefined : s })}
              className="seg-item"
            >
              {s === "all" ? "Any status" : s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...filters, pinned: !filters.pinned })}
          className="meta-badge"
          style={{
            background: filters.pinned ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
            color: filters.pinned ? "#c4b5fd" : "var(--muted)",
            border: `1px solid ${filters.pinned ? "rgba(99,102,241,0.4)" : "var(--border-soft)"}`,
          }}
        >
          {filters.pinned ? "Pinned only" : "Pin filter"}
        </button>
      </div>

      <div className="relative w-full sm:w-64">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted-2)" }}
        />
        <input
          value={filters.search || ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          placeholder="Search alerts…"
          className="w-full pl-8"
        />
      </div>
    </div>
  );
}
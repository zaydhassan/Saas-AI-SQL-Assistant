"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, Search } from "lucide-react";

export default function DataTable({
  rows,
  maxRows = 12,
}: {
  rows: Record<string, any>[];
  maxRows?: number;
}) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [filter, setFilter] = React.useState("");

  const columns = React.useMemo(
    () => (rows.length ? Object.keys(rows[0]) : []),
    [rows]
  );

  const processed = React.useMemo(() => {
    let r = [...rows];
    if (filter.trim()) {
      const q = filter.toLowerCase();
      r = r.filter((row) =>
        columns.some((c) => String(row[c] ?? "").toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      r.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return r.slice(0, maxRows);
  }, [rows, filter, sortKey, sortDir, columns, maxRows]);

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
        No rows
      </p>
    );
  }

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid var(--border-soft)" }}>
        <Search size={14} style={{ color: "var(--muted)" }} />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter rows…"
          className="flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[var(--muted-2)]"
          style={{ border: "none", padding: 0 }}
        />
        <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>{processed.length} shown</span>
      </div>
      <div className="table-wrap">
        <table className="simple-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  onClick={() => toggleSort(c)}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  <span className="inline-flex items-center gap-1">
                    {c}
                    {sortKey === c &&
                      (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processed.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c}>{String(row[c] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
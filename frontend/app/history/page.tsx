"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Search, Copy, RotateCw, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/app-shell";
import EmptyState from "@/components/ui/empty-state";
import { FadeUp } from "@/components/motion/primitives";
import { apiFetch } from "@/lib/api";

type QueryItem = {
  id: number;
  question: string;
  sql: string;
  dataset_id: number;
  dataset_name: string;
  rows_count: number;
  execution_time_ms: number | null;
  status: string;
  created_at: string | null;
};

const PAGE_SIZE = 10;

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HistoryPage() {
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState<QueryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [rerunningId, setRerunningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ items: QueryItem[]; total: number }>(
        `/api/queries?page=${page}&limit=${PAGE_SIZE}${filter ? `&search=${encodeURIComponent(filter)}` : ""}`
      );
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      toast.error(e.message || "Failed to load history");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  // Debounced search resets to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, filter ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function copySQL(item: QueryItem) {
    navigator.clipboard.writeText(item.sql);
    setCopiedId(item.id);
    toast.success("SQL copied");
    setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1800);
  }

  async function rerun(item: QueryItem) {
    setRerunningId(item.id);
    try {
      const res = await apiFetch<{ rows: any[] }>(`/api/queries/${item.id}/replay`, { method: "POST" });
      toast.success(`Re-ran query · ${res.rows?.length ?? 0} rows`);
    } catch (e: any) {
      toast.error(e.message || "Re-run failed");
    } finally {
      setRerunningId(null);
    }
  }

  return (
    <AppShell
      title="SQL History"
      description="Every question you've asked and the SQL it generated."
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)" }}>
          <Search size={15} style={{ color: "var(--muted)" }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search questions or SQL…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--muted-2)]"
            style={{ border: "none", padding: 0 }}
          />
          {total > 0 && (
            <span className="text-[11.5px]" style={{ color: "var(--muted-2)" }}>
              {total} {total === 1 ? "query" : "queries"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-static rounded-[var(--radius-lg)] p-5">
                <div className="skeleton shimmer h-4 w-2/3 rounded-full" />
                <div className="skeleton shimmer mt-3 h-12 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<History size={26} />}
            title={filter ? "No matching queries" : "No queries yet"}
            description={filter ? "Try a different search term." : "Ask a question on a dataset to populate your history."}
          />
        ) : (
          <div className="space-y-3">
            {items.map((h, i) => (
              <FadeUp key={h.id} delay={Math.min(i * 0.04, 0.24)}>
                <div className="glass-static rounded-[var(--radius-lg)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{h.question}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs" style={{ color: "var(--muted)" }}>
                        <span>{timeAgo(h.created_at)}</span>
                        <span>·</span>
                        <span>{h.dataset_name}</span>
                        <span>·</span>
                        <span>{h.rows_count} rows</span>
                        <span>·</span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            background: h.status === "Success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                            color: h.status === "Success" ? "#4ade80" : "#f87171",
                          }}
                        >
                          {h.status}
                        </span>
                        {h.execution_time_ms != null && (
                          <>
                            <span>·</span>
                            <span>{h.execution_time_ms} ms</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => copySQL(h)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-white"
                        style={{ boxShadow: "none", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)" }}
                        title="Copy SQL"
                      >
                        {copiedId === h.id ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => rerun(h)}
                        disabled={rerunningId === h.id}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-white disabled:opacity-50"
                        style={{ boxShadow: "none", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-soft)" }}
                        title="Re-run"
                      >
                        <RotateCw size={14} className={rerunningId === h.id ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>
                  <pre className="sql-pre mt-3">{h.sql}</pre>
                </div>
              </FadeUp>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11.5px]" style={{ color: "var(--muted-2)" }}>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="tool-btn disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="tool-btn disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
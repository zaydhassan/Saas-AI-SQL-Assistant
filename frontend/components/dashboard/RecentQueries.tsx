"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Save, X, CheckCircle2, XCircle, History } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";

type QueryRow = {
  sql: string;
  time: string;
  status: string;
};

const FILTERS = ["All", "Success", "Failed"] as const;

export default function RecentQueries() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [selectedSQL, setSelectedSQL] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  useEffect(() => {
    apiFetch<QueryRow[]>("/api/analytics/recent-queries")
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch(() => {
        toast.error("Failed to load recent queries");
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = rows.filter((r) =>
    filter === "All" ? true : filter === "Success" ? r.status === "Success" : r.status !== "Success"
  );

  async function copySQL() {
    if (!selectedSQL) return;
    await navigator.clipboard.writeText(selectedSQL);
    toast.success("SQL copied to clipboard");
  }

  async function saveAsReport() {
    if (!selectedSQL) return;
    try {
      setSaving(true);
      await apiFetch("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          sql: selectedSQL,
        }),
      });
      toast.success("Query saved as report");
    } catch {
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="surface-3 hairline rounded-[var(--radius-xl)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <History size={16} className="text-[var(--accent)]" />
            <h3 className="text-[15px] font-semibold text-white">Recent Queries</h3>
            {!loading && rows.length > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
              >
                {rows.length}
              </span>
            )}
          </div>
          {!loading && rows.length > 0 && (
            <div className="seg">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className="seg-item"
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton shimmer h-10 w-full rounded-[var(--radius-sm)]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<History size={26} />}
            title="No queries yet"
            description="Your recent SQL queries will appear here once you start asking questions."
          />
        ) : (
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th className="w-[60%]">SQL</th>
                  <th className="w-[20%] text-center">Time</th>
                  <th className="w-[20%] text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={i} onClick={() => setSelectedSQL(r.sql)} style={{ cursor: "pointer" }}>
                    <td className="truncate">{r.sql}</td>
                    <td className="text-center" style={{ fontFamily: "var(--font-sans)" }}>{r.time}</td>
                    <td className="text-center">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          background: r.status === "Success" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                          color: r.status === "Success" ? "#34d399" : "#f87171",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {r.status === "Success" ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SQL modal */}
      <AnimatePresence>
        {selectedSQL && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSQL(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-3xl overflow-hidden rounded-[var(--radius-xl)]"
              style={{
                background: "rgba(10,14,35,0.96)",
                border: "1px solid var(--border-soft)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <h4 className="font-medium text-white">SQL Query</h4>
                <button
                  onClick={() => setSelectedSQL(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-white"
                  style={{ boxShadow: "none", background: "transparent" }}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[55vh] overflow-auto p-6">
                <pre className="text-sm whitespace-pre-wrap break-words text-emerald-300" style={{ fontFamily: "var(--font-mono)" }}>
                  {selectedSQL}
                </pre>
              </div>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
                <span className="text-xs" style={{ color: "var(--muted)" }}>Click outside to close</span>
                <div className="flex gap-2">
                  <button
                    onClick={copySQL}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", boxShadow: "none" }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                  <button
                    disabled={saving}
                    onClick={saveAsReport}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: "var(--gradient-brand)", boxShadow: "0 10px 28px var(--accent-glow)" }}
                  >
                    <Save size={14} /> {saving ? "Saving…" : "Save as Report"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
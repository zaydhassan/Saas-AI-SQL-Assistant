"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

type QueryRow = {
  sql: string;
  time: string;
  status: string;
};

export default function RecentQueries() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [selectedSQL, setSelectedSQL] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<QueryRow[]>("/api/analytics/recent-queries")
      .then(setRows)
      .catch(() => {
        toast.error("Failed to load recent queries");
      });
  }, []);

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
      {/* CARD */}
      <div className="rounded-xl bg-white/5 p-6 border border-white/10">
        <h3 className="text-white mb-4">Recent Queries</h3>

        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400">No queries yet</p>
        ) : (
          <table className="w-full text-sm table-fixed">
            <thead className="text-neutral-500 uppercase text-xs">
              <tr>
                <th className="text-left py-2 w-[60%]">SQL</th>
                <th className="text-center w-[20%]">Time</th>
                <th className="text-center w-[20%]">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedSQL(r.sql)}
                  className="border-t border-white/10 hover:bg-white/5 transition cursor-pointer"
                >
                  <td className="py-2 text-neutral-300 truncate whitespace-nowrap overflow-hidden">
                    <span className="hover:text-purple-400">
                      {r.sql}
                    </span>
                  </td>

                  <td className="text-center text-neutral-300">
                    {r.time}
                  </td>

                  <td
                    className={`text-center font-medium ${
                      r.status === "Success"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SQL MODAL */}
      {selectedSQL && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedSQL(null)}
        >
          <div
            className="w-full max-w-3xl bg-[#0b1020] border border-white/10 rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h4 className="text-white font-medium">SQL Query</h4>
              <button
                onClick={() => setSelectedSQL(null)}
                className="text-neutral-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 max-h-[60vh] overflow-auto">
              <pre className="text-sm text-emerald-300 whitespace-pre-wrap wrap-break-word font-mono">
{selectedSQL}
              </pre>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
              <span className="text-xs text-neutral-400">
                Click outside or × to close
              </span>

              <div className="flex gap-2">
                <button
                  onClick={copySQL}
                  className="px-4 py-2 rounded-md bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
                >
                  Copy SQL
                </button>

                <button
                  disabled={saving}
                  onClick={saveAsReport}
                  className="px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm"
                >
                  {saving ? "Saving..." : "Save as Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
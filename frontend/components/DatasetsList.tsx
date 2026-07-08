"use client";

import { useEffect, useState } from "react";
import { Trash2, Database, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import EmptyState from "@/components/ui/empty-state";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

type Dataset = {
  id: number;
  name: string;
};

export default function DatasetsList() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDatasets() {
    try {
      const data = await apiFetch<Dataset[]>(`/api/datasets`);
      setDatasets(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setDatasets([]); // not logged in
      } else {
        toast.error("Failed to load datasets");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDatasets();
    window.addEventListener("dataset-updated", loadDatasets);
    return () => {
      window.removeEventListener("dataset-updated", loadDatasets);
    };
  }, []);

  const removeDataset = async (id: number, name: string) => {
    try {
      await apiFetch(`/api/datasets/${id}`, { method: "DELETE" });
      setDatasets((prev) => prev.filter((d) => d.id !== id));

      toast.success("Dataset removed", {
        description: `${name} deleted successfully`,
      });

      window.dispatchEvent(new Event("dataset-updated"));
    } catch {
      toast.error("Failed to delete dataset");
    }
  };

  return (
    <div className="glass-static rounded-[var(--radius-2xl)] p-7">
      <div className="mb-5 flex items-center gap-2.5">
        <Database size={16} className="text-[var(--accent)]" />
        <h3 className="text-lg font-semibold text-white">Your Datasets</h3>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton shimmer h-14 w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : datasets.length === 0 ? (
        <EmptyState
          icon={<Database size={26} />}
          title="No datasets yet"
          description="Upload your first CSV to start asking questions in plain English."
        />
      ) : (
        <ul className="space-y-2.5">
          {datasets.map((d, i) => (
            <motion.li
              key={d.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3.5 transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--border-soft)" }}
            >
              <Link href={`/datasets/${d.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}>
                  <Database size={15} />
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{d.name}</span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Ready for questions</span>
                </div>
              </Link>

              <div className="flex items-center gap-1">
                <Link
                  href={`/datasets/${d.id}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                >
                  <ArrowRight size={15} />
                </Link>
                <button
                  onClick={() => removeDataset(d.id, d.name)}
                  title="Remove dataset"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                  style={{ boxShadow: "none", background: "transparent" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
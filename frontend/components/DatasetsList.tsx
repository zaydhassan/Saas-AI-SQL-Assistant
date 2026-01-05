"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import GlassCard from "./GlassCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

type Dataset = {
  id: number;
  name: string;
};

export default function DatasetsList() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDatasets() {
    const token = localStorage.getItem("access_token");

    if (!token) {
      setDatasets([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/datasets`,
        {
          headers: {
            Authorization: `Bearer ${token}`, 
          },
        }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();
      setDatasets(data);
    } catch {
      toast.error("Failed to load datasets");
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
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/datasets/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`, 
          },
        }
      );

      if (!res.ok) throw new Error();
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
    <GlassCard>
      <h3 className="mb-4">Your Datasets</h3>

      {loading && (
        <p className="muted text-sm">Loading datasets…</p>
      )}

      {!loading && datasets.length === 0 && (
        <p className="muted text-sm">
          No datasets uploaded yet
        </p>
      )}

      <ul className="space-y-2">
        {datasets.map((d) => (
          <li
            key={d.id}
            className="
              group flex items-center justify-between
              rounded-lg border border-white/10
              px-4 py-3
              hover:bg-white/5 transition
            "
          >
            <a
              href={`/datasets/${d.id}`}
              className="flex flex-col"
            >
              <span className="font-medium">
                📊 {d.name}
              </span>
              <span className="text-xs text-muted-foreground">
                Ready for questions
              </span>
            </a>

            <button
              onClick={() => removeDataset(d.id, d.name)}
              className="
                text-muted-foreground
                hover:text-red-400
                opacity-0 group-hover:opacity-100
                transition
              "
              title="Remove dataset"
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
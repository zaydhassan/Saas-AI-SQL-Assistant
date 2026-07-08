"use client";

import { Database, Pin, Sparkles } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import UploadDatasetForm from "@/components/UploadDatasetForm";
import DatasetsList from "@/components/DatasetsList";
import { FadeUp } from "@/components/motion/primitives";

const pinned = [
  { name: "Sales 2024", rows: "12,480 rows" },
  { name: "Customer churn", rows: "3,210 rows" },
];

export default function DatasetsLibraryPage() {
  return (
    <AppShell
      title="Dataset Library"
      description="Upload, manage, and explore your datasets. Ask questions in plain English."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UploadDatasetForm />
          <DatasetsList />
        </div>

        <FadeUp>
          <div className="glass-static rounded-[var(--radius-xl)] p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <Pin size={16} className="text-[var(--accent)]" />
              <h3 className="text-base font-semibold text-white">Pinned datasets</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pinned.map((d) => (
                <div key={d.name} className="flex items-center gap-3 rounded-[var(--radius-md)] p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-soft)" }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--border)" }}>
                    <Database size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{d.name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{d.rows}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
              <Sparkles size={12} /> Pin frequently-used datasets for quick access.
            </p>
          </div>
        </FadeUp>
      </div>
    </AppShell>
  );
}
import AskPanel from "../../../components/AskPanel";
import DatasetIntelligence from "../../../components/dataset-intelligence";
import AppShell from "../../../components/layout/app-shell";
import { Database, Sparkles, ShieldCheck } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DatasetPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <AppShell
      title={`Dataset #${id}`}
      description="Ask natural-language questions and get instant SQL, charts, and insights."
    >
      <div className="space-y-6">
        {/* status badges */}
        <div className="flex flex-wrap gap-3">
          <span className="meta-badge flex items-center gap-2">
            <Database size={13} /> CSV Loaded
          </span>
          <span className="meta-badge flex items-center gap-2" style={{ background: "rgba(99,102,241,0.14)", borderColor: "rgba(99,102,241,0.3)", color: "#c7d2fe" }}>
            <Sparkles size={13} /> AI Ready
          </span>
          <span className="meta-badge flex items-center gap-2">
            <ShieldCheck size={13} /> Read-only
          </span>
        </div>

        {/* AI Dataset Intelligence (Feature 2) — auto-analyzed on upload */}
        <DatasetIntelligence datasetId={id} />

        {/* chat */}
        <div className="glass-static rounded-[var(--radius-2xl)] p-5 sm:p-7">
          <AskPanel datasetId={id} />
        </div>

        {/* suggestions */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-white">Try asking</h3>
          <div className="suggestion-chips">
            <span className="chip">Total sales per month</span>
            <span className="chip">Top 5 products by revenue</span>
            <span className="chip">Sales trend over time</span>
            <span className="chip">Average order value</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
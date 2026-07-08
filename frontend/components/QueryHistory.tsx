"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function QueryHistory({ datasetId }: { datasetId: string }) {
  const [queries, setQueries] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<any[]>(`/api/datasets/${datasetId}/queries`)
      .then(setQueries)
      .catch(() => setQueries([]));
  }, [datasetId]);

  return (
    <div className="glass mt-6">
      <h3>Query History</h3>

      {queries.map(q => (
        <div key={q.id} className="query-item">
          <p className="font-medium">{q.question}</p>
          <pre className="text-xs">{q.sql}</pre>
        </div>
      ))}
    </div>
  );
}
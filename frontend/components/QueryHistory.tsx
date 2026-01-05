"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export default function QueryHistory({ datasetId }: { datasetId: string }) {
  const [queries, setQueries] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_BASE}/api/datasets/${datasetId}/queries`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(setQueries);
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
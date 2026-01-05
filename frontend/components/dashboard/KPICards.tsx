"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function KPICards() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/analytics/overview").then(setData);
  }, []);

  const stats = [
    { label: "Total Queries", value: data?.total_queries ?? "—" },
    { label: "Avg Execution Time", value: data ? `${data.avg_execution_time} ms` : "—" },
    { label: "Failed Queries", value: data?.failed_queries ?? "—" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-white/5 p-5 border border-white/10">
          <p className="text-sm text-neutral-400">{s.label}</p>
          <p className="text-2xl font-semibold text-white mt-2">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
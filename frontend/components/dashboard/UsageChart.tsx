"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { apiFetch } from "@/lib/api";

export default function UsageChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/analytics/query-volume").then(setData);
  }, []);

  return (
    <div className="rounded-xl bg-white/5 p-6 border border-white/10">
      <h3 className="text-white mb-4">Query Volume</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="day" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip />
          <Line dataKey="queries" stroke="#8b5cf6" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
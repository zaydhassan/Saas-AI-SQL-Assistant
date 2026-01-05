export default function AIInsights() {
  return (
    <div className="rounded-xl bg-linear-to-br from-indigo-500/15 to-violet-500/5
    border border-white/10 p-6">
      <h3 className="text-white font-medium mb-3">AI Insights</h3>
      <ul className="space-y-2 text-sm text-neutral-300">
        <li>• Query volume spikes every Friday afternoon</li>
        <li>• DELETE operations cause most failures</li>
        <li>• Latency increases significantly beyond 300ms</li>
      </ul>
    </div>
  );
}
"use client";

import UploadDatasetForm from "@/components/UploadDatasetForm";
import DatasetsList from "@/components/DatasetsList";

export default function PlaygroundPage() {
  return (
    <main className="min-h-[calc(100vh-6rem)] flex justify-center">
      <div className="w-full max-w-6xl px-4 py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold">Playground</h1>
          <p className="mt-3 text-muted">
            Upload your dataset and ask questions in plain English.
            No SQL required.
          </p>
        </div>

        {/* Environment Status */}
<div className="mt-6 flex justify-center">
  <div className="flex gap-4 text-sm px-4 py-2 rounded-full border border-white/10 bg-white/5">
    <span className="text-green-400">● Secure</span>
    <span className="text-muted">Read-only SQL</span>
    <span className="text-muted">AI schema detection</span>
  </div>
</div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Left: Upload */}
          <UploadDatasetForm />

          {/* Right: Dataset List */}
          <DatasetsList />

        </div>

      </div>
    </main>
  );
}
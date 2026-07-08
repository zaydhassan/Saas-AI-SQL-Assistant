"use client";

import { ShieldCheck, Lock, Sparkles } from "lucide-react";
import { FadeUp } from "@/components/motion/primitives";
import UploadDatasetForm from "@/components/UploadDatasetForm";
import DatasetsList from "@/components/DatasetsList";

export default function PlaygroundPage() {
  return (
    <main className="relative mx-auto min-h-[calc(100vh-6rem)] max-w-6xl px-4 py-20">
      <FadeUp className="text-center">
        <span className="eyebrow">
          <Sparkles size={13} /> Playground
        </span>
        <h1 className="mt-5">Upload & ask anything</h1>
        <p className="mx-auto mt-4 max-w-xl text-[16px]" style={{ color: "var(--muted)" }}>
          Upload your dataset and ask questions in plain English. No SQL required.
        </p>
      </FadeUp>

      <FadeUp delay={0.1} className="mt-8 flex justify-center">
        <div
          className="flex flex-wrap items-center justify-center gap-4 rounded-full px-5 py-2 text-sm"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <span className="flex items-center gap-1.5 text-emerald-300">
            <ShieldCheck size={14} /> Secure
          </span>
          <span style={{ color: "var(--muted)" }}>Read-only SQL</span>
          <span style={{ color: "var(--muted)" }}>AI schema detection</span>
          <span className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <Lock size={13} /> No training on your data
          </span>
        </div>
      </FadeUp>

      <div className="mt-12 grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <UploadDatasetForm />
        <DatasetsList />
      </div>
    </main>
  );
}
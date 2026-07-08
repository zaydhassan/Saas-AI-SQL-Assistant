"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ShimmerBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton shimmer", className)} />;
}

export function ShimmerLine({ className }: { className?: string }) {
  return <div className={cn("skeleton shimmer h-3 w-full rounded-full", className)} />;
}

export function ShimmerKPI() {
  return (
    <div className="glass-static rounded-[var(--radius-md)] p-5">
      <ShimmerLine className="w-20" />
      <ShimmerLine className="mt-4 h-7 w-28" />
    </div>
  );
}
"use client";

import * as React from "react";
import { FadeUp } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <FadeUp
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="max-w-3xl text-balance">{title}</h2>
      {subtitle && (
        <p
          className={cn(
            "max-w-2xl text-[16px] leading-relaxed",
            align === "center" ? "mx-auto" : ""
          )}
          style={{ color: "var(--muted)" }}
        >
          {subtitle}
        </p>
      )}
    </FadeUp>
  );
}
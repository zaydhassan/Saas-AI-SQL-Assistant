"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function GlassCard({
  children,
  className,
  hover = true,
  glow = false,
  delay = 0,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -4 } : undefined}
      className={cn(
        "relative overflow-hidden",
        hover ? "glass" : "glass-static",
        glow && "glow",
        "rounded-[var(--radius-xl)]",
        className
      )}
      {...(rest as any)}
    >
      {children}
    </motion.div>
  );
}
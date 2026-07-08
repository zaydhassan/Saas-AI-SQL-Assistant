"use client";

import { motion } from "framer-motion";

/* Animated aurora orbs + particle field. Mounted once in the root layout
   behind all content. Purely decorative; no pointer events. */
export default function AuroraBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <motion.div
        className="absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--bg-glow-1), transparent 62%)",
          filter: "blur(40px)",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--bg-glow-2), transparent 62%)",
          filter: "blur(50px)",
        }}
        animate={{ x: [0, -30, 20, 0], y: [0, 20, -20, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 -left-24 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--bg-glow-3), transparent 62%)",
          filter: "blur(50px)",
        }}
        animate={{ x: [0, 30, -10, 0], y: [0, -20, 10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";

/* Soft pointer-follow glow. Mounted once globally. Disabled on touch / reduced motion. */
export default function MouseGlow() {
  const x = useMotionValue(-500);
  const y = useMotionValue(-500);
  const sx = useSpring(x, { stiffness: 120, damping: 25, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 120, damping: 25, mass: 0.5 });

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden md:block"
      onMouseMove={(e) => {
        x.set(e.clientX - 200);
        y.set(e.clientY - 200);
      }}
      style={{
        background: `radial-gradient(400px circle at 0 0, rgba(99,102,241,0.07), transparent 65%)`,
        x: sx,
        y: sy,
        width: 400,
        height: 400,
      }}
    />
  );
}
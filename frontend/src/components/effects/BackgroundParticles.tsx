"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

export function BackgroundParticles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        x: (i * 47 + 13) % 100,
        y: (i * 31 + 7) % 100,
        s: 0.35 + (i % 7) * 0.12,
        d: 10 + (i % 14),
        delay: (i % 10) * 0.15,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden>
      {dots.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full blur-xl"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: `${d.s}rem`,
            height: `${d.s}rem`,
            background:
              d.id % 3 === 0
                ? "color-mix(in srgb, var(--brand-orange) 28%, transparent)"
                : d.id % 3 === 1
                  ? "color-mix(in srgb, var(--brand-cyan) 26%, transparent)"
                  : "color-mix(in srgb, var(--brand-magenta) 22%, transparent)",
          }}
          initial={{ opacity: 0.12, scale: 0.9 }}
          animate={{
            opacity: [0.12, 0.42, 0.15, 0.35, 0.12],
            scale: [1, 1.25, 1.05, 1.18, 1],
            x: [0, 6, -4, 3, 0],
            y: [0, -5, 4, -3, 0],
          }}
          transition={{
            duration: d.d,
            repeat: Infinity,
            ease: "easeInOut",
            delay: d.delay,
          }}
        />
      ))}
    </div>
  );
}

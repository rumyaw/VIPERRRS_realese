"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={toggleTheme}
      className={cn(
        "glass-panel inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg",
        "border border-[var(--glass-border)] transition-colors hover:bg-[var(--glass-bg-strong)]",
        className,
      )}
      aria-label={isDark ? "Светлая тема" : "Тёмная тема"}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
    >
      <span className="select-none">{isDark ? "☀️" : "🌙"}</span>
    </motion.button>
  );
}

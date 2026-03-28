"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { navLinkButtonClass } from "@/lib/nav-link-styles";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-lg flex-col items-center text-center"
    >
      <GlassPanel className="w-full space-y-6 p-8 sm:p-10">
        <p
          className="font-display text-6xl font-bold tracking-tight text-[var(--text-primary)] sm:text-7xl"
          style={{
            background: "var(--gradient-text)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          404
        </p>
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">Страница не найдена</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Ссылка устарела или адрес введён с ошибкой. Вернитесь на главную или в личный кабинет.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
          >
            На главную
          </Link>
          <Link href="/dashboard" className={navLinkButtonClass}>
            В кабинет
          </Link>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

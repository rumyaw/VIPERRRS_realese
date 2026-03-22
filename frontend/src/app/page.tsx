"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useAuth } from "@/contexts/auth-context";
import { useFavorites } from "@/hooks/use-favorites";
import Link from "next/link";
import { MOCK_OPPORTUNITIES, TAG_PRESETS } from "@/lib/mock-data";
import type { Opportunity, WorkFormat } from "@/lib/types";
import { cn } from "@/lib/cn";

const YandexMap = dynamic(
  () => import("@/components/map/YandexMap").then((m) => m.YandexMap),
  { ssr: false, loading: () => <GlassPanel className="h-[min(62vh,560px)] animate-pulse" /> },
);

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { favoriteIds, toggle, has } = useFavorites();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | "">("");
  const [format, setFormat] = useState<WorkFormat | "">("");
  const [view, setView] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    return MOCK_OPPORTUNITIES.filter((o) => {
      const hay = `${o.title} ${o.companyName} ${o.tags.join(" ")}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (tag && !o.tags.includes(tag)) return false;
      if (format && o.workFormat !== format) return false;
      return true;
    });
  }, [q, tag, format]);

  return (
    <div className="space-y-10">
      <section className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl"
        >
          Прыгай выше с{" "}
          <span className="bg-[linear-gradient(90deg,var(--brand-magenta),var(--brand-orange))] bg-clip-text text-transparent">
            Трамплином
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mx-auto mt-4 max-w-2xl text-[var(--text-secondary)]"
        >
          Вакансии, стажировки, менторство и карьерные события — на карте и в ленте. Избранное из
          главной сохраняется в браузере; на карте такие точки подсвечиваются оранжевым маркером.
        </motion.p>
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_8%,transparent)] px-4 py-4 text-sm text-[var(--text-secondary)] sm:flex-row sm:justify-between sm:text-left"
          >
            <span>
              <strong className="text-[var(--text-primary)]">Гость:</strong> просмотр карты и ленты,
              поиск, избранное в этом браузере. Личный кабинет и отклики — после входа.
            </span>
            <Link
              href="/login"
              className="shrink-0 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
            >
              Войти
            </Link>
          </motion.div>
        )}
      </section>

      <GlassPanel className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Поиск</label>
            <input
              className="glass-input w-full px-4 py-3 text-sm outline-none ring-[var(--brand-cyan)] focus:ring-2"
              placeholder="Название, компания, навык…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Тег / стек</label>
              <select
                className="glass-input w-full px-4 py-3 text-sm outline-none"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="">Все технологии</option>
                {TAG_PRESETS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Формат</label>
              <select
                className="glass-input w-full px-4 py-3 text-sm outline-none"
                value={format}
                onChange={(e) => setFormat(e.target.value as WorkFormat | "")}
              >
                <option value="">Любой</option>
                <option value="office">Офис</option>
                <option value="hybrid">Гибрид</option>
                <option value="remote">Удалённо</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 rounded-2xl border border-[var(--glass-border)] p-1">
            <button
              type="button"
              onClick={() => setView("map")}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                view === "map"
                  ? "bg-[var(--glass-bg-strong)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)]",
              )}
            >
              Карта
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                view === "list"
                  ? "bg-[var(--glass-bg-strong)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)]",
              )}
            >
              Лента
            </button>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          Найдено: {filtered.length} из {MOCK_OPPORTUNITIES.length}
        </p>
      </GlassPanel>

      {view === "map" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel overflow-hidden p-1 sm:p-2"
        >
          <YandexMap
            opportunities={filtered}
            favoriteIds={favoriteIds}
            onMarkerClick={(id) => router.push(`/opportunities/${id}`)}
          />
        </motion.div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((opp: Opportunity) => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              favorite={has(opp.id)}
              onToggleFavorite={() => toggle(opp.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

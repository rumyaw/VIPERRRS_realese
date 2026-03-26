"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback } from "react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useAuth } from "@/contexts/auth-context";
import { useFavorites } from "@/hooks/use-favorites";
import Link from "next/link";
import { TAG_PRESETS } from "@/lib/mock-data";
import type { Opportunity, WorkFormat } from "@/lib/types";
import { cn } from "@/lib/cn";
import { fetchOpportunities, fetchServerFavorites, addServerFavorite, removeServerFavorite } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { ShareMenu } from "@/components/opportunities/ShareMenu";

const YandexMap = dynamic(
  () => import("@/components/map/YandexMap").then((m) => m.YandexMap),
  { ssr: false, loading: () => <GlassPanel className="h-[min(62vh,560px)] animate-pulse" /> },
);

export default function HomePage() {
  const { user } = useAuth();
  const { favoriteIds, toggle, has } = useFavorites();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | "">("");
  const [format, setFormat] = useState<WorkFormat | "">("");
  const [city, setCity] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const [popupId, setPopupId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [serverFavIds, setServerFavIds] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);

  const cities = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => {
      const c = o.locationLabel.split(",")[0].trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [opportunities]);

  useEffect(() => {
    const abort = new AbortController();
    fetchOpportunities(abort.signal)
      .then((items) => {
        setOpportunities(items);
      })
      .catch(() => {
        setApiError(true);
      })
      .finally(() => setApiLoaded(true));
    return () => abort.abort();
  }, []);

  useEffect(() => {
    if (user?.role === "applicant") {
      fetchServerFavorites().then((ids) => setServerFavIds(new Set(ids))).catch(() => {});
    }
  }, [user]);

  const handleToggleFavorite = useCallback(
    (oppId: string) => {
      if (user?.role === "curator") return;
      if (!user) {
        showToast("Войдите или зарегистрируйтесь, чтобы добавить в избранное", "info");
        return;
      }
      toggle(oppId);
      if (user.role === "applicant") {
        if (serverFavIds.has(oppId)) {
          removeServerFavorite(oppId).catch(() => {});
          setServerFavIds((prev) => { const n = new Set(prev); n.delete(oppId); return n; });
        } else {
          addServerFavorite(oppId).catch(() => {});
          setServerFavIds((prev) => new Set(prev).add(oppId));
        }
      }
    },
    [user, toggle, serverFavIds, showToast],
  );

  const favoriteOpps = useMemo(() => {
    return opportunities.filter((o) => has(o.id));
  }, [opportunities, favoriteIds]);

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      if (has(o.id)) return false;
      const hay = `${o.title} ${o.companyName} ${o.tags.join(" ")}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (tag && !o.tags.includes(tag)) return false;
      if (format && o.workFormat !== format) return false;
      if (city && !o.locationLabel.startsWith(city)) return false;
      if (typeFilter && o.type !== typeFilter) return false;
      return true;
    });
  }, [q, tag, format, city, typeFilter, opportunities, favoriteIds]);

  const popupOpp = useMemo(() => {
    if (!popupId) return null;
    return filtered.find((o) => o.id === popupId) ?? null;
  }, [popupId, filtered]);

  return (
    <div className="space-y-10">
      <section className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl md:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Прыгай выше с{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #C65D3B 0%, #F1E3C6 100%)",
              fontFamily: "var(--font-display)",
              fontSize: "1.15em",
            }}
          >
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
            className="mt-6"
          >
            <Link
              href="/login"
              className="inline-block rounded-xl bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
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
              className="glass-input w-full px-4 py-3 text-sm outline-none ring-[var(--brand-orange)] focus:ring-2"
              placeholder="Название, компания, навык…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Тег / стек</label>
              <select
                className="glass-select w-full px-4 py-3 text-sm outline-none"
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
                className="glass-select w-full px-4 py-3 text-sm outline-none"
                value={format}
                onChange={(e) => setFormat(e.target.value as WorkFormat | "")}
              >
                <option value="">Любой</option>
                <option value="office">Офис</option>
                <option value="hybrid">Гибрид</option>
                <option value="remote">Удалённо</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Город</label>
              <select
                className="glass-select w-full px-4 py-3 text-sm outline-none"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Все города</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Тип</label>
              <select
                className="glass-select w-full px-4 py-3 text-sm outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Все типы</option>
                <option value="vacancy_junior">Вакансия Junior</option>
                <option value="vacancy_senior">Вакансия Middle+</option>
                <option value="internship">Стажировка</option>
                <option value="mentorship">Менторство</option>
                <option value="event">Мероприятие</option>
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
          Найдено: {filtered.length} из {opportunities.length}
          {!apiLoaded && " · загрузка..."}
          {apiError && " · не удалось загрузить возможности"}
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
            onMarkerClick={(id) => setPopupId(id)}
          />
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Мои избранные */}
          {favoriteOpps.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowFavorites(!showFavorites)}
                className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--brand-orange)]"
              >
                ★ Мои избранные ({favoriteOpps.length})
                <span className="text-sm font-normal text-[var(--text-secondary)]">
                  {showFavorites ? "▲ свернуть" : "▼ развернуть"}
                </span>
              </button>
              {showFavorites && (
                <div className="grid gap-5 md:grid-cols-2">
                  {favoriteOpps.map((opp: Opportunity) => (
                    <div key={opp.id} className="h-full">
                      <OpportunityCard
                        opp={opp}
                        favorite
                        onToggleFavorite={user?.role !== "curator" ? () => handleToggleFavorite(opp.id) : undefined}
                        onRecommend={user?.role === "applicant" ? opp.id : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Общий список */}
          <div className="grid gap-5 md:grid-cols-2">
            {filtered.map((opp: Opportunity) => (
              <div key={opp.id} className="h-full">
                <OpportunityCard
                  opp={opp}
                  favorite={has(opp.id)}
                  onToggleFavorite={user?.role !== "curator" ? () => handleToggleFavorite(opp.id) : undefined}
                  onRecommend={user?.role === "applicant" ? opp.id : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {popupOpp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => setPopupId(null)}
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--page-bg)_92%,transparent)] p-4 shadow-2xl backdrop-blur-2xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Карточка вакансии</p>
              <button
                type="button"
                onClick={() => setPopupId(null)}
                className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-1 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--glass-bg-strong)]"
              >
                Закрыть
              </button>
            </div>

            <OpportunityCard
              opp={popupOpp}
              compact
              favorite={has(popupOpp.id)}
              onToggleFavorite={user && user.role !== "curator" ? () => handleToggleFavorite(popupOpp.id) : undefined}
              onRecommend={user?.role === "applicant" ? popupOpp.id : undefined}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useCallback } from "react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { useAuth } from "@/contexts/auth-context";
import { useFavorites } from "@/hooks/use-favorites";
import Link from "next/link";
import { TAG_PRESETS } from "@/lib/mock-data";
import type { Opportunity, WorkFormat } from "@/lib/types";
import { cn } from "@/lib/cn";
import { fetchOpportunities, fetchServerFavorites, addServerFavorite, removeServerFavorite } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

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
  const [salaryFrom, setSalaryFrom] = useState("");
  const [salaryTo, setSalaryTo] = useState("");
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

  const tagOptions = useMemo(
    () => [{ value: "", label: "Все технологии" }, ...TAG_PRESETS.map((t) => ({ value: t, label: t }))],
    [],
  );
  const formatOptions = useMemo(
    () => [
      { value: "", label: "Любой" },
      { value: "office", label: "Офис" },
      { value: "hybrid", label: "Гибрид" },
      { value: "remote", label: "Удалённо" },
    ],
    [],
  );
  const cityOptions = useMemo(
    () => [{ value: "", label: "Все города" }, ...cities.map((c) => ({ value: c, label: c }))],
    [cities],
  );
  const typeOptions = useMemo(
    () => [
      { value: "", label: "Все типы" },
      { value: "vacancy_junior", label: "Вакансия Junior" },
      { value: "vacancy_senior", label: "Вакансия Middle+" },
      { value: "internship", label: "Стажировка" },
      { value: "mentorship", label: "Менторство" },
      { value: "event", label: "Мероприятие" },
    ],
    [],
  );

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
    if (!user) return [];
    return opportunities.filter((o) => has(o.id));
  }, [opportunities, user, has, favoriteIds]);

  const salaryFromNum = salaryFrom.trim() === "" ? null : parseInt(salaryFrom.replace(/\s/g, ""), 10);
  const salaryToNum = salaryTo.trim() === "" ? null : parseInt(salaryTo.replace(/\s/g, ""), 10);

  const filtered = useMemo(() => {
    const fMin = salaryFromNum != null && !Number.isNaN(salaryFromNum) ? salaryFromNum : null;
    const fMax = salaryToNum != null && !Number.isNaN(salaryToNum) ? salaryToNum : null;
    const salaryFilterActive = fMin != null || fMax != null;

    return opportunities.filter((o) => {
      if (user && has(o.id)) return false;
      const hay = `${o.title} ${o.companyName} ${o.tags.join(" ")}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (tag && !o.tags.includes(tag)) return false;
      if (format && o.workFormat !== format) return false;
      if (city && !o.locationLabel.startsWith(city)) return false;
      if (typeFilter && o.type !== typeFilter) return false;
      if (salaryFilterActive) {
        if (o.salaryMin == null || o.salaryMax == null) return false;
        const oMin = o.salaryMin;
        const oMax = o.salaryMax;
        const wantMin = fMin ?? 0;
        const wantMax = fMax ?? Number.MAX_SAFE_INTEGER;
        if (oMax < wantMin || oMin > wantMax) return false;
      }
      return true;
    });
  }, [q, tag, format, city, typeFilter, salaryFromNum, salaryToNum, opportunities, user, has, favoriteIds]);

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
          Вакансии, стажировки, менторство и карьерные события — на карте и в ленте. Избранное доступно
          после входа; на карте избранные точки подсвечиваются оранжевым маркером.
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

      <GlassPanel className="relative z-20 p-4 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Поиск</label>
            <input
              className="glass-input w-full px-4 py-3 text-sm outline-none ring-[var(--brand-orange)] focus:ring-2"
              placeholder="Название, компания, навык…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="filter-tag">
                Тег / стек
              </label>
              <GlassSelect
                id="filter-tag"
                value={tag}
                onChange={setTag}
                options={tagOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="filter-format">
                Формат
              </label>
              <GlassSelect
                id="filter-format"
                value={format}
                onChange={(v) => setFormat(v as WorkFormat | "")}
                options={formatOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="filter-city">
                Город
              </label>
              <GlassSelect
                id="filter-city"
                value={city}
                onChange={setCity}
                options={cityOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="filter-type">
                Тип
              </label>
              <GlassSelect
                id="filter-type"
                value={typeFilter}
                onChange={setTypeFilter}
                options={typeOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm outline-none"
              />
            </div>
            <div className="min-w-0 space-y-2 sm:col-span-2 xl:col-span-2">
              <span className="block text-xs font-medium text-[var(--text-secondary)]">Зарплата, ₽</span>
              <div className="flex gap-2">
                <input
                  id="filter-salary-from"
                  type="number"
                  inputMode="numeric"
                  className="glass-input input-no-spinner min-h-[48px] min-w-0 flex-1 px-4 py-3 text-sm outline-none ring-[var(--brand-orange)] focus:ring-2"
                  placeholder="От"
                  value={salaryFrom}
                  onChange={(e) => setSalaryFrom(e.target.value)}
                />
                <input
                  id="filter-salary-to"
                  type="number"
                  inputMode="numeric"
                  className="glass-input input-no-spinner min-h-[48px] min-w-0 flex-1 px-4 py-3 text-sm outline-none ring-[var(--brand-orange)] focus:ring-2"
                  placeholder="До"
                  value={salaryTo}
                  onChange={(e) => setSalaryTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="order-2 text-xs text-[var(--text-secondary)] sm:order-1">
              Найдено: {filtered.length} из {opportunities.length}
              {!apiLoaded && " · загрузка..."}
              {apiError && " · не удалось загрузить возможности"}
            </p>
            <div className="order-1 flex w-full shrink-0 gap-1 rounded-2xl border border-[var(--glass-border)] p-1 sm:order-2 sm:w-auto sm:min-w-[220px]">
              <button
                type="button"
                onClick={() => setView("map")}
                className={cn(
                  "min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4",
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
                  "min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:px-4",
                  view === "list"
                    ? "bg-[var(--glass-bg-strong)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]",
                )}
              >
                Лента
              </button>
            </div>
          </div>
        </div>
      </GlassPanel>

      {view === "map" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel relative z-0 isolate overflow-hidden p-1 sm:p-2"
        >
          <YandexMap
            opportunities={filtered}
            favoriteIds={user ? favoriteIds : []}
            onMarkerClick={(id) => setPopupId(id)}
            className="h-[min(48dvh,420px)] w-full rounded-xl sm:h-[min(58dvh,520px)] md:h-[min(62vh,560px)]"
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
                <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-5">
                  {favoriteOpps.map((opp: Opportunity) => (
                    <div key={opp.id} className="h-full">
                      <OpportunityCard
                        opp={opp}
                        favorite
                        onToggleFavorite={
                          user && user.role !== "curator" ? () => handleToggleFavorite(opp.id) : undefined
                        }
                        onRecommend={user?.role === "applicant" ? opp.id : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Общий список */}
          <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2 min-[700px]:gap-5">
            {filtered.map((opp: Opportunity) => (
              <div key={opp.id} className="h-full">
                <OpportunityCard
                  opp={opp}
                  favorite={!!user && has(opp.id)}
                  onToggleFavorite={
                    user && user.role !== "curator" ? () => handleToggleFavorite(opp.id) : undefined
                  }
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
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-10 min-[500px]:items-center min-[500px]:p-4"
          role="dialog"
          aria-modal
          onClick={() => setPopupId(null)}
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[min(88dvh,36rem)] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--page-bg)_92%,transparent)] p-3 shadow-2xl backdrop-blur-2xl min-[500px]:max-h-[90vh] min-[500px]:p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Карточка возможности</p>
              <button
                type="button"
                onClick={() => setPopupId(null)}
                className="min-h-[40px] rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--glass-bg-strong)]"
              >
                Закрыть
              </button>
            </div>

            <OpportunityCard
              opp={popupOpp}
              compact
              favorite={!!user && has(popupOpp.id)}
              onToggleFavorite={
                user && user.role !== "curator" ? () => handleToggleFavorite(popupOpp.id) : undefined
              }
              onRecommend={user?.role === "applicant" ? popupOpp.id : undefined}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { fetchEmployerOpportunityById, fetchEmployerOpportunities } from "@/lib/api";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";
import { moderationStatusBadge } from "@/lib/status-badges";
import {
  employerModerationFilterOptions,
  employerModerationBadgeKey,
  employerModerationLabel,
  employerOppMatchesModFilter,
} from "@/lib/employer-opportunity-status";
import { filterResetButtonClass, navLinkButtonClass } from "@/lib/nav-link-styles";

const YandexMap = dynamic(
  () => import("@/components/map/YandexMap").then((m) => m.YandexMap),
  { ssr: false, loading: () => <GlassPanel className="h-64 animate-pulse" /> },
);

const typeLabels: Record<Opportunity["type"], string> = {
  internship: "Стажировка",
  vacancy_junior: "Вакансия (Junior)",
  vacancy_senior: "Вакансия (Middle+)",
  mentorship: "Менторская программа",
  event: "Мероприятие",
};

const formatLabels: Record<Opportunity["workFormat"], string> = {
  office: "Офис",
  hybrid: "Гибрид",
  remote: "Удалённо",
};

export default function EmployerOpportunityViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [opp, setOpp] = useState<Opportunity | null | undefined>(undefined);
  const [allOpps, setAllOpps] = useState<Opportunity[]>([]);
  const [filterQ, setFilterQ] = useState("");
  const [filterMod, setFilterMod] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
      return;
    }
    fetchEmployerOpportunities()
      .then(setAllOpps)
      .catch(() => setAllOpps([]));
  }, [user, router]);

  useEffect(() => {
    if (!user || user.role !== "employer") {
      return;
    }
    if (!params.id) return;
    const ac = new AbortController();
    fetchEmployerOpportunityById(params.id, ac.signal)
      .then((o) => setOpp(o))
      .catch(() => setOpp(null));
    return () => ac.abort();
  }, [user, router, params.id]);

  const typeFilterOptions = useMemo(
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

  const filteredNav = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    return allOpps.filter((o) => {
      if (!employerOppMatchesModFilter(o, filterMod)) return false;
      if (filterType && o.type !== filterType) return false;
      if (q) {
        const hay = `${o.title} ${o.shortDescription}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allOpps, filterQ, filterMod, filterType]);

  const navSelectOptions = useMemo(() => {
    if (!opp) return [];
    const rows = filteredNav.map((o) => ({ value: o.id, label: o.title }));
    if (!rows.some((r) => r.value === opp.id)) {
      return [{ value: opp.id, label: `${opp.title} (текущая)` }, ...rows];
    }
    return rows;
  }, [filteredNav, opp]);

  if (opp === undefined) {
    return (
      <GlassPanel className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
      </GlassPanel>
    );
  }

  if (!opp) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-[var(--text-primary)]">Карточка не найдена или у вас нет к ней доступа.</p>
        <Link href="/employer/opportunities" className={`${navLinkButtonClass} mt-4 inline-flex`}>
          ← Мои карточки
        </Link>
      </GlassPanel>
    );
  }

  const badgeClass = moderationStatusBadge[employerModerationBadgeKey(opp)];
  const modLabel = employerModerationLabel(opp);
  const publishedOnSite = opp.moderationStatus === "approved";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/employer/opportunities" className={navLinkButtonClass}>
          ← Мои карточки
        </Link>
        {publishedOnSite && (
          <Link
            href={`/opportunities/${opp.id}`}
            className={navLinkButtonClass}
            target="_blank"
            rel="noreferrer"
          >
            Как на сайте ↗
          </Link>
        )}
        <Link href={`/employer/opportunities/${opp.id}/edit`} className={navLinkButtonClass}>
          Редактировать
        </Link>
      </div>

      {opp.revisionModerationStatus === "pending" && (
        <GlassPanel className="border border-violet-500/35 bg-[color-mix(in_srgb,var(--brand-magenta)_8%,var(--glass-bg-strong))] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Правка на модерации</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Куратор проверяет изменения. Для соискателей на сайте пока отображается предыдущая опубликованная версия.
          </p>
        </GlassPanel>
      )}
      {opp.revisionModerationStatus === "rejected" && (
        <GlassPanel className="border border-rose-500/35 bg-[color-mix(in_srgb,var(--brand-orange)_10%,var(--glass-bg-strong))] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Правка отклонена</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            На сайте по-прежнему показывается последняя одобренная версия. Отредактируйте карточку и отправьте снова.
          </p>
        </GlassPanel>
      )}

      {allOpps.length > 1 && (
        <GlassPanel className="relative z-20 space-y-4 p-4 sm:p-5">
          <p className="text-sm font-medium text-[var(--text-primary)]">Мои карточки: фильтр и переход</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="emp-view-q">
                Поиск
              </label>
              <input
                id="emp-view-q"
                className="glass-input w-full px-4 py-3 text-sm"
                placeholder="Название или описание…"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="emp-view-mod">
                Модерация
              </label>
              <GlassSelect
                id="emp-view-mod"
                value={filterMod}
                onChange={setFilterMod}
                options={employerModerationFilterOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="emp-view-type">
                Тип
              </label>
              <GlassSelect
                id="emp-view-type"
                value={filterType}
                onChange={setFilterType}
                options={typeFilterOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="emp-view-jump">
                Открыть карточку
              </label>
              <GlassSelect
                id="emp-view-jump"
                value={opp.id}
                onChange={(id) => {
                  if (id && id !== opp.id) router.push(`/employer/opportunities/${id}`);
                }}
                options={navSelectOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm"
              />
            </div>
          </div>
          {filteredNav.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Нет карточек по фильтру — сбросьте фильтры или вернитесь к списку.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterQ("");
                  setFilterMod("");
                  setFilterType("");
                }}
                className={filterResetButtonClass}
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </GlassPanel>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <GlassPanel className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", badgeClass)}>{modLabel}</span>
              <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">{opp.title}</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{opp.companyName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                {typeLabels[opp.type]}
              </span>
              <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                {formatLabels[opp.workFormat]}
              </span>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{opp.shortDescription}</p>
          <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
            <span>{opp.locationLabel}</span>
            {opp.type === "event" && opp.eventDate && opp.validUntil && (
              <span>
                Проведение: с {new Date(opp.eventDate).toLocaleDateString("ru-RU")} по{" "}
                {new Date(opp.validUntil).toLocaleDateString("ru-RU")}
              </span>
            )}
            {opp.type !== "event" && opp.validUntil && (
              <span>Действительно до: {new Date(opp.validUntil).toLocaleDateString("ru-RU")}</span>
            )}
            {opp.type === "event" && opp.eventDate && !opp.validUntil && (
              <span>Начало: {new Date(opp.eventDate).toLocaleString("ru-RU")}</span>
            )}
          </div>
          {opp.salaryMin != null && opp.salaryMax != null && (
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {opp.salaryMin.toLocaleString("ru-RU")} – {opp.salaryMax.toLocaleString("ru-RU")} {opp.currency}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {opp.tags.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-2 py-0.5 text-xs text-[var(--text-primary)]"
              >
                {t}
              </span>
            ))}
          </div>
          <Link
            href={`/employer/applications?opp=${opp.id}`}
            className="inline-flex rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)]"
          >
            Отклики на эту карточку
          </Link>
        </GlassPanel>
      </motion.div>

      <GlassPanel className="relative z-0 isolate overflow-hidden p-1">
        <YandexMap opportunities={[opp]} favoriteIds={[]} />
      </GlassPanel>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { fetchEmployerOpportunities, deleteEmployerOpportunity } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";
import { moderationStatusBadge } from "@/lib/status-badges";
import {
  employerModerationFilterOptions,
  employerModerationBadgeKey,
  employerModerationLabel,
  employerOppMatchesModFilter,
} from "@/lib/employer-opportunity-status";
import { filterResetButtonClass } from "@/lib/nav-link-styles";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Location01Icon, Briefcase01Icon, Calendar01Icon } from "@hugeicons/core-free-icons";

export default function EmployerOpportunitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterQ, setFilterQ] = useState("");
  const [filterMod, setFilterMod] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
      return;
    }
    loadOpportunities();
  }, [user, router]);

  const loadOpportunities = async () => {
    try {
      const data = await fetchEmployerOpportunities();
      setOpportunities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, string> = {
    internship: "Стажировка",
    vacancy_junior: "Вакансия Junior",
    vacancy_senior: "Вакансия Middle+",
    mentorship: "Менторство",
    event: "Мероприятие",
  };

  const formatLabels: Record<string, string> = {
    office: "Офис",
    hybrid: "Гибрид",
    remote: "Удалённо",
  };

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

  const displayed = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    return opportunities.filter((opp) => {
      if (!employerOppMatchesModFilter(opp, filterMod)) return false;
      if (filterType && opp.type !== filterType) return false;
      if (q) {
        const hay = `${opp.title} ${opp.shortDescription}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [opportunities, filterQ, filterMod, filterType]);

  const eventDatesLine = (opp: Opportunity) => {
    if (opp.eventDate && opp.validUntil) {
      return `${new Date(opp.eventDate).toLocaleDateString("ru-RU")} — ${new Date(opp.validUntil).toLocaleDateString("ru-RU")}`;
    }
    if (opp.eventDate) return new Date(opp.eventDate).toLocaleDateString("ru-RU");
    if (opp.validUntil) return new Date(opp.validUntil).toLocaleDateString("ru-RU");
    return "Даты уточняются";
  };

  const handleDelete = async (opp: Opportunity) => {
    if (!window.confirm(`Удалить карточку «${opp.title}»? Это действие нельзя отменить.`)) return;
    setDeletingId(opp.id);
    try {
      await deleteEmployerOpportunity(opp.id);
      setOpportunities((prev) => prev.filter((o) => o.id !== opp.id));
      showToast("Карточка удалена", "success");
    } catch {
      showToast("Не удалось удалить карточку", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Мои карточки</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Управление возможностями</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/employer/company"
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Компания
          </Link>
          <Link
            href="/employer/opportunities/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
            Создать
          </Link>
        </div>
      </div>

      {!loading && opportunities.length > 0 && (
        <GlassPanel className="space-y-4 p-4 sm:p-5">
          <p className="text-sm font-medium text-[var(--text-primary)]">Фильтры</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="emp-opp-q">
                Поиск
              </label>
              <input
                id="emp-opp-q"
                className="glass-input w-full px-4 py-3 text-sm"
                placeholder="Название или описание…"
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="emp-opp-mod">
                Модерация
              </label>
              <GlassSelect
                id="emp-opp-mod"
                value={filterMod}
                onChange={setFilterMod}
                options={employerModerationFilterOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="emp-opp-type">
                Тип
              </label>
              <GlassSelect
                id="emp-opp-type"
                value={filterType}
                onChange={setFilterType}
                options={typeFilterOptions}
                className="w-full"
                buttonClassName="px-4 py-3 text-sm"
              />
            </div>
            <div className="flex items-end">
              <p className="pb-3 text-xs text-[var(--text-secondary)]">
                Показано: {displayed.length} из {opportunities.length}
              </p>
            </div>
          </div>
        </GlassPanel>
      )}

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : opportunities.length === 0 ? (
        <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <HugeiconsIcon icon={Briefcase01Icon} size={48} className="text-[var(--text-secondary)]" />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Нет карточек</p>
            <p className="text-sm text-[var(--text-secondary)]">Создайте первую карточку возможности</p>
          </div>
          <Link
            href="/employer/opportunities/new"
            className="rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)]"
          >
            Создать карточку
          </Link>
        </GlassPanel>
      ) : displayed.length === 0 ? (
        <GlassPanel className="flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-[var(--text-primary)]">Нет карточек по выбранным фильтрам</p>
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
        </GlassPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((opp, idx) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassPanel className="group relative min-w-0 overflow-hidden p-5 transition hover:border-[var(--brand-cyan)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="card-meta-chip inline-block rounded-full bg-[var(--glass-bg-strong)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                        {typeLabels[opp.type] || opp.type}
                      </span>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                          moderationStatusBadge[employerModerationBadgeKey(opp)],
                        )}
                      >
                        {employerModerationLabel(opp)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-cyan)] transition">
                      {opp.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                      {opp.shortDescription}
                    </p>
                  </div>
                  {opp.mediaUrl && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                      <img src={opp.mediaUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Location01Icon} size={12} />
                    {formatLabels[opp.workFormat] || opp.workFormat}
                  </span>
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Calendar01Icon} size={12} />
                    {opp.publishedAt ? new Date(opp.publishedAt).toLocaleDateString("ru-RU") : "Новая"}
                  </span>
                  {opp.type === "event" ? (
                    <span className="font-medium text-[var(--text-primary)]">Проведение: {eventDatesLine(opp)}</span>
                  ) : (
                    opp.salaryMin != null &&
                    opp.salaryMax != null && (
                      <span className="text-[var(--brand-orange)]">
                        {opp.salaryMin.toLocaleString("ru-RU")} – {opp.salaryMax.toLocaleString("ru-RU")} ₽
                      </span>
                    )
                  )}
                </div>

                <div className="mt-4 flex min-w-0 flex-nowrap items-stretch gap-1">
                  <Link
                    href={`/employer/opportunities/${opp.id}`}
                    title="Просмотр"
                    className="flex h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg bg-[var(--glass-bg-strong)] px-1 text-center text-[10px] font-medium leading-tight text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)] sm:px-1.5 sm:text-xs"
                  >
                    <span className="min-w-0 truncate">Просмотр</span>
                  </Link>
                  {opp.moderationStatus === "approved" && (
                    <Link
                      href={`/opportunities/${opp.id}`}
                      title="Как выглядит на сайте"
                      className="flex h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg bg-[var(--glass-bg-strong)] px-1 text-center text-[10px] font-medium leading-tight text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)] sm:px-1.5 sm:text-xs"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="min-w-0 truncate">Сайт ↗</span>
                    </Link>
                  )}
                  <Link
                    href={`/employer/applications?opp=${opp.id}`}
                    title="Отклики"
                    className="flex h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg bg-[var(--glass-bg-strong)] px-1 text-center text-[10px] font-medium leading-tight text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)] sm:px-1.5 sm:text-xs"
                  >
                    <span className="min-w-0 truncate">Отклики</span>
                  </Link>
                  <Link
                    href={`/employer/opportunities/${opp.id}/edit`}
                    title="Редактировать"
                    className="flex h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-1 text-center text-[10px] font-medium leading-tight text-[var(--text-primary)] transition hover:bg-[var(--glass-bg-strong)] sm:px-1.5 sm:text-xs"
                  >
                    <span className="min-w-0 truncate">Правка</span>
                  </Link>
                  <button
                    type="button"
                    title="Удалить карточку"
                    disabled={deletingId === opp.id}
                    onClick={() => void handleDelete(opp)}
                    className="btn-danger-soft flex h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg px-1 text-center text-[10px] font-semibold leading-tight transition disabled:opacity-50 sm:px-1.5 sm:text-xs"
                  >
                    <span className="min-w-0 truncate">{deletingId === opp.id ? "…" : "Удалить"}</span>
                  </button>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

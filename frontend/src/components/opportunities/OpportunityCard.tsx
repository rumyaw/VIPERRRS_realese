"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ShareMenu } from "@/components/opportunities/ShareMenu";
import { cardActionPrimary, cardActionSecondary } from "@/lib/card-actions";

const typeLabels: Record<Opportunity["type"], string> = {
  internship: "Стажировка",
  vacancy_junior: "Вакансия (Junior)",
  vacancy_senior: "Вакансия (Middle+)",
  mentorship: "Менторство",
  event: "Мероприятие",
};

const formatLabels: Record<Opportunity["workFormat"], string> = {
  office: "Офис",
  hybrid: "Гибрид",
  remote: "Удалённо",
};

export function OpportunityCard({
  opp,
  favorite,
  onToggleFavorite,
  compact,
  onRecommend,
}: {
  opp: Opportunity;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
  onRecommend?: string;
}) {
  const isEvent = opp.type === "event";

  const eventDatesText = (() => {
    if (!isEvent) return "";
    if (opp.eventDate && opp.validUntil) {
      return `Проведение: ${new Date(opp.eventDate).toLocaleDateString("ru-RU")} — ${new Date(opp.validUntil).toLocaleDateString("ru-RU")}`;
    }
    if (opp.eventDate) return `Дата: ${new Date(opp.eventDate).toLocaleString("ru-RU")}`;
    if (opp.validUntil) return `До: ${new Date(opp.validUntil).toLocaleDateString("ru-RU")}`;
    return "Даты уточняются";
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="h-full"
    >
      <GlassPanel
        className={cn(
          "group relative flex h-full flex-col overflow-hidden p-4 transition-shadow hover:shadow-lg sm:p-5",
          favorite && "ring-1 ring-[color-mix(in_srgb,var(--brand-orange)_55%,transparent)]",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-magenta)]">
              {opp.companyName}
            </p>
            <h3 className="mt-1 text-base font-semibold text-[var(--text-primary)] sm:text-lg">{opp.title}</h3>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              {typeLabels[opp.type]}
            </span>
            <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              {formatLabels[opp.workFormat]}
            </span>
          </div>
        </div>
        <p
          className={cn(
            "mt-3 flex-grow text-sm text-[var(--text-secondary)]",
            compact ? "line-clamp-2" : "line-clamp-3",
          )}
        >
          {opp.shortDescription}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
          {opp.tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-lg border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-2 py-0.5 text-xs text-[var(--text-primary)]"
            >
              {t}
            </span>
          ))}
        </div>
        {isEvent ? (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-t border-[var(--glass-border)] pt-3 text-sm text-[var(--text-secondary)] sm:mt-4 sm:pt-4">
            <span className="min-w-0 flex-1 break-words">{opp.locationLabel}</span>
            <span className="shrink-0 text-right font-medium text-[var(--text-primary)]">{eventDatesText}</span>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-t border-[var(--glass-border)] pt-3 text-sm text-[var(--text-secondary)] sm:mt-4 sm:pt-4">
            <span className="min-w-0 flex-1 break-words">{opp.locationLabel}</span>
            {opp.salaryMin != null && opp.salaryMax != null ? (
              <span className="shrink-0 font-medium text-[var(--text-primary)]">
                {opp.salaryMin.toLocaleString("ru-RU")}–{opp.salaryMax.toLocaleString("ru-RU")} {opp.currency}
              </span>
            ) : (
              <span className="shrink-0 text-[var(--text-secondary)]">Зарплата не указана</span>
            )}
          </div>
        )}

        <div className="mt-auto grid grid-cols-1 gap-2 pt-3 min-[400px]:grid-cols-2 sm:pt-4">
          <Link href={`/opportunities/${opp.id}`} className={cardActionPrimary}>
            Открыть карточку
          </Link>
          {onToggleFavorite ? (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(cardActionSecondary, favorite && "border-[color-mix(in_srgb,var(--brand-orange)_45%,var(--glass-border))] text-[var(--brand-orange)]")}
            >
              {favorite ? "★ В избранном" : "☆ В избранное"}
            </button>
          ) : null}
          {onRecommend ? (
            <div className="flex w-full min-[400px]:col-span-2">
              <ShareMenu opportunityId={onRecommend} shareButtonClassName="w-full min-h-[44px] justify-center" />
            </div>
          ) : null}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

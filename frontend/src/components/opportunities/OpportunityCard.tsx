"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";
import { ShareMenu } from "@/components/opportunities/ShareMenu";

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
          "group relative flex h-full flex-col overflow-hidden p-5 transition-shadow hover:shadow-lg",
          favorite && "ring-1 ring-[color-mix(in_srgb,var(--brand-orange)_55%,transparent)]",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-magenta)]">
              {opp.companyName}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{opp.title}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--glass-bg-strong)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              {typeLabels[opp.type]}
            </span>
            <span className="rounded-full bg-[var(--glass-bg-strong)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              {formatLabels[opp.workFormat]}
            </span>
          </div>
        </div>
        <p className="mt-3 line-clamp-3 flex-grow text-sm text-[var(--text-secondary)]">
          {opp.shortDescription}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {opp.tags.slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-lg border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-2 py-0.5 text-xs text-[var(--text-primary)]"
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--glass-border)] pt-4 text-sm text-[var(--text-secondary)]">
          <span>{opp.locationLabel}</span>
          {opp.salaryMin != null && opp.salaryMax != null ? (
            <span className="font-medium text-[var(--text-primary)]">
              {opp.salaryMin.toLocaleString("ru-RU")}–{opp.salaryMax.toLocaleString("ru-RU")}{" "}
              {opp.currency}
            </span>
          ) : (
            <span>Компенсация не указана</span>
          )}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link
            href={`/opportunities/${opp.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-md transition hover:opacity-95 min-[420px]:flex-none"
          >
            Открыть карточку
          </Link>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(
                "glass-panel rounded-xl px-4 py-2.5 text-sm font-medium transition",
                favorite && "text-[var(--brand-orange)]",
              )}
            >
              {favorite ? "★ В избранном" : "☆ В избранное"}
            </button>
          )}
          {onRecommend && <ShareMenu opportunityId={onRecommend} />}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchEmployerOpportunityById } from "@/lib/api";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";
import { moderationStatusBadge } from "@/lib/status-badges";

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

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
      return;
    }
    if (!params.id) return;
    const ac = new AbortController();
    fetchEmployerOpportunityById(params.id, ac.signal)
      .then((o) => setOpp(o))
      .catch(() => setOpp(null));
    return () => ac.abort();
  }, [user, router, params.id]);

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
        <Link href="/employer/opportunities" className="mt-4 inline-block text-[var(--brand-cyan)] hover:underline">
          ← Мои карточки
        </Link>
      </GlassPanel>
    );
  }

  const st = opp.moderationStatus ?? "pending";
  const badgeClass =
    moderationStatusBadge[st as keyof typeof moderationStatusBadge] ?? moderationStatusBadge.pending;
  const modLabel =
    st === "approved" ? "Опубликовано" : st === "rejected" ? "Отклонено" : "На модерации";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/employer/opportunities" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ← Мои карточки
        </Link>
        {st === "approved" && (
          <Link
            href={`/opportunities/${opp.id}`}
            className="text-sm text-[var(--brand-cyan)] hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Как видят соискатели ↗
          </Link>
        )}
      </div>

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

      <GlassPanel className="overflow-hidden p-1">
        <YandexMap opportunities={[opp]} favoriteIds={[]} />
      </GlassPanel>
    </div>
  );
}

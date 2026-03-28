"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { OpportunityBackNav } from "./OpportunityBackNav";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useFavorites } from "@/hooks/use-favorites";
import { buildResumeSnapshot } from "@/lib/resume-snapshot";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";
import { fetchOpportunityById, createApplicantApplication, fetchApplicantApplications } from "@/lib/api";
import { addServerFavorite, removeServerFavorite } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { ShareMenu } from "@/components/opportunities/ShareMenu";
import { cardActionPrimary, cardActionSecondary } from "@/lib/card-actions";

const YandexMap = dynamic(
  () => import("@/components/map/YandexMap").then((m) => m.YandexMap),
  { ssr: false, loading: () => <GlassPanel className="h-64 animate-pulse" /> },
);

const typeLabels: Record<Opportunity["type"], string> = {
  internship: "Стажировка",
  vacancy_junior: "Вакансия (Junior)",
  vacancy_senior: "Вакансия (Middle+)",
  mentorship: "Менторская программа",
  event: "Карьерное мероприятие",
};

const formatLabels: Record<Opportunity["workFormat"], string> = {
  office: "Офис",
  hybrid: "Гибрид",
  remote: "Удалённо",
};

const employmentLabels: Record<Opportunity["employment"], string> = {
  full: "Полная занятость",
  part: "Частичная",
  project: "Проектная",
};

export default function OpportunityPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { favoriteIds, toggle, has } = useFavorites();
  const { showToast } = useToast();
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTick, setApplyTick] = useState(0);
  const [apiOpp, setApiOpp] = useState<Opportunity | null | undefined>(undefined);

  useEffect(() => {
    if (!params.id) return;
    const abort = new AbortController();
    fetchOpportunityById(params.id, abort.signal)
      .then((item) => setApiOpp(item))
      .catch(() => setApiOpp(null));
    return () => abort.abort();
  }, [params.id]);

  const opp = apiOpp ?? null;

  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.role === "applicant") {
      fetchApplicantApplications()
        .then((apps) => {
          const ids = new Set(apps.map((a: Record<string, unknown>) => String(a.opportunityId)));
          setAppliedIds(ids);
        })
        .catch(() => {});
    }
  }, [user, applyTick]);

  const alreadyApplied = opp ? appliedIds.has(opp.id) : false;

  if (!opp) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-[var(--text-primary)]">Возможность не найдена.</p>
        <Link href="/" className="mt-4 inline-block text-[var(--brand-cyan)] hover:underline">
          На главную
        </Link>
      </GlassPanel>
    );
  }

  function submitApplication() {
    if (!opp || !user || user.role !== "applicant" || !user.applicant) return;
    const snapshot = buildResumeSnapshot(user.applicant);
    void createApplicantApplication(opp.id, snapshot)
      .then(() => {
        setApplyOpen(false);
        setApplyTick((t) => t + 1);
        showToast("Отклик успешно отправлен", "success");
      })
      .catch(() => {
        showToast("Не удалось выполнить операцию", "error");
      });
  }

  return (
    <div className="space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:space-y-6">
      <Suspense
        fallback={
          <div className="text-sm text-[var(--text-secondary)]">
            <Link href="/">← Назад к поиску</Link>
          </div>
        }
      >
        <OpportunityBackNav />
      </Suspense>

      <div className="grid gap-4 min-[700px]:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassPanel className="overflow-visible p-0">
          {opp.mediaUrl && (
            <div
              className="h-44 w-full overflow-hidden rounded-t-[1.2rem] bg-cover bg-center min-[375px]:h-52 sm:h-64 md:h-72"
              style={{ backgroundImage: `url(${opp.mediaUrl})` }}
            />
          )}
          <div className="space-y-4 p-4 min-[400px]:p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {typeLabels[opp.type]}
              </span>
              <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {formatLabels[opp.workFormat]}
              </span>
              <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {employmentLabels[opp.employment]}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] min-[400px]:text-2xl sm:text-3xl">
              {opp.title}
            </h1>
            <Link
              href={`/employer/profile/${opp.companyId}`}
              className="text-lg text-[var(--brand-magenta)] hover:underline"
            >
              {opp.companyName}
            </Link>
            <div className="prose prose-neutral max-w-none text-[var(--text-secondary)] dark:prose-invert">
              <p className="whitespace-pre-wrap">{opp.fullDescription}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {opp.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-lg border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-2.5 py-1 text-sm"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="grid gap-3 border-t border-[var(--glass-border)] pt-6 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-[var(--text-secondary)]">Место</p>
                <p className="mt-1 text-[var(--text-primary)]">{opp.locationLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-secondary)]">Публикация</p>
                <p className="mt-1 text-[var(--text-primary)]">{opp.publishedAt}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-secondary)]">
                  {opp.type === "event" ? "Даты мероприятия" : "Срок / дата"}
                </p>
                <p className="mt-1 text-[var(--text-primary)]">
                  {opp.type === "event" && opp.eventDate && opp.validUntil
                    ? `с ${new Date(opp.eventDate).toLocaleDateString("ru-RU")} по ${new Date(opp.validUntil).toLocaleDateString("ru-RU")}`
                    : opp.type === "event" && opp.eventDate
                      ? new Date(opp.eventDate).toLocaleString("ru-RU")
                      : opp.validUntil
                        ? new Date(opp.validUntil).toLocaleDateString("ru-RU")
                        : opp.eventDate
                          ? new Date(opp.eventDate).toLocaleString("ru-RU")
                          : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-secondary)]">Заработная плата</p>
                <p className="mt-1 text-[var(--text-primary)]">
                  {opp.salaryMin != null && opp.salaryMax != null
                    ? `${opp.salaryMin.toLocaleString("ru-RU")}–${opp.salaryMax.toLocaleString("ru-RU")} ${opp.currency}`
                    : "По договорённости"}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--glass-border)] pt-6">
              <p className="text-xs uppercase text-[var(--text-secondary)]">Контакты и ресурсы</p>
              <ul className="mt-3 space-y-2 text-sm">
                {opp.contacts.email && (
                  <li>
                    Email:{" "}
                    <a className="text-[var(--brand-cyan)] hover:underline" href={`mailto:${opp.contacts.email}`}>
                      {opp.contacts.email}
                    </a>
                  </li>
                )}
                {opp.contacts.phone && <li>Телефон: {opp.contacts.phone}</li>}
                {opp.contacts.website && (
                  <li>
                    Сайт:{" "}
                    <a
                      className="text-[var(--brand-cyan)] hover:underline"
                      href={opp.contacts.website}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {opp.contacts.website}
                    </a>
                  </li>
                )}
                {opp.contacts.telegram && <li>Telegram: {opp.contacts.telegram}</li>}
              </ul>
            </div>

            <div className="flex flex-col gap-2 border-t border-[var(--glass-border)] pt-6">
              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      showToast("Войдите или зарегистрируйтесь, чтобы добавить в избранное", "info");
                      return;
                    }
                    toggle(opp.id);
                    if (user.role === "applicant") {
                      if (has(opp.id)) {
                        removeServerFavorite(opp.id).catch(() => {});
                      } else {
                        addServerFavorite(opp.id).catch(() => {});
                      }
                    }
                  }}
                  className={cn(
                    cardActionSecondary,
                    "font-semibold",
                    has(opp.id) && "border-[color-mix(in_srgb,var(--brand-orange)_45%,var(--glass-border))] text-[var(--brand-orange)]",
                  )}
                >
                  {has(opp.id) ? "★ В избранном" : "☆ Добавить в избранное"}
                </button>
                {!user ? (
                  <Link href="/login" className={cardActionPrimary}>
                    Войти, чтобы откликнуться
                  </Link>
                ) : null}
                {user?.role === "applicant" && !alreadyApplied ? (
                  <button type="button" onClick={() => setApplyOpen(true)} className={cardActionPrimary}>
                    Откликнуться с резюме
                  </button>
                ) : null}
              </div>
              {user?.role === "applicant" && alreadyApplied ? (
                <span
                  className={cn(
                    cardActionSecondary,
                    "flex min-h-[44px] items-center justify-center border-emerald-600/35 bg-emerald-50 text-center text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200",
                  )}
                >
                  Отклик уже отправлен
                </span>
              ) : null}
              <ShareMenu
                opportunityId={opp.id}
                showContactsRecommendation={user?.role === "applicant"}
                shareButtonClassName="w-full min-h-[44px] justify-center"
              />
            </div>
          </div>
        </GlassPanel>

        <div className="min-w-0 space-y-4">
          <GlassPanel className="overflow-hidden p-0.5 sm:p-1">
            <YandexMap
              opportunities={[opp]}
              favoriteIds={favoriteIds}
              className="h-[min(50dvh,380px)] w-full rounded-xl sm:h-[min(55vh,480px)] lg:rounded-2xl"
            />
          </GlassPanel>
        </div>
      </div>

      {applyOpen && user?.role === "applicant" && user.applicant && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 backdrop-blur-sm min-[500px]:items-center min-[500px]:p-4"
          role="dialog"
          aria-modal
          onClick={() => setApplyOpen(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[min(85dvh,32rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--glass-border)] bg-[var(--page-bg)] p-4 shadow-2xl min-[500px]:max-h-[85vh] min-[500px]:p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Отправка отклика</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Работодатель получит ваше резюме (снимок полей из профиля) и сможет изменить статус
              отклика в кабинете.
            </p>
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
              {buildResumeSnapshot(user.applicant)}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
              <button type="button" onClick={submitApplication} className={cn(cardActionPrimary, "w-full")}>
                Отправить
              </button>
              <button type="button" onClick={() => setApplyOpen(false)} className={cn(cardActionSecondary, "w-full")}>
                Отмена
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

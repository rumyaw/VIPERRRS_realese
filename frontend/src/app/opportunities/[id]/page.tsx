"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useFavorites } from "@/hooks/use-favorites";
import {
  addStoredApplication,
  hasApplied,
} from "@/lib/applications-storage";
import { MOCK_APPLICATIONS, MOCK_OPPORTUNITIES } from "@/lib/mock-data";
import { buildResumeSnapshot } from "@/lib/resume-snapshot";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";

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
  const [recText, setRecText] = useState("");
  const [recSent, setRecSent] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTick, setApplyTick] = useState(0);

  const opp = useMemo(
    () => MOCK_OPPORTUNITIES.find((o) => o.id === params.id),
    [params.id],
  );

  const canRecommend = user?.role === "applicant";

  const alreadyApplied = useMemo(() => {
    void applyTick;
    if (!opp || !user || user.role !== "applicant") return false;
    const inMock = MOCK_APPLICATIONS.some(
      (a) => a.applicantId === user.id && a.opportunityId === opp.id,
    );
    return inMock || hasApplied(user.id, opp.id);
  }, [user, opp, applyTick]);

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
    addStoredApplication({
      id: `app-${Date.now()}`,
      opportunityId: opp.id,
      applicantId: user.id,
      status: "pending",
      createdAt: new Date().toISOString(),
      resumeSnapshot: snapshot,
    });
    setApplyOpen(false);
    setApplyTick((t) => t + 1);
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ← Назад к поиску
        </Link>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassPanel className="overflow-hidden p-0">
          {opp.mediaUrl && (
            <div
              className="h-56 w-full bg-cover bg-center sm:h-72"
              style={{ backgroundImage: `url(${opp.mediaUrl})` }}
            />
          )}
          <div className="space-y-4 p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {typeLabels[opp.type]}
              </span>
              <span className="rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {formatLabels[opp.workFormat]}
              </span>
              <span className="rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {employmentLabels[opp.employment]}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{opp.title}</h1>
            <p className="text-lg text-[var(--brand-magenta)]">{opp.companyName}</p>
            <div className="prose prose-invert max-w-none text-[var(--text-secondary)]">
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
                <p className="text-xs uppercase text-[var(--text-secondary)]">Срок / дата</p>
                <p className="mt-1 text-[var(--text-primary)]">
                  {opp.eventDate
                    ? new Date(opp.eventDate).toLocaleString("ru-RU")
                    : opp.validUntil ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-[var(--text-secondary)]">Компенсация</p>
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

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => toggle(opp.id)}
                className={cn(
                  "glass-panel rounded-xl px-5 py-3 text-sm font-semibold",
                  has(opp.id) && "text-[var(--brand-orange)]",
                )}
              >
                {has(opp.id) ? "★ В избранном" : "☆ Добавить в избранное"}
              </button>
              {!user && (
                <Link
                  href="/login"
                  className="rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-3 text-sm font-semibold text-white shadow-lg"
                >
                  Войти, чтобы откликнуться
                </Link>
              )}
              {user?.role === "applicant" && (
                <>
                  {alreadyApplied ? (
                    <span className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-200">
                      Отклик отправлен · резюме у работодателя
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setApplyOpen(true)}
                      className="rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                    >
                      Откликнуться с резюме
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </GlassPanel>

        <div className="space-y-6">
          <GlassPanel className="overflow-hidden p-1">
            <YandexMap opportunities={[opp]} favoriteIds={favoriteIds} />
          </GlassPanel>

          {canRecommend && (
            <GlassPanel className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Рекомендация контакту
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Соискатели могут отправить вакансию в рекомендации профессиональному контакту (в
                бэкенде — уведомление и запись в ленте рекомендаций).
              </p>
              <textarea
                className="glass-input mt-4 min-h-[88px] w-full px-4 py-3 text-sm outline-none"
                placeholder="Короткое сообщение для контакта…"
                value={recText}
                onChange={(e) => setRecText(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  setRecSent(true);
                  setRecText("");
                }}
                className="mt-3 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)]"
              >
                {recSent ? "Отправлено (демо)" : "Отправить рекомендацию"}
              </button>
            </GlassPanel>
          )}
        </div>
      </div>

      {applyOpen && user?.role === "applicant" && user.applicant && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => setApplyOpen(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-strong max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
          >
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Отправка отклика</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Работодатель получит ваше резюме (снимок полей из профиля) и сможет изменить статус
              отклика в кабинете.
            </p>
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
              {buildResumeSnapshot(user.applicant)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={submitApplication}
                className="flex-1 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] py-3 text-sm font-semibold text-white"
              >
                Отправить
              </button>
              <button
                type="button"
                onClick={() => setApplyOpen(false)}
                className="rounded-xl border border-[var(--glass-border)] px-4 py-3 text-sm text-[var(--text-primary)]"
              >
                Отмена
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

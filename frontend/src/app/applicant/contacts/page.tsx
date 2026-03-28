"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { JOB_SEARCH_LABELS } from "@/lib/profile-defaults";
import { cn } from "@/lib/cn";
import {
  fetchApplicantContacts,
  fetchContactRequests,
  acceptContactRequest,
  rejectContactRequest,
  fetchRecommendationsInbox,
  markRecommendationViewed,
  searchApplicants,
  sendContactRequest,
  removeApplicantContact,
  type ApplicantContactApi,
  type RecommendationInboxApi,
} from "@/lib/api";
import type { ContactRequestApi, SearchApplicantApi } from "@/lib/types";
import { useToast } from "@/hooks/useToast";
import { applicationStatusBadge, applicationActionButton } from "@/lib/status-badges";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  Building01Icon,
  Calendar01Icon,
  ArrowRight01Icon,
  Search01Icon,
  UserAdd01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";

const tabs = [
  { id: "contacts" as const, label: "Мои контакты" },
  { id: "requests" as const, label: "Заявки" },
  { id: "recommendations" as const, label: "Рекомендации" },
];

type TabId = (typeof tabs)[number]["id"];

function isTabId(v: string | null): v is TabId {
  return v === "contacts" || v === "requests" || v === "recommendations";
}

function ContactsPageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>("contacts");
  const [contacts, setContacts] = useState<ApplicantContactApi[]>([]);
  const [requests, setRequests] = useState<ContactRequestApi[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationInboxApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchApplicantApi[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (isTabId(t)) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!user || user.role !== "applicant") {
      router.replace("/dashboard");
      return;
    }
    loadAll();
  }, [user, router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r, rec] = await Promise.all([
        fetchApplicantContacts(),
        fetchContactRequests(),
        fetchRecommendationsInbox(),
      ]);
      setContacts(c);
      setRequests(r);
      setRecommendations(rec);
    } catch {
      showToast("Не удалось загрузить данные", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchApplicants(searchQuery.trim());
      setSearchResults(results);
    } catch {
      showToast("Ошибка поиска", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (toUserId: string) => {
    try {
      await sendContactRequest(toUserId);
      showToast("Заявка отправлена", "success");
      setSearchResults((prev) =>
        prev.map((s) => (s.userId === toUserId ? { ...s, hasPending: true } : s)),
      );
    } catch {
      showToast("Не удалось отправить заявку", "error");
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptContactRequest(requestId);
      showToast("Заявка принята", "success");
      await loadAll();
    } catch {
      showToast("Не удалось принять заявку", "error");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectContactRequest(requestId);
      showToast("Заявка отклонена", "info");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      showToast("Не удалось отклонить заявку", "error");
    }
  };

  const handleMarkViewed = async (recId: string) => {
    try {
      await markRecommendationViewed(recId);
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, viewed: true } : r)),
      );
      showToast("Перемещено в архив", "info");
    } catch {
      showToast("Ошибка", "error");
    }
  };

  const handleRemoveContact = async (peerId: string) => {
    try {
      await removeApplicantContact(peerId);
      setContacts((prev) => prev.filter((c) => c.peerId !== peerId));
      showToast("Контакт удалён", "info");
    } catch {
      showToast("Не удалось удалить контакт", "error");
    }
  };

  const activeRecs = recommendations.filter((r) => !r.viewed);
  const archivedRecs = recommendations.filter((r) => r.viewed);

  return (
    <div className="mx-auto max-w-4xl space-y-4 min-[400px]:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Контакты</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Профессиональные контакты и нетворкинг</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← Кабинет
        </Link>
      </div>

      {/* Tabs: горизонтальный скролл на узких экранах (SE / mini) */}
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition min-[400px]:py-2",
              tab === t.id
                ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-purple)_70%,var(--brand-cyan)),var(--brand-magenta))] text-white shadow-md"
                : "glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {t.label}
            {t.id === "requests" && requests.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {requests.length}
              </span>
            )}
            {t.id === "recommendations" && activeRecs.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-cyan)] text-xs text-white">
                {activeRecs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <GlassPanel className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : (
        <>
          {/* ===== МОИ КОНТАКТЫ ===== */}
          {tab === "contacts" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Поиск соискателей */}
              <GlassPanel className="p-5">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Найти соискателя</h2>
                <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-stretch">
                  <div className="relative min-w-0 flex-1">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                    />
                    <input
                      className="glass-input min-h-[44px] w-full py-3 pl-10 pr-4 text-sm"
                      placeholder="Имя или email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSearch();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={searching || !searchQuery.trim()}
                    onClick={() => void handleSearch()}
                    className="min-h-[44px] shrink-0 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 min-[420px]:px-6"
                  >
                    {searching ? "Поиск..." : "Найти"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {searchResults.map((s) => (
                      <div
                        key={s.userId}
                        className="flex flex-col gap-3 rounded-xl border border-[var(--glass-border)] p-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-magenta)] to-[var(--brand-orange)]">
                            {s.avatarUrl ? (
                              <img src={s.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-white">{s.name[0]}</span>
                            )}
                          </div>
                          <div>
                            <Link href={`/applicant/profile/${s.userId}`} className="font-medium text-[var(--text-primary)] hover:underline">
                              {s.name}
                            </Link>
                            <p className="text-xs text-[var(--text-secondary)]">{s.skills?.slice(0, 3).join(", ")}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 min-[480px]:justify-end">
                          <Link
                            href={`/applicant/profile/${s.userId}`}
                            className="inline-flex min-h-[40px] min-w-[5.5rem] items-center justify-center rounded-lg border border-[var(--glass-border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Профиль
                          </Link>
                          {s.isContact ? (
                            <span className={cn("rounded-lg px-3 py-1.5 text-xs", applicationStatusBadge.accepted)}>
                              В контактах
                            </span>
                          ) : s.hasPending ? (
                            <span
                              className={cn(
                                "inline-flex min-h-[40px] min-w-[10rem] items-center justify-center rounded-lg px-3 py-2 text-center text-xs leading-tight",
                                applicationStatusBadge.pending,
                              )}
                            >
                              Заявка отправлена
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleSendRequest(s.userId)}
                              className="flex items-center gap-1 rounded-lg bg-[var(--brand-cyan)]/20 px-3 py-1.5 text-xs text-[var(--brand-cyan)] hover:bg-[var(--brand-cyan)]/30"
                            >
                              <HugeiconsIcon icon={UserAdd01Icon} size={12} />
                              Добавить
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassPanel>

              {contacts.length === 0 ? (
                <GlassPanel className="flex h-48 flex-col items-center justify-center gap-3 p-8 text-center">
                  <p className="text-lg font-medium text-[var(--text-primary)]">Нет контактов</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Найдите соискателей и отправьте заявку для добавления
                  </p>
                </GlassPanel>
              ) : (
                <div className="space-y-3">
                  {contacts.map((c, idx) => (
                    <motion.div
                      key={c.peerId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <GlassPanel className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-magenta)] to-[var(--brand-orange)]">
                            {c.avatarUrl ? (
                              <img src={c.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <span className="text-lg font-bold text-white">{c.name[0]}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <Link
                              href={`/applicant/profile/${c.peerId}`}
                              className="font-medium text-[var(--text-primary)] hover:underline"
                            >
                              {c.name}
                            </Link>
                            <p className="text-xs text-[var(--text-secondary)]">{c.email}</p>
                            {c.skills && c.skills.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {c.skills.slice(0, 4).map((s) => (
                                  <span
                                    key={s}
                                    className="rounded border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--text-primary)]"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {c.jobSearch && (
                              <span className="text-xs text-[var(--text-secondary)]">
                                {JOB_SEARCH_LABELS[c.jobSearch as keyof typeof JOB_SEARCH_LABELS] ?? c.jobSearch}
                              </span>
                            )}
                            <div className="flex gap-2">
                              <Link
                                href={`/applicant/profile/${c.peerId}`}
                                className="rounded-lg border border-[var(--glass-border)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              >
                                Профиль
                              </Link>
                              <button
                                type="button"
                                onClick={() => void handleRemoveContact(c.peerId)}
                                className="rounded-lg border border-red-800/35 bg-red-50 px-2 py-1 text-xs font-medium text-red-900 hover:bg-red-100 dark:border-red-500/30 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/10"
                                title="Удалить контакт"
                              >
                                <HugeiconsIcon icon={Delete01Icon} size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </GlassPanel>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ===== ЗАЯВКИ ===== */}
          {tab === "requests" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {requests.length === 0 ? (
                <GlassPanel className="flex h-48 flex-col items-center justify-center gap-3 p-8 text-center">
                  <HugeiconsIcon icon={Mail01Icon} size={40} className="text-[var(--text-secondary)]" />
                  <p className="text-lg font-medium text-[var(--text-primary)]">Нет входящих заявок</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Когда кто-то отправит вам заявку, она появится здесь
                  </p>
                </GlassPanel>
              ) : (
                requests.map((req, idx) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <GlassPanel className="p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-magenta)]">
                          {req.avatarUrl ? (
                            <img src={req.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <span className="text-lg font-bold text-white">{req.fromName[0]}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/applicant/profile/${req.fromUserId}`}
                            className="font-medium text-[var(--text-primary)] hover:underline"
                          >
                            {req.fromName}
                          </Link>
                          <p className="text-xs text-[var(--text-secondary)]">{req.fromEmail}</p>
                          {req.skills && req.skills.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {req.skills.map((s) => (
                                <span
                                  key={s}
                                  className="rounded border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--text-primary)]"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {req.bio && (
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">{req.bio}</p>
                          )}
                        </div>
                        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                          <button
                            type="button"
                            onClick={() => void handleAccept(req.id)}
                            className={cn(
                              "flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition sm:flex-initial sm:min-h-0",
                              applicationActionButton.accept,
                            )}
                          >
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                            Принять
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(req.id)}
                            className={cn(
                              "flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition sm:flex-initial sm:min-h-0",
                              applicationActionButton.reject,
                            )}
                          >
                            <HugeiconsIcon icon={Cancel01Icon} size={16} />
                            Отклонить
                          </button>
                        </div>
                      </div>
                    </GlassPanel>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* ===== РЕКОМЕНДАЦИИ ===== */}
          {tab === "recommendations" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {activeRecs.length === 0 && archivedRecs.length === 0 ? (
                <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
                  <HugeiconsIcon icon={Mail01Icon} size={48} className="text-[var(--text-secondary)]" />
                  <div>
                    <p className="text-lg font-medium text-[var(--text-primary)]">Нет рекомендаций</p>
                    <p className="text-sm text-[var(--text-secondary)]">Друзья пока не рекомендовали вам вакансии</p>
                  </div>
                </GlassPanel>
              ) : (
                <>
                  {activeRecs.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Новые рекомендации</h2>
                      {activeRecs.map((rec, idx) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <GlassPanel className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-magenta)] to-[var(--brand-orange)]">
                                <span className="text-sm font-bold text-white">{rec.fromName[0]}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-[var(--text-secondary)]">
                                  <Link
                                    href={`/applicant/profile/${rec.fromUserId}`}
                                    className="font-medium text-[var(--text-primary)] hover:underline"
                                  >
                                    {rec.fromName}
                                  </Link>{" "}
                                  рекомендует вам
                                </p>
                                <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                                  {rec.opportunityTitle || "Вакансия"}
                                </h3>
                                <div className="mt-1 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                                  {rec.companyName && (
                                    <span className="flex items-center gap-1">
                                      <HugeiconsIcon icon={Building01Icon} size={14} />
                                      {rec.companyName}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <HugeiconsIcon icon={Calendar01Icon} size={14} />
                                    {new Date(rec.createdAt).toLocaleDateString("ru-RU")}
                                  </span>
                                </div>
                                {rec.message && (
                                  <div className="mt-3 rounded-lg bg-[var(--glass-bg-strong)] p-3">
                                    <p className="text-sm italic text-[var(--text-secondary)]">&ldquo;{rec.message}&rdquo;</p>
                                  </div>
                                )}
                                <div className="mt-4 flex gap-3">
                                  <Link
                                    href={`/opportunities/${rec.opportunityId}?from=recommendations`}
                                    className="inline-flex items-center gap-1 text-sm text-[var(--brand-cyan)] hover:underline"
                                  >
                                    Посмотреть вакансию <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => void handleMarkViewed(rec.id)}
                                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  >
                                    Просмотрено ✓
                                  </button>
                                </div>
                              </div>
                            </div>
                          </GlassPanel>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {archivedRecs.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-[var(--text-secondary)]">Архив рекомендаций</h2>
                      {archivedRecs.map((rec) => (
                        <GlassPanel key={rec.id} className="p-4 opacity-60">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-[var(--text-secondary)]">
                                {rec.fromName} → {rec.opportunityTitle || "Вакансия"}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {new Date(rec.createdAt).toLocaleDateString("ru-RU")}
                              </p>
                            </div>
                            <Link
                              href={`/opportunities/${rec.opportunityId}?from=recommendations`}
                              className="text-xs text-[var(--brand-cyan)] hover:underline"
                            >
                              Открыть
                            </Link>
                          </div>
                        </GlassPanel>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl">
          <GlassPanel className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
          </GlassPanel>
        </div>
      }
    >
      <ContactsPageInner />
    </Suspense>
  );
}

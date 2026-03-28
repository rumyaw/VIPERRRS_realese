"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchEmployerApplications, setEmployerApplicationStatus, type EmployerApplication } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Check, X, Clock, User, Briefcase, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { applicationStatusBadge, applicationActionButton } from "@/lib/status-badges";
import { GlassSelect } from "@/components/ui/GlassSelect";

function EmployerApplicationsContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpp, setFilterOpp] = useState<string | null>(searchParams.get("opp"));
  /** sections = на рассмотрении отдельно + резерв + свёрнутые принятые/отклонённые */
  const [listMode, setListMode] = useState<"sections" | "pending" | "reserve" | "accepted" | "rejected">("sections");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
      return;
    }
    loadApplications();
  }, [user, router]);

  const loadApplications = async () => {
    try {
      const data = await fetchEmployerApplications();
      setApplications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: string, status: EmployerApplication["status"]) => {
    try {
      await setEmployerApplicationStatus(appId, status);
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
      showToast("Статус обновлён", "success");
    } catch (e) {
      console.error(e);
      showToast("Не удалось выполнить операцию", "error");
    }
  };

  const passesOppSearch = (a: EmployerApplication) => {
    if (filterOpp && a.opportunityId !== filterOpp) return false;
    if (searchQuery) {
      const hay = `${a.applicant.displayName} ${a.applicant.email} ${a.opportunity}`.toLowerCase();
      if (!hay.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  };

  const pendingApps = applications.filter((a) => a.status === "pending" && passesOppSearch(a));
  const reserveApps = applications.filter((a) => a.status === "reserve" && passesOppSearch(a));
  const acceptedApps = applications.filter((a) => a.status === "accepted" && passesOppSearch(a));
  const rejectedApps = applications.filter((a) => a.status === "rejected" && passesOppSearch(a));

  const singleStatusList =
    listMode === "pending"
      ? pendingApps
      : listMode === "reserve"
        ? reserveApps
        : listMode === "accepted"
          ? acceptedApps
          : listMode === "rejected"
            ? rejectedApps
            : [];

  const uniqueOpps = Array.from(new Map(applications.map((a) => [a.opportunityId, a.opportunity])).entries());

  const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "На рассмотрении", color: applicationStatusBadge.pending, icon: <Clock className="h-3 w-3" /> },
    accepted: { label: "Принят", color: applicationStatusBadge.accepted, icon: <Check className="h-3 w-3" /> },
    rejected: { label: "Отклонён", color: applicationStatusBadge.rejected, icon: <X className="h-3 w-3" /> },
    reserve: { label: "В резерве", color: applicationStatusBadge.reserve, icon: <Clock className="h-3 w-3" /> },
  };

  const renderCard = (app: EmployerApplication, idx: number) => {
    const status = statusLabels[app.status] || statusLabels.pending;
    return (
      <motion.div
        key={app.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
      >
        <GlassPanel className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
                  <User className="h-5 w-5 text-[#2d1a0e] dark:text-[var(--text-secondary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)]">{app.applicant.displayName}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">{app.applicant.email}</p>
                  <Link
                    href={`/applicant/profile/${app.applicant.id}?from=employer-applications`}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-cyan)] hover:underline"
                  >
                    Полный профиль <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              <div className="mt-3">
                <Link
                  href={`/employer/opportunities/${app.opportunityId}`}
                  className="text-sm font-medium text-[var(--text-primary)] underline-offset-2 hover:text-[var(--brand-cyan)] hover:underline"
                >
                  {app.opportunity}
                </Link>
                <p className="text-xs text-[var(--text-secondary)]">
                  Отклик отправлен: {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                </p>
              </div>

              {app.resumeSnapshot && (
                <div className="mt-3 max-h-52 overflow-y-auto rounded-lg bg-[var(--glass-bg-strong)] p-3 sm:max-h-64">
                  <p className="text-xs text-[var(--text-secondary)]">Резюме:</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--text-primary)]">
                    {app.resumeSnapshot}
                  </p>
                </div>
              )}
            </div>

            <div className="flex w-full flex-col gap-3 border-t border-[var(--glass-border)] pt-3 sm:w-auto sm:shrink-0 sm:border-t-0 sm:pt-0 sm:items-end">
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs [&_svg]:text-current",
                  status.color,
                )}
              >
                {status.icon}
                {status.label}
              </span>

              {app.status === "pending" && (
                <div className="flex w-full flex-col gap-2 min-[400px]:flex-row sm:w-auto sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "accepted")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.accept}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Принять
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "rejected")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.reject}`}
                  >
                    <X className="h-3.5 w-3.5" />
                    Отклонить
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "reserve")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.reserve}`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Резерв
                  </button>
                </div>
              )}

              {app.status === "reserve" && (
                <div className="flex w-full flex-col gap-2 min-[400px]:flex-row sm:w-auto">
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "accepted")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.accept}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Принять из резерва
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "rejected")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.reject}`}
                  >
                    <X className="h-3.5 w-3.5" />
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    );
  };

  const totalVisible =
    listMode === "sections"
      ? pendingApps.length + reserveApps.length + acceptedApps.length + rejectedApps.length
      : singleStatusList.length;
  const emptyAll = !loading && totalVisible === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Отклики</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {filterOpp ? "Фильтр по карточке" : "На рассмотрении — вверху; принятые и отклонённые — в свёрнутых блоках"}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← На главную
        </Link>
      </div>

      <GlassPanel className="flex flex-col flex-wrap gap-3 p-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Поиск по имени или email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="glass-input min-h-[44px] w-full flex-1 px-4 py-2 text-sm sm:min-w-[200px]"
        />
        <GlassSelect
          value={listMode}
          onChange={(v) =>
            setListMode(v as "sections" | "pending" | "reserve" | "accepted" | "rejected")
          }
          options={[
            { value: "sections", label: "Все разделы на странице" },
            { value: "pending", label: "Только на рассмотрении" },
            { value: "reserve", label: "Только в резерве" },
            { value: "accepted", label: "Только принятые" },
            { value: "rejected", label: "Только отклонённые" },
          ]}
          className="w-full sm:w-auto sm:min-w-[14rem]"
          buttonClassName="min-h-[44px] px-4 py-2 text-sm"
        />
        <GlassSelect
          value={filterOpp ?? ""}
          onChange={(v) => setFilterOpp(v || null)}
          options={[
            { value: "", label: "Все карточки" },
            ...uniqueOpps.map(([id, title]) => ({ value: id, label: title })),
          ]}
          className="w-full sm:w-auto sm:min-w-[14rem]"
          buttonClassName="min-h-[44px] px-4 py-2 text-sm"
        />
      </GlassPanel>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : emptyAll ? (
        <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <Briefcase className="h-12 w-12 text-[#2d1a0e] dark:text-[var(--text-secondary)]" />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Нет откликов</p>
            <p className="text-sm text-[var(--text-secondary)]">Пока никто не откликнулся на ваши карточки</p>
          </div>
        </GlassPanel>
      ) : listMode !== "sections" ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {listMode === "pending" && "На рассмотрении"}
            {listMode === "reserve" && "В резерве"}
            {listMode === "accepted" && "Принятые кандидаты"}
            {listMode === "rejected" && "Отклонённые кандидаты"}
          </h2>
          {singleStatusList.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Нет откликов по выбранному фильтру.</p>
          ) : (
            singleStatusList.map((app, idx) => renderCard(app, idx))
          )}
        </section>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Требуют решения</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Новые отклики: примите, отклоните или отправьте в резерв.
            </p>
            {pendingApps.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Сейчас никто не ждёт решения.</p>
            ) : (
              pendingApps.map((app, idx) => renderCard(app, idx))
            )}
          </section>

          {reserveApps.length > 0 && (
            <section className="space-y-3 border-t border-[var(--glass-border)] pt-8">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">В резерве</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Отложенные кандидаты — можно принять позже или отклонить.
              </p>
              {reserveApps.map((app, idx) => renderCard(app, idx + pendingApps.length))}
            </section>
          )}

          <details className="group border-t border-[var(--glass-border)] pt-6">
            <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Принятые кандидаты
                <span className="rounded-full bg-[var(--glass-bg-strong)] px-2 py-0.5 text-xs font-normal text-[var(--text-secondary)]">
                  {acceptedApps.length}
                </span>
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              {acceptedApps.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Пока нет принятых откликов.</p>
              ) : (
                acceptedApps.map((app, idx) => renderCard(app, idx))
              )}
            </div>
          </details>

          <details className="group border-t border-[var(--glass-border)] pt-6">
            <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                Отклонённые кандидаты
                <span className="rounded-full bg-[var(--glass-bg-strong)] px-2 py-0.5 text-xs font-normal text-[var(--text-secondary)]">
                  {rejectedApps.length}
                </span>
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              {rejectedApps.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Нет отклонённых откликов.</p>
              ) : (
                rejectedApps.map((app, idx) => renderCard(app, idx))
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default function EmployerApplicationsPage() {
  return (
    <Suspense fallback={<div className="glass-panel flex min-h-[320px] items-center justify-center">Загрузка...</div>}>
      <EmployerApplicationsContent />
    </Suspense>
  );
}

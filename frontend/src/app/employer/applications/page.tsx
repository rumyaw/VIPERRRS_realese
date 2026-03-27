"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchEmployerApplications, setEmployerApplicationStatus, type EmployerApplication } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Check, X, Clock, User, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { applicationStatusBadge, applicationActionButton } from "@/lib/status-badges";

function EmployerApplicationsContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpp, setFilterOpp] = useState<string | null>(searchParams.get("opp"));
  const [filterStatus, setFilterStatus] = useState("");
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

  const activeApps = applications.filter(
    (a) =>
      a.status !== "reserve" &&
      passesOppSearch(a) &&
      (!filterStatus || a.status === filterStatus),
  );

  const reserveApps = applications.filter((a) => a.status === "reserve" && passesOppSearch(a));

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
                  <User className="h-5 w-5 text-[var(--text-secondary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)]">{app.applicant.displayName}</p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">{app.applicant.email}</p>
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
                    Принять
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "rejected")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.reject}`}
                  >
                    Отклонить
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "reserve")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.reserve}`}
                  >
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
                    Принять из резерва
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange(app.id, "rejected")}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition sm:py-1.5 ${applicationActionButton.reject}`}
                  >
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

  const emptyAll = !loading && activeApps.length === 0 && reserveApps.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Отклики</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {filterOpp ? "Фильтр по карточке" : "Активные отклики и резерв отдельно"}
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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="glass-select min-h-[44px] w-full px-4 py-2 text-sm sm:w-auto"
        >
          <option value="">Все статусы (кроме резерва)</option>
          <option value="pending">На рассмотрении</option>
          <option value="accepted">Приняты</option>
          <option value="rejected">Отклонены</option>
        </select>
        <select
          value={filterOpp ?? ""}
          onChange={(e) => setFilterOpp(e.target.value || null)}
          className="glass-select min-h-[44px] w-full px-4 py-2 text-sm sm:w-auto"
        >
          <option value="">Все карточки</option>
          {uniqueOpps.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </GlassPanel>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : emptyAll ? (
        <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <Briefcase className="h-12 w-12 text-[var(--text-secondary)]" />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Нет откликов</p>
            <p className="text-sm text-[var(--text-secondary)]">Пока никто не откликнулся на ваши карточки</p>
          </div>
        </GlassPanel>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Активные отклики</h2>
            {activeApps.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Нет откликов в этом разделе по выбранным фильтрам.</p>
            ) : (
              activeApps.map((app, idx) => renderCard(app, idx))
            )}
          </section>

          {reserveApps.length > 0 && (
            <section className="space-y-3 border-t border-[var(--glass-border)] pt-8">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">В резерве</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Здесь кандидаты, которых вы отложили. Можно принять позже или отклонить.
              </p>
              {reserveApps.map((app, idx) => renderCard(app, idx + activeApps.length))}
            </section>
          )}
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

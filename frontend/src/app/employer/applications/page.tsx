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
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      showToast("Статус обновлён", "success");
    } catch (e) {
      console.error(e);
      showToast("Не удалось выполнить операцию", "error");
    }
  };

  const filteredApps = applications.filter((a) => {
    if (filterOpp && a.opportunityId !== filterOpp) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (searchQuery) {
      const hay = `${a.applicant.displayName} ${a.applicant.email} ${a.opportunity}`.toLowerCase();
      if (!hay.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const uniqueOpps = Array.from(new Map(applications.map(a => [a.opportunityId, a.opportunity])).entries());

  const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "На рассмотрении", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: <Clock className="h-3 w-3" /> },
    accepted: { label: "Принят", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: <Check className="h-3 w-3" /> },
    rejected: { label: "Отклонён", color: "bg-red-500/15 text-red-700 dark:text-red-300", icon: <X className="h-3 w-3" /> },
    reserve: { label: "В резерве", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300", icon: <Clock className="h-3 w-3" /> },
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Отклики</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {filterOpp ? "Фильтр по карточке" : "Все отклики на ваши карточки"}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← На главную
        </Link>
      </div>

      <GlassPanel className="flex flex-wrap items-center gap-3 p-4">
        <input
          type="text"
          placeholder="Поиск по имени или email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="glass-input flex-1 min-w-[200px] px-4 py-2 text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="glass-select px-4 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="pending">На рассмотрении</option>
          <option value="accepted">Приняты</option>
          <option value="rejected">Отклонены</option>
          <option value="reserve">В резерве</option>
        </select>
        <select
          value={filterOpp ?? ""}
          onChange={(e) => setFilterOpp(e.target.value || null)}
          className="glass-select px-4 py-2 text-sm"
        >
          <option value="">Все карточки</option>
          {uniqueOpps.map(([id, title]) => (
            <option key={id} value={id}>{title}</option>
          ))}
        </select>
      </GlassPanel>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : filteredApps.length === 0 ? (
        <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <Briefcase className="h-12 w-12 text-[var(--text-secondary)]" />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Нет откликов</p>
            <p className="text-sm text-[var(--text-secondary)]">Пока никто не откликнулся на ваши карточки</p>
          </div>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app, idx) => {
            const status = statusLabels[app.status] || statusLabels.pending;
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassPanel className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--glass-bg-strong)]">
                          <User className="h-5 w-5 text-[var(--text-secondary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{app.applicant.displayName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{app.applicant.email}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm text-[var(--text-primary)]">{app.opportunity}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Отклик отправлен: {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                        </p>
                      </div>

                      {app.resumeSnapshot && (
                        <div className="mt-3 rounded-lg bg-[var(--glass-bg-strong)] p-3">
                          <p className="text-xs text-[var(--text-secondary)]">Резюме:</p>
                          <p className="mt-1 text-sm text-[var(--text-primary)] line-clamp-3">{app.resumeSnapshot}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs", status.color)}>
                        {status.icon}
                        {status.label}
                      </span>

                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusChange(app.id, "accepted")}
                            className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-500/25 dark:text-emerald-300"
                          >
                            Принять
                          </button>
                          <button
                            onClick={() => handleStatusChange(app.id, "rejected")}
                            className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-500/25 dark:text-red-300"
                          >
                            Отклонить
                          </button>
                          <button
                            onClick={() => handleStatusChange(app.id, "reserve")}
                            className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-500/25 dark:text-blue-300"
                          >
                            Резерв
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              </motion.div>
            );
          })}
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

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchApplicantApplications } from "@/lib/api";
import { X } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, CheckmarkCircle01Icon, Building01Icon, Location01Icon } from "@hugeicons/core-free-icons";

export default function ApplicantApplicationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<Array<{
    id: string;
    opportunityId: string;
    status: string;
    createdAt: string;
    opp?: { id: string; title: string; companyName: string; locationLabel: string };
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "applicant") {
      router.replace("/dashboard");
      return;
    }
    loadApplications();
  }, [user, router]);

  const loadApplications = async () => {
    try {
      const data = await fetchApplicantApplications();
      setApplications(data.map((a: Record<string, unknown>) => ({
        id: String(a.id),
        opportunityId: String(a.opportunityId),
        status: String(a.status),
        createdAt: String(a.createdAt),
        opp: a.opportunity as { id: string; title: string; companyName: string; locationLabel: string } | undefined,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "На рассмотрении", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: <HugeiconsIcon icon={Clock01Icon} size={16} /> },
    accepted: { label: "Приглашение", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} /> },
    rejected: { label: "Отказ", color: "bg-red-500/15 text-red-700 dark:text-red-300", icon: <X className="h-4 w-4" /> },
    reserve: { label: "В резерве", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300", icon: <HugeiconsIcon icon={Clock01Icon} size={16} /> },
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Мои отклики</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Отслеживание статуса откликов</p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← К вакансиям
        </Link>
      </div>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : applications.length === 0 ? (
        <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <HugeiconsIcon icon={Building01Icon} size={48} className="text-[var(--text-secondary)]" />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Нет откликов</p>
            <p className="text-sm text-[var(--text-secondary)]">Вы ещё не откликались на вакансии</p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)]"
          >
            Найти вакансии
          </Link>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {applications.map((app, idx) => {
            const status = statusConfig[app.status] || statusConfig.pending;
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <GlassPanel className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        href={`/opportunities/${app.opportunityId}`}
                        className="text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--brand-cyan)] transition"
                      >
                        {app.opp?.title || "Вакансия"}
                      </Link>
                      <div className="mt-1 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Building01Icon} size={14} />
                          {app.opp?.companyName || "Компания"}
                        </span>
                        {app.opp?.locationLabel && (
                          <span className="flex items-center gap-1">
                            <HugeiconsIcon icon={Location01Icon} size={14} />
                            {app.opp.locationLabel}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        Отклик отправлен: {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${status.color}`}>
                      {status.icon}
                      {status.label}
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

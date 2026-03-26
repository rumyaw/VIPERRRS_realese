"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchEmployerOpportunities } from "@/lib/api";
import type { Opportunity } from "@/lib/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Location01Icon, Briefcase01Icon, Calendar01Icon } from "@hugeicons/core-free-icons";

export default function EmployerOpportunitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
      return;
    }
    loadOpportunities();
  }, [user, router]);

  const loadOpportunities = async () => {
    try {
      const data = await fetchEmployerOpportunities();
      setOpportunities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, string> = {
    internship: "Стажировка",
    vacancy_junior: "Вакансия Junior",
    vacancy_senior: "Вакансия Middle+",
    mentorship: "Менторство",
    event: "Мероприятие",
  };

  const formatLabels: Record<string, string> = {
    office: "Офис",
    hybrid: "Гибрид",
    remote: "Удалённо",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Мои карточки</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Управление возможностями</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/employer/company"
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Компания
          </Link>
          <Link
            href="/employer/opportunities/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
            Создать
          </Link>
        </div>
      </div>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : opportunities.length === 0 ? (
        <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <HugeiconsIcon icon={Briefcase01Icon} size={48} className="text-[var(--text-secondary)]" />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Нет карточек</p>
            <p className="text-sm text-[var(--text-secondary)]">Создайте первую карточку возможности</p>
          </div>
          <Link
            href="/employer/opportunities/new"
            className="rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)]"
          >
            Создать карточку
          </Link>
        </GlassPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opp, idx) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassPanel className="group relative overflow-hidden p-5 transition hover:border-[var(--brand-cyan)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="inline-block rounded-full bg-[var(--glass-bg-strong)] px-2 py-1 text-xs text-[var(--text-secondary)]">
                      {typeLabels[opp.type] || opp.type}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-cyan)] transition">
                      {opp.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                      {opp.shortDescription}
                    </p>
                  </div>
                  {opp.mediaUrl && (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                      <img src={opp.mediaUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Location01Icon} size={12} />
                    {formatLabels[opp.workFormat] || opp.workFormat}
                  </span>
                  <span className="flex items-center gap-1">
                    <HugeiconsIcon icon={Calendar01Icon} size={12} />
                    {opp.publishedAt ? new Date(opp.publishedAt).toLocaleDateString("ru-RU") : "Новая"}
                  </span>
                  {opp.salaryMin && opp.salaryMax && (
                    <span className="text-[var(--brand-orange)]">
                      {opp.salaryMin.toLocaleString("ru-RU")} – {opp.salaryMax.toLocaleString("ru-RU")} ₽
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="rounded-lg bg-[var(--glass-bg-strong)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)]"
                  >
                    Просмотр
                  </Link>
                  <Link
                    href={`/employer/applications?opp=${opp.id}`}
                    className="rounded-lg bg-[var(--glass-bg-strong)] px-3 py-1.5 text-xs text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)]"
                  >
                    Отклики
                  </Link>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

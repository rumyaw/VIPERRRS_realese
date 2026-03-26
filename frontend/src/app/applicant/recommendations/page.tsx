"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchRecommendationsInbox, type RecommendationInboxApi } from "@/lib/api";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon, Building01Icon, Calendar01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export default function RecommendationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendationInboxApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== "applicant") {
      router.replace("/dashboard");
      return;
    }
    loadRecommendations();
  }, [user, router]);

  const loadRecommendations = async () => {
    try {
      const data = await fetchRecommendationsInbox();
      setRecommendations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Рекомендации</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Вакансии от друзей и контактов</p>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← На главную
        </Link>
      </div>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : recommendations.length === 0 ? (
        <GlassPanel className="flex h-64 flex-col items-center justify-center gap-4 p-8 text-center">
          <HugeiconsIcon icon={Mail01Icon} size={48} className="text-[var(--text-secondary)]" />
          <div>
            <p className="text-lg font-medium text-[var(--text-primary)]">Нет рекомендаций</p>
            <p className="text-sm text-[var(--text-secondary)]">Друзья пока не рекомендовали вам вакансии</p>
          </div>
          <p className="max-w-md text-xs text-[var(--text-secondary)]">
            Добавьте контакты в разделе &quot;Контакты&quot;, чтобы получать персональные рекомендации от них
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
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
                      <span className="font-medium text-[var(--text-primary)]">{rec.fromName}</span> рекомендует вам
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                      {rec.opportunityTitle || "Вакансия"}
                    </h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                      {rec.opportunityCompany && (
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Building01Icon} size={14} />
                          {rec.opportunityCompany}
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
                    <div className="mt-4">
                      <Link
                        href={`/opportunities/${rec.opportunityId}`}
                        className="inline-flex items-center gap-1 text-sm text-[var(--brand-cyan)] hover:underline"
                      >
                        Посмотреть вакансию <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchCuratorOpportunityById, setOpportunityModerationStatus } from "@/lib/api";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";
import { moderationStatusBadge } from "@/lib/status-badges";
import { navLinkButtonClass } from "@/lib/nav-link-styles";

const typeLabels: Record<Opportunity["type"], string> = {
  internship: "Стажировка",
  vacancy_junior: "Вакансия (Junior)",
  vacancy_senior: "Вакансия (Middle+)",
  mentorship: "Менторская программа",
  event: "Карьерное мероприятие",
};

export default function AdminOpportunityPreviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [opp, setOpp] = useState<Opportunity | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "curator") {
      router.replace("/dashboard");
      return;
    }
    if (!params.id) return;
    const abort = new AbortController();
    fetchCuratorOpportunityById(params.id, abort.signal)
      .then((o) => setOpp(o))
      .catch(() => setOpp(null));
    return () => abort.abort();
  }, [user, router, params.id]);

  const st = opp?.moderationStatus ?? "pending";
  const badgeClass =
    moderationStatusBadge[st as keyof typeof moderationStatusBadge] ?? moderationStatusBadge.pending;

  async function moderate(status: string) {
    if (!params.id) return;
    setBusy(true);
    try {
      await setOpportunityModerationStatus(params.id, status);
      showToast("Статус обновлён", "success");
      const o = await fetchCuratorOpportunityById(params.id);
      setOpp(o);
    } catch {
      showToast("Ошибка", "error");
    } finally {
      setBusy(false);
    }
  }

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
        <p className="text-[var(--text-primary)]">Карточка не найдена.</p>
        <Link href="/admin/opportunities" className={`${navLinkButtonClass} mt-4 inline-flex`}>
          ← К списку
        </Link>
      </GlassPanel>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/opportunities" className={navLinkButtonClass}>
          ← К списку карточек
        </Link>
        {opp.moderationStatus === "approved" && (
          <Link href={`/opportunities/${opp.id}`} className={navLinkButtonClass} target="_blank" rel="noreferrer">
            Открыть как на сайте ↗
          </Link>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <GlassPanel className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("rounded-full px-3 py-1 text-xs font-medium", badgeClass)}>
              {st === "pending" ? "На модерации" : st === "approved" ? "Одобрено" : "Отклонено"}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{typeLabels[opp.type]}</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{opp.title}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{opp.companyName}</p>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Кратко</p>
            <p className="mt-1 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{opp.shortDescription}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)]">Полное описание</p>
            <p className="mt-1 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{opp.fullDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {opp.tags.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-2 py-0.5 text-xs"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="border-t border-[var(--glass-border)] pt-4 text-sm text-[var(--text-secondary)]">
            <p>{opp.locationLabel}</p>
            {opp.salaryMin != null && opp.salaryMax != null && (
              <p className="mt-1">
                {opp.salaryMin.toLocaleString("ru-RU")}–{opp.salaryMax.toLocaleString("ru-RU")} {opp.currency}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[var(--glass-border)] pt-4">
            {st !== "approved" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void moderate("approved")}
                className="rounded-xl border-2 border-emerald-800/55 bg-emerald-100 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-200 disabled:opacity-50 dark:border-emerald-400/40 dark:bg-emerald-500/25 dark:text-emerald-50 dark:hover:bg-emerald-500/40"
              >
                Одобрить
              </button>
            )}
            {st !== "rejected" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void moderate("rejected")}
                className="rounded-xl border-2 border-red-800/55 bg-red-100 px-4 py-2.5 text-sm font-semibold text-red-950 shadow-sm transition hover:bg-red-200 disabled:opacity-50 dark:border-red-400/40 dark:bg-red-500/25 dark:text-red-50 dark:hover:bg-red-500/40"
              >
                Отклонить
              </button>
            )}
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}

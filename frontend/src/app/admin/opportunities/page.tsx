"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  fetchAdminOpportunities,
  deleteAdminOpportunity,
  setOpportunityModerationStatus,
  type AdminOpportunity,
  getAdminExportUrl,
} from "@/lib/api";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";
import { moderationStatusBadge, moderationIconButton } from "@/lib/status-badges";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, CheckmarkCircle01Icon, Cancel01Icon, Download01Icon } from "@hugeicons/core-free-icons";

const TYPE_LABELS: Record<string, string> = {
  internship: "Стажировка",
  vacancy_junior: "Junior",
  vacancy_senior: "Middle+",
  mentorship: "Менторство",
  event: "Мероприятие",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: "Одобрено", color: moderationStatusBadge.approved },
  pending: { label: "На модерации", color: moderationStatusBadge.pending },
  rejected: { label: "Отклонено", color: moderationStatusBadge.rejected },
};

export default function AdminOpportunitiesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [opps, setOpps] = useState<AdminOpportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const limit = 20;

  useEffect(() => {
    if (!user || user.role !== "curator") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const loadOpps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminOpportunities({ page, limit, status: statusFilter || undefined });
      setOpps(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { loadOpps(); }, [loadOpps]);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить карточку? Это действие необратимо.")) return;
    try {
      await deleteAdminOpportunity(id);
      showToast("Карточка удалена", "success");
      loadOpps();
    } catch {
      showToast("Ошибка удаления", "error");
    }
  };

  const handleModerate = async (id: string, status: string) => {
    try {
      await setOpportunityModerationStatus(id, status);
      showToast("Статус обновлён", "success");
      loadOpps();
    } catch {
      showToast("Ошибка обновления", "error");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Управление карточками</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Всего: {total}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={getAdminExportUrl("csv")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <HugeiconsIcon icon={Download01Icon} size={16} />
            Экспорт CSV
          </a>
          <a
            href={getAdminExportUrl("json")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <HugeiconsIcon icon={Download01Icon} size={16} />
            Экспорт JSON
          </a>
          <Link
            href="/admin/dashboard"
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            ← Дашборд
          </Link>
        </div>
      </div>

      <GlassPanel className="flex flex-wrap items-center gap-3 p-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="glass-select px-4 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="pending">На модерации</option>
          <option value="approved">Одобрены</option>
          <option value="rejected">Отклонены</option>
        </select>
      </GlassPanel>

      {loading ? (
        <GlassPanel className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : opps.length === 0 ? (
        <GlassPanel className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
          Карточки не найдены
        </GlassPanel>
      ) : (
        <>
          <div className="space-y-2">
            {opps.map((opp, idx) => {
              const st = STATUS_LABELS[opp.moderationStatus] || STATUS_LABELS.pending;
              return (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <GlassPanel className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/opportunities/${opp.id}`}
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--brand-cyan)] truncate transition"
                      >
                        {opp.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span>{opp.companyName}</span>
                        <span>{TYPE_LABELS[opp.type] || opp.type}</span>
                        <span>{new Date(opp.createdAt).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", st.color)}>
                      {st.label}
                    </span>
                    <div className="flex gap-1">
                      {opp.moderationStatus !== "approved" && (
                        <button
                          onClick={() => handleModerate(opp.id, "approved")}
                          className={`rounded-lg p-2 transition ${moderationIconButton.approve}`}
                          title="Одобрить"
                        >
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                        </button>
                      )}
                      {opp.moderationStatus !== "rejected" && (
                        <button
                          onClick={() => handleModerate(opp.id, "rejected")}
                          className={`rounded-lg p-2 transition ${moderationIconButton.reject}`}
                          title="Отклонить"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(opp.id)}
                        className={`rounded-lg p-2 transition ${moderationIconButton.delete}`}
                        title="Удалить"
                      >
                        <HugeiconsIcon icon={Delete01Icon} size={16} />
                      </button>
                    </div>
                  </GlassPanel>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="rounded-lg bg-[var(--glass-bg-strong)] px-3 py-1.5 text-sm text-[var(--text-secondary)] disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="rounded-lg bg-[var(--glass-bg-strong)] px-3 py-1.5 text-sm text-[var(--text-secondary)] disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

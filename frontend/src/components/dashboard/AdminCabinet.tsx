"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  fetchPendingCompanies,
  fetchPendingOpportunities,
  setCompanyVerification,
  setOpportunityModerationStatus,
} from "@/lib/api";
import { useToast } from "@/hooks/useToast";

export function AdminCabinet() {
  const [items, setItems] = useState<Array<{ id: string; kind: "employer_verify" | "opportunity" | "report"; title: string; status: string; createdAt: string; entityId?: string }>>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    void (async () => {
      try {
        const [companies, opportunities] = await Promise.all([
          fetchPendingCompanies(),
          fetchPendingOpportunities(),
        ]);
        const mapped = [
          ...companies.map((c) => ({
            id: `company-${c.userId}`,
            kind: "employer_verify" as const,
            title: `Верификация: ${c.companyName}, ИНН ${c.inn || "не указан"}`,
            status: "open" as const,
            createdAt: "now",
            entityId: c.userId,
          })),
          ...opportunities.map((o) => ({
            id: `opp-${String(o.id)}`,
            kind: "opportunity" as const,
            title: `Модерация: ${String(o.title)}`,
            status: "open" as const,
            createdAt: String(o.createdAt ?? "now"),
            entityId: String(o.id),
          })),
        ];
        setItems(mapped);
      } catch (e) {
        setApiError(e instanceof Error ? e.message : "Не удалось загрузить очередь модерации");
      }
    })();
  }, []);

  const stats = useMemo(
    () => ({
      openModeration: items.length,
      employersPending: items.filter((i) => i.kind === "employer_verify").length,
    }),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Открытая модерация", value: stats.openModeration, delay: 0 },
          { label: "Заявок на верификацию", value: stats.employersPending, delay: 0.05 },
        ].map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: s.delay }}
          >
            <GlassPanel className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                {s.label}
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--text-primary)]">{s.value}</p>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Заявки работодателей и модерация</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Администратор подтверждает компании (ИНН, корпоративная почта, профессиональные сети)
          и модерирует карточки возможностей.
        </p>
      </GlassPanel>

      <div className="space-y-4">
        {items.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassPanel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    m.kind === "employer_verify"
                      ? "bg-[color-mix(in_srgb,var(--brand-orange)_25%,transparent)]"
                      : m.kind === "opportunity"
                        ? "bg-[color-mix(in_srgb,var(--brand-cyan)_22%,transparent)]"
                        : "bg-red-500/20"
                  }`}
                >
                  {m.kind === "employer_verify"
                    ? "Верификация работодателя"
                    : m.kind === "opportunity"
                      ? "Карточка возможности"
                      : "Жалоба"}
                </span>
                <p className="mt-2 font-medium text-[var(--text-primary)]">{m.title}</p>
                <p className="text-xs text-[var(--text-secondary)]">{m.createdAt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border-2 border-emerald-800/50 bg-emerald-200 px-4 py-2 text-sm font-semibold text-[var(--control-ink-strong)] transition hover:bg-emerald-300/90 dark:border-transparent dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30"
                  onClick={() => {
                    void (async () => {
                      try {
                        if (m.kind === "employer_verify") {
                          await setCompanyVerification((m as { entityId?: string }).entityId ?? "", true);
                        } else if (m.kind === "opportunity") {
                          await setOpportunityModerationStatus((m as { entityId?: string }).entityId ?? "", "approved");
                        }
                        setItems((prev) => prev.filter((x) => x.id !== m.id));
                        showToast("Статус обновлён", "success");
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "Не удалось обновить статус";
                        setApiError(msg);
                        showToast(msg, "error");
                      }
                    })();
                  }}
                >
                  Одобрить
                </button>
                <button
                  type="button"
                  className="btn-danger-soft rounded-xl px-4 py-2 text-sm font-semibold"
                  onClick={() => {
                    void (async () => {
                      try {
                        if (m.kind === "employer_verify") {
                          await setCompanyVerification((m as { entityId?: string }).entityId ?? "", false);
                        } else if (m.kind === "opportunity") {
                          await setOpportunityModerationStatus((m as { entityId?: string }).entityId ?? "", "rejected");
                        }
                        setItems((prev) => prev.filter((x) => x.id !== m.id));
                        showToast("Статус обновлён", "success");
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "Не удалось обновить статус";
                        setApiError(msg);
                        showToast(msg, "error");
                      }
                    })();
                  }}
                >
                  Отклонить
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm text-[var(--text-primary)]"
                >
                  Детали
                </button>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)]">Очередь пуста.</p>
        )}
        {apiError && (
          <p className="text-center text-xs font-medium text-red-900 dark:text-red-300">{apiError}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { MOCK_MODERATION, MOCK_OPPORTUNITIES } from "@/lib/mock-data";

const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL ?? "";

export function AdminCabinet() {
  const [items, setItems] = useState(MOCK_MODERATION);

  const stats = useMemo(
    () => ({
      opportunities: MOCK_OPPORTUNITIES.length,
      openModeration: items.length,
      employersPending: items.filter((i) => i.kind === "employer_verify").length,
    }),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Карточек на платформе", value: stats.opportunities, delay: 0 },
          { label: "Открытая модерация", value: stats.openModeration, delay: 0.05 },
          { label: "Заявок на верификацию", value: stats.employersPending, delay: 0.1 },
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
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Метрики и наблюдаемость</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          В продакшене показатели трафика, откликов, конверсий и здоровья API собираются в Prometheus /
          Loki и визуализируются в Grafana. Здесь — ссылка на дашборд (задайте URL в{" "}
          <code className="rounded bg-[var(--glass-bg-strong)] px-1">NEXT_PUBLIC_GRAFANA_URL</code>).
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {grafanaUrl ? (
            <motion.a
              href={grafanaUrl}
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#f59e0b,#e6007e)] px-5 py-3 text-sm font-semibold text-white shadow-lg"
            >
              Открыть Grafana ↗
            </motion.a>
          ) : (
            <span className="rounded-xl border border-dashed border-[var(--glass-border)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              URL Grafana не задан в переменных окружения
            </span>
          )}
          <button
            type="button"
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-sm text-[var(--text-secondary)]"
            onClick={() => alert("Экспорт отчёта CSV/PDF — при подключении API.")}
          >
            Экспорт отчёта (демо)
          </button>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Заявки работодателей и модерация</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Администратор подтверждает компании (ИНН, корпоративная почта, профессиональные сети), как в
          ТЗ, и модерирует карточки возможностей. Кураторы платформы (представители вузов) могут
          получать ограниченные права через отдельные политики (в демо — одна роль admin).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/register"
            className="rounded-xl border border-[var(--glass-border)] px-4 py-2 text-sm text-[var(--text-secondary)] line-through opacity-60"
          >
            Регистрация админа с публичной страницы
          </Link>
          <span className="self-center text-xs text-[var(--text-secondary)]">— недоступна по ТЗ</span>
        </div>
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
                  className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100"
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== m.id))}
                >
                  Одобрить
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-100"
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== m.id))}
                >
                  Отклонить
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm text-[var(--text-primary)]"
                  onClick={() => alert("Детальная панель — при подключении API.")}
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
      </div>
    </div>
  );
}

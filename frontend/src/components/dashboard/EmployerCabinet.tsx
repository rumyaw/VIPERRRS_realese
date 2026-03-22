"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { MOCK_APPLICATIONS, MOCK_OPPORTUNITIES } from "@/lib/mock-data";
import type { Opportunity, OpportunityType, WorkFormat } from "@/lib/types";
import { cn } from "@/lib/cn";

const tabs = [
  { id: "company", label: "Компания" },
  { id: "create", label: "Новая возможность" },
  { id: "list", label: "Мои карточки" },
  { id: "responses", label: "Отклики" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function EmployerCabinet() {
  const { user, updateEmployer } = useAuth();
  const [tab, setTab] = useState<TabId>("company");
  const emp = user?.employer;

  const myOpps = useMemo(
    () => MOCK_OPPORTUNITIES.filter((o) => o.companyId === "co-1" || o.companyName === emp?.companyName),
    [emp?.companyName],
  );

  const responses = useMemo(() => {
    return MOCK_APPLICATIONS.map((a) => ({
      ...a,
      opp: MOCK_OPPORTUNITIES.find((o) => o.id === a.opportunityId),
    })).filter((x) => myOpps.some((o) => o.id === x.opportunityId));
  }, [myOpps]);

  const [draft, setDraft] = useState({
    title: "",
    shortDescription: "",
    type: "vacancy_junior" as OpportunityType,
    workFormat: "hybrid" as WorkFormat,
    locationLabel: "Москва",
  });

  if (!emp) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "bg-[linear-gradient(135deg,var(--brand-orange),var(--brand-magenta))] text-white shadow-md"
                : "glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "company" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassPanel className="grid gap-6 p-6 lg:grid-cols-[200px_1fr]">
            <div className="text-center">
              <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
                {emp.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={emp.logoDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl font-bold text-[var(--text-secondary)]">
                    {emp.companyName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="mt-4 inline-block cursor-pointer rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm">
                Логотип
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => updateEmployer({ logoDataUrl: String(reader.result) });
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <p
                className={cn(
                  "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium",
                  emp.verified
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-amber-500/20 text-amber-100",
                )}
              >
                {emp.verified ? "Верифицировано" : "Ожидает верификации"}
              </p>
            </div>
            <div className="space-y-4">
              <Field
                label="Наименование"
                value={emp.companyName}
                onChange={(v) => updateEmployer({ companyName: v })}
              />
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Описание</label>
                <textarea
                  className="glass-input mt-1 min-h-[88px] w-full px-4 py-3 text-sm"
                  value={emp.description}
                  onChange={(e) => updateEmployer({ description: e.target.value })}
                />
              </div>
              <Field
                label="Сфера деятельности"
                value={emp.industry}
                onChange={(v) => updateEmployer({ industry: v })}
              />
              <Field label="Сайт" value={emp.website} onChange={(v) => updateEmployer({ website: v })} />
              <Field
                label="Соцсети / профили"
                value={emp.socials}
                onChange={(v) => updateEmployer({ socials: v })}
              />
              <Field label="ИНН" value={emp.inn} onChange={(v) => updateEmployer({ inn: v })} />
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {tab === "create" && (
        <GlassPanel className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Создание карточки возможности</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Полная форма дублирует поля публичной карточки (ТЗ). Здесь — демо-черновик без отправки на API.
          </p>
          <Field
            label="Название"
            value={draft.title}
            onChange={(title) => setDraft((d) => ({ ...d, title }))}
          />
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Краткое описание</label>
            <textarea
              className="glass-input mt-1 min-h-[80px] w-full px-4 py-3 text-sm"
              value={draft.shortDescription}
              onChange={(e) => setDraft((d) => ({ ...d, shortDescription: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Тип</label>
              <select
                className="glass-input mt-1 w-full px-4 py-3 text-sm"
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as OpportunityType }))}
              >
                <option value="internship">Стажировка</option>
                <option value="vacancy_junior">Вакансия Junior</option>
                <option value="vacancy_senior">Вакансия Middle+</option>
                <option value="mentorship">Менторство</option>
                <option value="event">Мероприятие</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Формат</label>
              <select
                className="glass-input mt-1 w-full px-4 py-3 text-sm"
                value={draft.workFormat}
                onChange={(e) => setDraft((d) => ({ ...d, workFormat: e.target.value as WorkFormat }))}
              >
                <option value="office">Офис</option>
                <option value="hybrid">Гибрид</option>
                <option value="remote">Удалённо</option>
              </select>
            </div>
          </div>
          <Field
            label="Место (адрес или город)"
            value={draft.locationLabel}
            onChange={(locationLabel) => setDraft((d) => ({ ...d, locationLabel }))}
          />
          <button
            type="button"
            className="rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-3 text-sm font-semibold text-white shadow-lg"
            onClick={() => alert("В демо карточка не отправляется на сервер — подключите API позже.")}
          >
            Сохранить черновик (демо)
          </button>
        </GlassPanel>
      )}

      {tab === "list" && (
        <div className="grid gap-4 md:grid-cols-2">
          {myOpps.map((o: Opportunity) => (
            <GlassPanel key={o.id} className="p-5">
              <p className="text-xs uppercase text-[var(--text-secondary)]">{o.companyName}</p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{o.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{o.shortDescription}</p>
              <Link
                href={`/opportunities/${o.id}`}
                className="mt-4 inline-block text-sm text-[var(--brand-cyan)] hover:underline"
              >
                Просмотр карточки
              </Link>
            </GlassPanel>
          ))}
        </div>
      )}

      {tab === "responses" && (
        <GlassPanel className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Отклики соискателей</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Статусы: принят / отклонён / в резерве — в продакшене через API и уведомления.
          </p>
          <ul className="mt-4 space-y-3">
            {responses.length === 0 && (
              <li className="text-sm text-[var(--text-secondary)]">Нет откликов по вашим карточкам.</li>
            )}
            {responses.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{r.opp?.title}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Соискатель (демо): Алексей Соискатель</p>
                  {r.resumeSnapshot && (
                    <p className="mt-2 line-clamp-3 text-xs text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">Резюме: </span>
                      {r.resumeSnapshot}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-100">
                    Принять
                  </button>
                  <button type="button" className="rounded-lg bg-red-500/15 px-3 py-1 text-xs text-red-100">
                    Отклонить
                  </button>
                  <button type="button" className="rounded-lg bg-amber-500/15 px-3 py-1 text-xs text-amber-100">
                    Резерв
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <input
        className="glass-input mt-1 w-full px-4 py-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

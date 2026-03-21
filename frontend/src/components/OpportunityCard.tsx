'use client';

import type { OpportunityMarkerDTO } from '@/lib/dtos';

type Props = {
  m: OpportunityMarkerDTO;
  favorite: boolean;
  onApply?: () => void;
  applyLoading?: boolean;
  applySuccess?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  VACANCY: 'Вакансия',
  INTERNSHIP: 'Стажировка',
  MENTOR_PROGRAM: 'Менторская программа',
  CAREER_EVENT: 'Карьерное мероприятие',
};

const WORK_FORMAT_LABELS: Record<string, string> = {
  OFFICE: 'Офис',
  HYBRID: 'Гибрид',
  REMOTE: 'Удалённо',
};

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return 'Не указана';
  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `от ${fmt(min)}`;
  return `до ${fmt(max ?? 0)}`;
}

export default function OpportunityCard({ m, favorite, onApply, applyLoading, applySuccess }: Props) {
  return (
    <div
      className={`rounded-2xl border p-3 transition ${
        favorite
          ? 'border-amber-400/40 bg-amber-50/60 dark:border-amber-600/30 dark:bg-amber-950/20'
          : 'border-black/10 bg-white/60 dark:border-white/15 dark:bg-black/25'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              {TYPE_LABELS[m.type] ?? m.type}
            </span>
            {favorite && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                ★ Избранное
              </span>
            )}
          </div>

          <div className="mt-1.5 truncate text-sm font-semibold text-black dark:text-white">
            {m.title}
          </div>

          <div className="mt-0.5 text-xs text-black/60 dark:text-white/60">
            {m.company}
          </div>

          {m.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {m.skills.slice(0, 5).map((skill, i) => (
                <span
                  key={i}
                  className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60"
                >
                  {skill}
                </span>
              ))}
              {m.skills.length > 5 && (
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                  +{m.skills.length - 5}
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/50 dark:text-white/50">
            <span className="font-medium">{formatSalary(m.salaryMin, m.salaryMax)}</span>
            {m.workFormat && (
              <>
                <span>•</span>
                <span>{WORK_FORMAT_LABELS[m.workFormat] ?? m.workFormat}</span>
              </>
            )}
          </div>
        </div>

        {onApply && (
          <div className="flex flex-col items-end gap-2">
            {applySuccess ? (
              <button
                type="button"
                disabled
                className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white opacity-80"
              >
                ✓ Отправлено
              </button>
            ) : (
              <button
                type="button"
                onClick={onApply}
                disabled={applyLoading}
                className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {applyLoading ? 'Отправка…' : 'Откликнуться'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import type { OpportunityMarkerDTO } from '@/lib/dtos';

type Props = {
  m: OpportunityMarkerDTO;
  favorite?: boolean;
};

export default function OpportunityCard({ m, favorite }: Props) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-black/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-black/60 dark:text-white/60">
            {m.type}
          </div>
          <div className="mt-1 truncate text-lg font-semibold text-black dark:text-white">
            {m.title}
          </div>
          <div className="mt-1 text-sm text-black/60 dark:text-white/60">
            {m.company}
          </div>
        </div>
        {favorite ? (
          <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
            Избранное
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {m.skills.slice(0, 6).map((s) => (
          <span
            key={s}
            className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/70 dark:bg-white/10 dark:text-white/70"
          >
            {s}
          </span>
        ))}
        {m.skills.length > 6 ? (
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/70 dark:bg-white/10 dark:text-white/70">
            +{m.skills.length - 6}
          </span>
        ) : null}
      </div>

      {(m.salaryMin || m.salaryMax) && (
        <div className="mt-3 text-sm text-black/70 dark:text-white/70">
          Зарплата:{' '}
          <span className="font-semibold">
            {m.salaryMin ? `${m.salaryMin}` : '—'} - {m.salaryMax ? `${m.salaryMax}` : '—'}
          </span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-black/65 dark:text-white/65">
        {m.workFormat ? (
          <div>
            Формат: <span className="font-semibold">{m.workFormat}</span>
          </div>
        ) : null}
        {m.locationType ? (
          <div>
            Локация: <span className="font-semibold">{m.locationType === 'OFFICE_ADDRESS' ? 'Очно' : 'Город/удалёнка'}</span>
          </div>
        ) : null}
        {m.addressText ? (
          <div>
            Адрес: <span className="font-semibold">{m.addressText}</span>
          </div>
        ) : null}
        {!m.addressText && m.cityText ? (
          <div>
            Город: <span className="font-semibold">{m.cityText}</span>
          </div>
        ) : null}
      </div>

      {m.description ? (
        <p className="mt-3 line-clamp-3 text-sm text-black/65 dark:text-white/65">{m.description}</p>
      ) : null}
    </div>
  );
}


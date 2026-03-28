"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { fetchPublicEmployerProfile, type PublicEmployerProfileApi } from "@/lib/api";
import { EmployerProfileBackLink } from "./EmployerProfileBackLink";
import { navLinkButtonClass } from "@/lib/nav-link-styles";

const PUB_TYPE_LABELS: Record<string, string> = {
  internship: "Стажировка",
  vacancy_junior: "Вакансия Junior",
  vacancy_senior: "Вакансия Middle+",
  mentorship: "Менторство",
  event: "Мероприятие",
};

const PUB_FORMAT_LABELS: Record<string, string> = {
  office: "Офис",
  hybrid: "Гибрид",
  remote: "Удалённо",
};

function EmployerPublicProfileInner() {
  const params = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicEmployerProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterQ, setFilterQ] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFormat, setFilterFormat] = useState("");

  useEffect(() => {
    if (!params.userId) return;
    fetchPublicEmployerProfile(params.userId)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.userId]);

  const typeFilterOptions = useMemo(
    () => [
      { value: "", label: "Все типы" },
      { value: "vacancy_junior", label: "Вакансия Junior" },
      { value: "vacancy_senior", label: "Вакансия Middle+" },
      { value: "internship", label: "Стажировка" },
      { value: "mentorship", label: "Менторство" },
      { value: "event", label: "Мероприятие" },
    ],
    [],
  );

  const formatFilterOptions = useMemo(
    () => [
      { value: "", label: "Любой формат" },
      { value: "office", label: "Офис" },
      { value: "hybrid", label: "Гибрид" },
      { value: "remote", label: "Удалённо" },
    ],
    [],
  );

  const opps = useMemo(() => profile?.opportunities ?? [], [profile]);

  const filteredOpps = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    return opps.filter((o) => {
      if (filterType && o.type !== filterType) return false;
      if (filterFormat && o.workFormat !== filterFormat) return false;
      if (q) {
        const hay = `${o.title} ${o.shortDescription} ${o.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [opps, filterQ, filterType, filterFormat]);

  if (loading) {
    return (
      <GlassPanel className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
      </GlassPanel>
    );
  }

  if (error || !profile) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-[var(--text-primary)]">Компания не найдена</p>
        <Link href="/" className={`${navLinkButtonClass} mt-4 inline-flex`}>
          ← На главную
        </Link>
      </GlassPanel>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Suspense fallback={<Link href="/" className={navLinkButtonClass}>← На главную</Link>}>
        <EmployerProfileBackLink />
      </Suspense>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassPanel className="p-8">
          <div className="flex items-start gap-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-3xl font-bold text-[var(--text-secondary)]">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                profile.companyName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{profile.companyName}</h1>
                {profile.verified && (
                  <span className="status-badge-pill rounded-full border border-emerald-800/35 bg-emerald-200 px-3 py-1 text-xs font-medium text-[#2d1a0e] dark:border-transparent dark:bg-emerald-500/20 dark:!text-emerald-200">
                    Верифицировано
                  </span>
                )}
              </div>
              {profile.industry && (
                <p className="mt-1 text-sm text-[var(--brand-magenta)]">{profile.industry}</p>
              )}
              {profile.inn && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  ИНН: <span className="text-[var(--text-primary)]">{profile.inn}</span>
                </p>
              )}
            </div>
          </div>

          {profile.description && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-[var(--text-secondary)]">О компании</h2>
              <p className="mt-2 whitespace-pre-wrap text-[var(--text-primary)]">{profile.description}</p>
            </div>
          )}

          {profile.website && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-[var(--text-secondary)]">Сайт</h2>
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[var(--brand-cyan)] hover:underline"
              >
                {profile.website}
              </a>
            </div>
          )}
        </GlassPanel>
      </motion.div>

      {opps.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassPanel className="relative z-20 space-y-4 p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Возможности компании</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0 space-y-2 sm:col-span-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="pub-emp-q">
                  Поиск
                </label>
                <input
                  id="pub-emp-q"
                  className="glass-input w-full px-4 py-3 text-sm"
                  placeholder="Название, описание, тег…"
                  value={filterQ}
                  onChange={(e) => setFilterQ(e.target.value)}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="pub-emp-type">
                  Тип
                </label>
                <GlassSelect
                  id="pub-emp-type"
                  value={filterType}
                  onChange={setFilterType}
                  options={typeFilterOptions}
                  className="w-full"
                  buttonClassName="px-4 py-3 text-sm"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <label className="text-xs font-medium text-[var(--text-secondary)]" htmlFor="pub-emp-fmt">
                  Формат
                </label>
                <GlassSelect
                  id="pub-emp-fmt"
                  value={filterFormat}
                  onChange={setFilterFormat}
                  options={formatFilterOptions}
                  className="w-full"
                  buttonClassName="px-4 py-3 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Показано: {filteredOpps.length} из {opps.length}
            </p>
            {filteredOpps.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Нет карточек по выбранным фильтрам.</p>
            ) : (
              <ul className="space-y-3">
                {filteredOpps.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/opportunities/${o.id}`}
                      className="block rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4 transition hover:border-[var(--brand-cyan)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">{o.title}</h3>
                        <span className="shrink-0 rounded-full bg-[var(--glass-bg-strong)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                          {PUB_TYPE_LABELS[o.type] ?? o.type}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{o.shortDescription}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                        <span>{PUB_FORMAT_LABELS[o.workFormat] ?? o.workFormat}</span>
                        <span className="text-[var(--text-primary)]">{o.locationLabel}</span>
                        {o.salaryMin != null && o.salaryMax != null && (
                          <span className="text-[var(--brand-orange)]">
                            {o.salaryMin.toLocaleString("ru-RU")}–{o.salaryMax.toLocaleString("ru-RU")}{" "}
                            {o.currency ?? "₽"}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}

export default EmployerPublicProfileInner;

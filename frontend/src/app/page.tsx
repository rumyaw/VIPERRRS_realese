'use client';

import { useEffect, useState, useCallback } from 'react';
import YandexMap from '@/components/YandexMap';
import OpportunityCard from '@/components/OpportunityCard';
import type { OpportunityMarkerDTO } from '@/lib/dtos';
import { apiGet, apiPost } from '@/lib/api';

type PublicOpportunitiesResponse = {
  items: OpportunityMarkerDTO[];
  meta?: Record<string, unknown>;
};

const YANDEX_API_KEY = process.env.NEXT_PUBLIC_YANDEX_API_KEY ?? '';

const FAVORITES_KEY = 'trumplin_favorites_v1';

// Types for filters
type FilterType = 'ALL' | 'VACANCY' | 'INTERNSHIP' | 'MENTOR_PROGRAM' | 'CAREER_EVENT';
type FilterWorkFormat = 'ALL' | 'OFFICE' | 'HYBRID' | 'REMOTE';

function filterMarkers(
  markers: OpportunityMarkerDTO[],
  filters: {
    skills: string[];
    type: FilterType;
    workFormat: FilterWorkFormat;
  }
): OpportunityMarkerDTO[] {
  return markers.filter((m) => {
    // Filter by type
    if (filters.type !== 'ALL' && m.type !== filters.type) {
      return false;
    }

    // Filter by skills (if any skills specified)
    if (filters.skills.length > 0) {
      const markerSkillsLower = m.skills.map((s) => s.toLowerCase());
      const hasSkill = filters.skills.some((skill) =>
        markerSkillsLower.some((ms) => ms.includes(skill.toLowerCase()))
      );
      if (!hasSkill) return false;
    }

    return true;
  });
}

export default function HomePage() {
  const [city, setCity] = useState('Москва');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [markers, setMarkers] = useState<OpportunityMarkerDTO[]>([]);
  const [allMarkers, setAllMarkers] = useState<OpportunityMarkerDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OpportunityMarkerDTO | null>(null);
  const [hovered, setHovered] = useState<OpportunityMarkerDTO | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  // Filters
  const [skillsFilter, setSkillsFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [workFormatFilter, setWorkFormatFilter] = useState<FilterWorkFormat>('ALL');

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  // Reload favorites from localStorage
  const reloadFavorites = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setFavoriteIds(new Set(arr.filter((x) => typeof x === 'string')));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    reloadFavorites();
  }, [reloadFavorites]);

  // Load opportunities
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const path = '/api/public/opportunities';
        const resp = await apiGet<PublicOpportunitiesResponse>(path, { city });
        setAllMarkers(resp.items ?? []);
        setMarkers(resp.items ?? []);
      } catch {
        setAllMarkers([]);
        setMarkers([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [city]);

  // Apply filters when they change
  useEffect(() => {
    const skills = skillsFilter
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    
    const filtered = filterMarkers(allMarkers, {
      skills,
      type: typeFilter,
      workFormat: workFormatFilter,
    });
    
    setMarkers(filtered);
    
    // Clear selection if selected item is filtered out
    if (selected && !filtered.find((m) => m.id === selected.id)) {
      setSelected(null);
    }
  }, [allMarkers, skillsFilter, typeFilter, workFormatFilter, selected]);

  const toggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const applyToOpportunity = async (opportunityId: string) => {
    setApplyLoading(true);
    setApplyError(null);
    setApplySuccess(false);
    try {
      await apiPost('/api/applicant/applications', { opportunityId });
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 3000);
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : 'Ошибка отклика');
    } finally {
      setApplyLoading(false);
    }
  };

  const card = selected ?? (viewMode === 'map' ? hovered : null);
  const favoritesForCard = card ? favoriteIds.has(card.id) : false;

  const typeLabels: Record<FilterType, string> = {
    ALL: 'Все типы',
    VACANCY: 'Вакансии',
    INTERNSHIP: 'Стажировки',
    MENTOR_PROGRAM: 'Менторские программы',
    CAREER_EVENT: 'Карьерные мероприятия',
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-gradient-to-b from-white via-white to-black/0 dark:from-black dark:via-black">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <section className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black dark:text-white">Трамплин</h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Вакансии, стажировки, менторские программы и события — на карте и в ленте.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 w-44 rounded-full border border-black/10 bg-white/70 px-4 text-sm outline-none backdrop-blur focus:ring-2 focus:ring-indigo-500/30 dark:border-white/15 dark:bg-black/30 dark:text-white"
              aria-label="City"
            />
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`h-10 rounded-full border px-4 text-sm backdrop-blur transition ${
                viewMode === 'map'
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'border-black/10 bg-white/50 text-black/70 hover:bg-white/70 dark:border-white/15 dark:bg-black/25 dark:text-white/70'
              }`}
            >
              Карта
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-10 rounded-full border px-4 text-sm backdrop-blur transition ${
                viewMode === 'list'
                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'border-black/10 bg-white/50 text-black/70 hover:bg-white/70 dark:border-white/15 dark:bg-black/25 dark:text-white/70'
              }`}
            >
              Лента
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="md:col-span-3">
            {viewMode === 'map' ? (
              <div className="relative">
                <YandexMap
                  apiKey={YANDEX_API_KEY}
                  markers={markers}
                  favoriteIds={favoriteIds}
                  onSelect={(m) => setSelected(m)}
                  onHover={(m) => setHovered(m)}
                  className="h-[440px]"
                />

                {card && (
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/80 p-4 shadow-lg backdrop-blur dark:bg-black/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-black/60 dark:text-white/60">{typeLabels[card.type as FilterType] || card.type}</div>
                        <div className="mt-1 truncate text-lg font-semibold text-black dark:text-white">
                          {card.title}
                        </div>
                        <div className="mt-1 text-sm text-black/60 dark:text-white/60">{card.company}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(card.id)}
                          className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-black/40 dark:hover:bg-black/55"
                        >
                          {favoritesForCard ? 'Убрать' : 'В избранное'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="text-xs font-semibold text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                        >
                          Закрыть
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <OpportunityCard 
                        m={card} 
                        favorite={favoritesForCard} 
                        onApply={() => void applyToOpportunity(card.id)}
                        applyLoading={applyLoading}
                        applySuccess={applySuccess}
                      />
                    </div>
                    {applyError && (
                      <div className="mt-2 text-sm font-medium text-rose-600">{applyError}</div>
                    )}
                  </div>
                )}

                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/30 text-black/70 backdrop-blur dark:bg-black/30 dark:text-white/70">
                    Загрузка…
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/15 dark:bg-black/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-black/70 dark:text-white/70">Лента</div>
                    <div className="mt-1 text-xs text-black/50 dark:text-white/50">{markers.length} шт</div>
                  </div>
                  {card ? (
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold text-black/70 backdrop-blur hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-white/70 dark:hover:bg-black/55"
                    >
                      Сбросить
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 space-y-3">
                  {markers.length === 0 ? (
                    <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-sm text-black/60 dark:border-white/15 dark:bg-black/25 dark:text-white/60">
                      Нет подходящих вакансий для &ldquo;{city}&rdquo;.
                    </div>
                  ) : (
                    markers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelected(m)}
                        className="cursor-pointer"
                      >
                        <OpportunityCard 
                          m={m} 
                          favorite={favoriteIds.has(m.id)}
                          onApply={() => void applyToOpportunity(m.id)}
                          applyLoading={applyLoading}
                          applySuccess={applySuccess}
                        />
                      </div>
                    ))
                  )}
                </div>

                {selected && (
                  <div className="mt-4">
                    <OpportunityCard 
                      m={selected} 
                      favorite={favoriteIds.has(selected.id)}
                      onApply={() => void applyToOpportunity(selected.id)}
                      applyLoading={applyLoading}
                      applySuccess={applySuccess}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/15 dark:bg-black/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/70 dark:text-white/70">Фильтры</div>
                  <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                    {markers.length} из {allMarkers.length} шт
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <div className="text-xs font-medium text-black/60 dark:text-white/60">Навыки</div>
                  <input
                    value={skillsFilter}
                    onChange={(e) => setSkillsFilter(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/60 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                    placeholder="React, Go, SQL…"
                  />
                  <div className="mt-1 text-xs text-black/40 dark:text-white/40">Через запятую</div>
                </label>
                
                <label className="block">
                  <div className="text-xs font-medium text-black/60 dark:text-white/60">Тип</div>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as FilterType)}
                    className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/60 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                  >
                    <option value="ALL">Все типы</option>
                    <option value="VACANCY">Вакансии</option>
                    <option value="INTERNSHIP">Стажировки</option>
                    <option value="MENTOR_PROGRAM">Менторские программы</option>
                    <option value="CAREER_EVENT">Карьерные мероприятия</option>
                  </select>
                </label>
                
                <label className="block">
                  <div className="text-xs font-medium text-black/60 dark:text-white/60">Формат работы</div>
                  <select
                    value={workFormatFilter}
                    onChange={(e) => setWorkFormatFilter(e.target.value as FilterWorkFormat)}
                    className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/60 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                  >
                    <option value="ALL">Любой</option>
                    <option value="OFFICE">Офис</option>
                    <option value="HYBRID">Гибрид</option>
                    <option value="REMOTE">Удалённо</option>
                  </select>
                </label>
                
                <button
                  type="button"
                  onClick={() => {
                    setSkillsFilter('');
                    setTypeFilter('ALL');
                    setWorkFormatFilter('ALL');
                  }}
                  className="h-10 w-full rounded-xl border border-black/10 bg-white/60 px-4 text-sm font-semibold text-black/70 backdrop-blur hover:bg-white/80 dark:border-white/15 dark:bg-black/25 dark:text-white/70 dark:hover:bg-black/35"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/15 dark:bg-black/30">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-black/70 dark:text-white/70">Возможности</div>
                <div className="text-xs font-semibold text-black/50 dark:text-white/50">{markers.length} шт</div>
              </div>

              <div className="mt-3 space-y-3 max-h-[400px] overflow-y-auto">
                {markers.length === 0 ? (
                  <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-sm text-black/60 dark:border-white/15 dark:bg-black/25 dark:text-white/60">
                    Нет подходящих вакансий.
                  </div>
                ) : (
                  markers.slice(0, 10).map((m) => (
                    <div key={m.id} onClick={() => setSelected(m)} className="cursor-pointer">
                      <OpportunityCard m={m} favorite={favoriteIds.has(m.id)} />
                    </div>
                  ))
                )}
                {markers.length > 10 && (
                  <div className="text-center text-xs text-black/50 dark:text-white/50">
                    Показаны 10 из {markers.length}. Используйте карту или ленту для просмотра всех.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

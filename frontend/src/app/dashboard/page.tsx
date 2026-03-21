'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import OpportunityCard from '@/components/OpportunityCard';
import type { OpportunityMarkerDTO } from '@/lib/dtos';

type MeResponse = {
  id: string;
  email: string;
  role: 'ADMIN' | 'CURATOR' | 'EMPLOYER' | 'APPLICANT';
  displayName: string;
  status: string;
  company?: { verificationStatus?: string };
};

type EmployerOpportunityDTO = OpportunityMarkerDTO & {
  status: string;
  workFormat: string;
  locationType: string;
  addressText?: string | null;
  cityText?: string | null;
};

type ApplicantApplicationDTO = {
  id: string;
  opportunityId: string;
  title: string;
  type: string;
  company: string;
  status: string;
  createdAt: string;
  workFormat: string;
  locationType: string;
  addressText?: string | null;
  cityText?: string | null;
  lat: number;
  lng: number;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
};

type ApplicantContactDTO = {
  targetUserId: string;
  fullName: string;
  createdAt: string;
};

type ApplicantRecommendationInboxDTO = {
  id: string;
  fromUserId: string;
  fromName: string;
  opportunityId: string;
  title: string;
  company: string;
  workFormat: string;
  locationType: string;
  addressText?: string | null;
  cityText?: string | null;
  lat: number;
  lng: number;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  message?: string;
  createdAt: string;
};

type OpportunityType = 'VACANCY' | 'INTERNSHIP' | 'MENTOR_PROGRAM' | 'CAREER_EVENT';
type WorkFormat = 'OFFICE' | 'HYBRID' | 'REMOTE';

type CuratorCompanyPendingDTO = {
  id: string;
  ownerUserId: string;
  name: string;
  description?: string | null;
  verificationStatus: string;
  createdAt: string;
};

type CuratorOpportunityPendingDTO = {
  id: string;
  title: string;
  type: string;
  workFormat: string;
  locationType: string;
  status: string;
  company: string;
  createdAt: string;
};

const FAVORITES_KEY = 'trumplin_favorites_v1';

function toMarkerFromApplicant(app: ApplicantApplicationDTO): OpportunityMarkerDTO {
  return {
    id: app.opportunityId,
    title: app.title,
    company: app.company,
    type: app.type,
    workFormat: app.workFormat,
    locationType: app.locationType,
    addressText: app.addressText,
    cityText: app.cityText,
    skills: app.skills ?? [],
    lat: app.lat,
    lng: app.lng,
    salaryMin: app.salaryMin,
    salaryMax: app.salaryMax,
  };
}

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());

  const [employerOpportunities, setEmployerOpportunities] = useState<OpportunityMarkerDTO[]>([]);
  const [applicantApplications, setApplicantApplications] = useState<OpportunityMarkerDTO[]>([]);
  const [applicantContacts, setApplicantContacts] = useState<ApplicantContactDTO[]>([]);
  const [applicantInbox, setApplicantInbox] = useState<ApplicantRecommendationInboxDTO[]>([]);
  const [recOpportunityId, setRecOpportunityId] = useState('');
  const [recTargetUserId, setRecTargetUserId] = useState('');
  const [recMessage, setRecMessage] = useState('');
  const [recSending, setRecSending] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const [curatorPendingCompanies, setCuratorPendingCompanies] = useState<CuratorCompanyPendingDTO[]>([]);
  const [curatorPendingOpportunities, setCuratorPendingOpportunities] = useState<CuratorOpportunityPendingDTO[]>([]);

  // Employer opportunity creation form (MVP: locationType=CITY).
  const [empTitle, setEmpTitle] = useState('');
  const [empDescription, setEmpDescription] = useState('');
  const [empType, setEmpType] = useState<OpportunityType>('VACANCY');
  const [empWorkFormat, setEmpWorkFormat] = useState<WorkFormat>('REMOTE');
  const [empCityText, setEmpCityText] = useState('Москва');
  const [empSkillsText, setEmpSkillsText] = useState('Go, PostgreSQL, SQL');
  const [empSalaryMin, setEmpSalaryMin] = useState<string>('');
  const [empSalaryMax, setEmpSalaryMax] = useState<string>('');
  const [empCreateLoading, setEmpCreateLoading] = useState(false);
  const [empCreateError, setEmpCreateError] = useState<string | null>(null);

  // Applicant privacy (defaults match DB defaults).
  const [privHideApplications, setPrivHideApplications] = useState(false);
  const [privHideResume, setPrivHideResume] = useState(true);
  const [privAllowNetworkProfiles, setPrivAllowNetworkProfiles] = useState(true);
  const [privSaving, setPrivSaving] = useState(false);
  const [privError, setPrivError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await apiGet<MeResponse>('/api/me');
        setMe(resp);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
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
    if (!me) return;

    const run = async () => {
      try {
        if (me.role === 'EMPLOYER') {
          const resp = await apiGet<{ items: EmployerOpportunityDTO[] }>('/api/employer/opportunities');
          setEmployerOpportunities(
            (resp.items ?? []).map((x) => ({
              id: x.id,
              title: x.title,
              company: x.company,
              type: x.type,
              skills: x.skills ?? [],
              lat: x.lat,
              lng: x.lng,
              salaryMin: x.salaryMin,
              salaryMax: x.salaryMax,
            }))
          );
        }
        if (me.role === 'APPLICANT') {
          const apps = await apiGet<{ items: ApplicantApplicationDTO[] }>('/api/applicant/applications');
          setApplicantApplications((apps.items ?? []).map(toMarkerFromApplicant));

          const contacts = await apiGet<{ items: ApplicantContactDTO[] }>('/api/applicant/contacts');
          setApplicantContacts(contacts.items ?? []);

          const inbox = await apiGet<{ items: ApplicantRecommendationInboxDTO[] }>(
            '/api/applicant/recommendations/inbox'
          );
          setApplicantInbox(inbox.items ?? []);
        }
        if (me.role === 'ADMIN' || me.role === 'CURATOR') {
          const companies = await apiGet<{ items: CuratorCompanyPendingDTO[] }>(`/api/curator/companies/pending`);
          setCuratorPendingCompanies(companies.items ?? []);
          const opps = await apiGet<{ items: CuratorOpportunityPendingDTO[] }>(`/api/curator/opportunities/pending`);
          setCuratorPendingOpportunities(opps.items ?? []);
        }
      } catch {
        // Keep dashboard usable even if some role endpoints fail.
      }
    };

    run();
  }, [me]);

  const reloadEmployerOpportunities = async () => {
    const resp = await apiGet<{ items: EmployerOpportunityDTO[] }>('/api/employer/opportunities');
    setEmployerOpportunities(
      (resp.items ?? []).map((x) => ({
        id: x.id,
        title: x.title,
        company: x.company,
        type: x.type,
        skills: x.skills ?? [],
        lat: x.lat,
        lng: x.lng,
        salaryMin: x.salaryMin,
        salaryMax: x.salaryMax,
      }))
    );
  };

  const reloadCuratorPending = async () => {
    const companies = await apiGet<{ items: CuratorCompanyPendingDTO[] }>(`/api/curator/companies/pending`);
    setCuratorPendingCompanies(companies.items ?? []);
    const opps = await apiGet<{ items: CuratorOpportunityPendingDTO[] }>(`/api/curator/opportunities/pending`);
    setCuratorPendingOpportunities(opps.items ?? []);
  };

  const createEmployerOpportunity = async () => {
    if (!me) return;
    setEmpCreateError(null);
    setEmpCreateLoading(true);
    try {
      const skills = empSkillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (skills.length === 0) {
        setEmpCreateError('Добавьте хотя бы один навык в поле Skills.');
        return;
      }

      await apiPost('/api/employer/opportunities', {
        title: empTitle,
        description: empDescription,
        organizerName: me.displayName,
        type: empType,
        workFormat: empWorkFormat,
        locationType: 'CITY',
        cityText: empCityText,
        skills,
        salaryMin: empSalaryMin.trim() ? Number(empSalaryMin) : undefined,
        salaryMax: empSalaryMax.trim() ? Number(empSalaryMax) : undefined,
      });

      await reloadEmployerOpportunities();
      setEmpTitle('');
      setEmpDescription('');
      setEmpSalaryMin('');
      setEmpSalaryMax('');
    } catch (err: unknown) {
      setEmpCreateError(err instanceof Error ? err.message : 'Ошибка создания возможности');
    } finally {
      setEmpCreateLoading(false);
    }
  };

  const [curatorActionLoading, setCuratorActionLoading] = useState(false);

  const verifyCompany = async (companyId: string, status: 'APPROVED' | 'REJECTED') => {
    setCuratorActionLoading(true);
    try {
      await apiPatch(`/api/curator/companies/${companyId}/verification`, {
        status,
        comment: status === 'APPROVED' ? 'Одобрено к публикации' : 'Отклонено',
      });
      await reloadCuratorPending();
    } finally {
      setCuratorActionLoading(false);
    }
  };

  const verifyOpportunity = async (
    opportunityId: string,
    status: 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'CLOSED'
  ) => {
    setCuratorActionLoading(true);
    try {
      await apiPatch(`/api/curator/opportunities/${opportunityId}/status`, { status });
      await reloadCuratorPending();
    } finally {
      setCuratorActionLoading(false);
    }
  };

  const savePrivacy = async () => {
    if (!me) return;
    setPrivSaving(true);
    setPrivError(null);
    try {
      await apiPatch('/api/applicant/privacy', {
        hideApplications: privHideApplications,
        hideResume: privHideResume,
        allowNetworkProfiles: privAllowNetworkProfiles,
      });
    } catch (err: unknown) {
      setPrivError(err instanceof Error ? err.message : 'Ошибка сохранения приватности');
    } finally {
      setPrivSaving(false);
    }
  };

  const sendRecommendation = async () => {
    setRecError(null);
    if (!recOpportunityId || !recTargetUserId) {
      setRecError('Выбери вакансию и контакт для рекомендации.');
      return;
    }
    setRecSending(true);
    try {
      await apiPost('/api/applicant/recommendations', {
        opportunityId: recOpportunityId,
        targetUserId: recTargetUserId,
        message: recMessage,
      });
      const inbox = await apiGet<{ items: ApplicantRecommendationInboxDTO[] }>(
        '/api/applicant/recommendations/inbox'
      );
      setApplicantInbox(inbox.items ?? []);
      setRecMessage('');
    } catch (err: unknown) {
      setRecError(err instanceof Error ? err.message : 'Ошибка отправки рекомендации');
    } finally {
      setRecSending(false);
    }
  };

  const onLogout = async () => {
    try {
      await apiPost('/api/auth/logout', {});
    } finally {
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-black/30">
          Загрузка кабинета…
        </div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-medium text-rose-700 dark:text-rose-300">
          {error ?? 'Не удалось загрузить кабинет'}
        </div>
      </div>
    );
  }

  const employerVerified = me.role === 'EMPLOYER' && me.company?.verificationStatus === 'APPROVED';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/30 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold text-black/60 dark:text-white/60">Профиль</div>
          <div className="mt-1 text-lg font-semibold text-black dark:text-white">{me.displayName}</div>
          <div className="mt-1 text-sm text-black/60 dark:text-white/60">{me.email}</div>
          <div className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-300">Роль: {me.role}</div>
          {me.company?.verificationStatus ? (
            <div className="mt-1 text-sm text-black/60 dark:text-white/60">
              Верификация компании: <span className="font-semibold">{me.company.verificationStatus}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-black/80 backdrop-blur hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-white/85"
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        {me.role === 'EMPLOYER' ? (
          <>
            <div className="md:col-span-2 rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/30">
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">Мои возможности</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">
                {employerOpportunities.length} шт. (для полной версии добавим CRUD/редактирование и создание карточек).
              </div>
              <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-black/25">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-black/70 dark:text-white/70">Создать возможность</div>
                    <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                      MVP: тип/CITY/скиллы/зарплата. Доступ: {employerVerified ? 'разрешено' : 'ждёт верификации'}.
                    </div>
                  </div>
                  {empCreateError ? (
                    <div className="text-sm font-medium text-rose-600">{empCreateError}</div>
                  ) : null}
                </div>

                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void createEmployerOpportunity();
                  }}
                >
                  <label className="block">
                    <div className="text-xs font-medium text-black/60 dark:text-white/60">Название</div>
                    <input
                      value={empTitle}
                      onChange={(e) => setEmpTitle(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                      placeholder="Go Backend Engineer"
                      required
                      disabled={!employerVerified || empCreateLoading}
                    />
                  </label>

                  <label className="block">
                    <div className="text-xs font-medium text-black/60 dark:text-white/60">Описание</div>
                    <textarea
                      value={empDescription}
                      onChange={(e) => setEmpDescription(e.target.value)}
                      className="mt-1 h-24 w-full resize-none rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                      placeholder="Короткое описание роли и требований…"
                      required
                      disabled={!employerVerified || empCreateLoading}
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-medium text-black/60 dark:text-white/60">Тип</div>
                      <select
                        value={empType}
                        onChange={(e) => setEmpType(e.target.value as OpportunityType)}
                        className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                        disabled={!employerVerified || empCreateLoading}
                      >
                        <option value="VACANCY">Вакансия</option>
                        <option value="INTERNSHIP">Стажировка</option>
                        <option value="MENTOR_PROGRAM">Менторская программа</option>
                        <option value="CAREER_EVENT">Карьерное мероприятие</option>
                      </select>
                    </label>

                    <label className="block">
                      <div className="text-xs font-medium text-black/60 dark:text-white/60">Формат работы</div>
                      <select
                        value={empWorkFormat}
                        onChange={(e) => setEmpWorkFormat(e.target.value as WorkFormat)}
                        className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                        disabled={!employerVerified || empCreateLoading}
                      >
                        <option value="REMOTE">Удаленно</option>
                        <option value="HYBRID">Гибрид</option>
                        <option value="OFFICE">Офис</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <div className="text-xs font-medium text-black/60 dark:text-white/60">Город</div>
                    <input
                      value={empCityText}
                      onChange={(e) => setEmpCityText(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                      placeholder="Москва"
                      disabled={!employerVerified || empCreateLoading}
                      required
                    />
                  </label>

                  <label className="block">
                    <div className="text-xs font-medium text-black/60 dark:text-white/60">Навыки (через запятую)</div>
                    <input
                      value={empSkillsText}
                      onChange={(e) => setEmpSkillsText(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                      placeholder="Go, SQL, Docker"
                      disabled={!employerVerified || empCreateLoading}
                      required
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-medium text-black/60 dark:text-white/60">ЗП min (опц.)</div>
                      <input
                        value={empSalaryMin}
                        onChange={(e) => setEmpSalaryMin(e.target.value)}
                        type="number"
                        className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                        disabled={!employerVerified || empCreateLoading}
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs font-medium text-black/60 dark:text-white/60">ЗП max (опц.)</div>
                      <input
                        value={empSalaryMax}
                        onChange={(e) => setEmpSalaryMax(e.target.value)}
                        type="number"
                        className="mt-1 h-10 w-full rounded-xl border border-black/10 bg-white/70 px-4 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                        disabled={!employerVerified || empCreateLoading}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!employerVerified || empCreateLoading}
                    className="h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {empCreateLoading ? 'Создаю…' : 'Создать'}
                  </button>
                </form>
              </div>

              <div className="mt-4 space-y-3">
                {employerOpportunities.length === 0 ? (
                  <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-sm text-black/60 dark:border-white/15 dark:bg-black/25 dark:text-white/60">
                    Нет опубликованных возможностей или произошла ошибка загрузки.
                  </div>
                ) : (
                  employerOpportunities.map((m) => (
                    <OpportunityCard key={m.id} m={m} favorite={favoriteIds.has(m.id)} />
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/30">
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">Отклики</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">Подключим список откликов и управление статусами дальше.</div>
            </div>
          </>
        ) : null}

        {me.role === 'APPLICANT' ? (
          <>
            <div className="md:col-span-2 rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/30">
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">Профиль соискателя</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">История откликов и настройки приватности подключим дальше (сейчас — список откликов).</div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/15 dark:bg-black/25">
                <div className="text-sm font-semibold text-black/70 dark:text-white/70">Приватность</div>
                {privError ? <div className="mt-2 text-sm font-medium text-rose-600">{privError}</div> : null}
                <div className="mt-3 space-y-3">
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-black/70 dark:text-white/70">
                    <span>Скрыть отклики</span>
                    <input
                      type="checkbox"
                      checked={privHideApplications}
                      onChange={(e) => setPrivHideApplications(e.target.checked)}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-black/70 dark:text-white/70">
                    <span>Скрыть резюме</span>
                    <input
                      type="checkbox"
                      checked={privHideResume}
                      onChange={(e) => setPrivHideResume(e.target.checked)}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-black/70 dark:text-white/70">
                    <span>Открыть профиль для сети</span>
                    <input
                      type="checkbox"
                      checked={privAllowNetworkProfiles}
                      onChange={(e) => setPrivAllowNetworkProfiles(e.target.checked)}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void savePrivacy()}
                  disabled={privSaving}
                  className="mt-4 h-10 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                >
                  {privSaving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {applicantApplications.length === 0 ? (
                  <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-sm text-black/60 dark:border-white/15 dark:bg-black/25 dark:text-white/60">
                    Пока нет откликов.
                  </div>
                ) : (
                  applicantApplications.map((m) => (
                    <OpportunityCard key={m.id} m={m} favorite={favoriteIds.has(m.id)} />
                  ))
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/30">
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">Контакты</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">Нетворкинг + рекомендации вакансий между соискателями.</div>
              <div className="mt-3 space-y-2">
                {applicantContacts.length === 0 ? (
                  <div className="text-sm text-black/60 dark:text-white/60">Контактов пока нет.</div>
                ) : (
                  applicantContacts.map((c) => (
                    <div key={c.targetUserId} className="rounded-xl border border-black/10 bg-white/60 p-3 text-sm text-black/70 dark:border-white/15 dark:bg-black/25 dark:text-white/70">
                      {c.fullName}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-black/25">
                <div className="text-sm font-semibold text-black/70 dark:text-white/70">Рекомендовать вакансию контакту</div>
                {recError ? (
                  <div className="mt-2 text-sm font-medium text-rose-600">{recError}</div>
                ) : null}
                <div className="mt-3 space-y-2">
                  <select
                    value={recOpportunityId}
                    onChange={(e) => setRecOpportunityId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                  >
                    <option value="">Выбери вакансию</option>
                    {applicantApplications.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.company})
                      </option>
                    ))}
                  </select>
                  <select
                    value={recTargetUserId}
                    onChange={(e) => setRecTargetUserId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                  >
                    <option value="">Выбери контакт</option>
                    {applicantContacts.map((c) => (
                      <option key={c.targetUserId} value={c.targetUserId}>
                        {c.fullName}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={recMessage}
                    onChange={(e) => setRecMessage(e.target.value)}
                    placeholder="Комментарий к рекомендации (опционально)"
                    className="h-20 w-full resize-none rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none dark:border-white/15 dark:bg-black/25 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => void sendRecommendation()}
                    disabled={recSending}
                    className="h-10 w-full rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {recSending ? 'Отправка…' : 'Рекомендовать'}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-black/25">
                <div className="text-sm font-semibold text-black/70 dark:text-white/70">Мне рекомендовали</div>
                <div className="mt-3 space-y-2">
                  {applicantInbox.length === 0 ? (
                    <div className="text-sm text-black/60 dark:text-white/60">Пока рекомендаций нет.</div>
                  ) : (
                    applicantInbox.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/15 dark:bg-black/20"
                      >
                        <div className="text-xs text-black/60 dark:text-white/60">От: {r.fromName}</div>
                        <div className="mt-1 text-sm font-semibold text-black/80 dark:text-white/80">
                          {r.title} — {r.company}
                        </div>
                        {r.message ? (
                          <div className="mt-1 text-xs text-black/60 dark:text-white/60">{r.message}</div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {(me.role === 'ADMIN' || me.role === 'CURATOR') ? (
          <>
            <div className="md:col-span-2 rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/30">
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">Модерация и верификация</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">
                Компаний на модерации: {curatorPendingCompanies.length}. Возможностей на модерации: {curatorPendingOpportunities.length}.
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-black/25">
                  <div className="text-sm font-semibold text-black/70 dark:text-white/70">Компании PENDING</div>
                  <div className="mt-2 space-y-2">
                    {curatorPendingCompanies.slice(0, 6).map((c) => (
                      <div key={c.id} className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-black/25">
                        <div className="text-sm font-semibold text-black/70 dark:text-white/70">{c.name}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void verifyCompany(c.id, 'APPROVED')}
                            disabled={curatorActionLoading}
                            className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 disabled:opacity-60"
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            onClick={() => void verifyCompany(c.id, 'REJECTED')}
                            disabled={curatorActionLoading}
                            className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 disabled:opacity-60"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                    {curatorPendingCompanies.length === 0 ? (
                      <div className="text-sm text-black/60 dark:text-white/60">Пусто.</div>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-black/25">
                  <div className="text-sm font-semibold text-black/70 dark:text-white/70">Возможности PENDING</div>
                  <div className="mt-2 space-y-2">
                    {curatorPendingOpportunities.slice(0, 6).map((o) => (
                      <div key={o.id} className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-black/25">
                        <div className="text-sm font-semibold text-black/70 dark:text-white/70">{o.title}</div>
                        <div className="mt-1 text-xs text-black/55 dark:text-white/55">{o.company}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void verifyOpportunity(o.id, 'APPROVED')}
                            disabled={curatorActionLoading}
                            className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 disabled:opacity-60"
                          >
                            Одобрить
                          </button>
                          <button
                            type="button"
                            onClick={() => void verifyOpportunity(o.id, 'REJECTED')}
                            disabled={curatorActionLoading}
                            className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 disabled:opacity-60"
                          >
                            Отклонить
                          </button>
                        </div>
                      </div>
                    ))}
                    {curatorPendingOpportunities.length === 0 ? (
                      <div className="text-sm text-black/60 dark:text-white/60">Пусто.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-black/30">
              <div className="text-sm font-semibold text-black/70 dark:text-white/70">Пользователи</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">Управление статусами и данными.</div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}


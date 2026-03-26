"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { JOB_SEARCH_LABELS } from "@/lib/profile-defaults";
import { cn } from "@/lib/cn";
import type { ApplicantProfile, JobSearchStatus } from "@/lib/types";
import {
  updateApplicantPrivacy,
  updateApplicantProfile,
} from "@/lib/api";
import { useToast } from "@/hooks/useToast";

const tabs = [
  { id: "profile", label: "Профиль" },
  { id: "resume", label: "Резюме" },
  { id: "contacts", label: "Контакты" },
  { id: "privacy", label: "Приватность" },
] as const;


type TabId = (typeof tabs)[number]["id"];

function profileCompletion(p: ApplicantProfile) {
  let score = 0;
  const r = p.resume;
  const checks = [
    p.fullName.length > 2,
    p.university.length > 1,
    p.courseOrYear.length > 0,
    p.skills.length > 0,
    p.bio.length > 10,
    p.repoLinks.length > 0,
    !!p.avatarDataUrl,
    r.headline.length > 3,
    r.summary.length > 20,
    r.experience.length > 15,
    r.education.length > 5,
  ];
  checks.forEach((c) => {
    if (c) score += 1;
  });
  return Math.round((score / checks.length) * 100);
}

export function ApplicantCabinet() {
  const { user, updateApplicant } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>("profile");
  const profile = user?.applicant;
  const [apiError, setApiError] = useState<string | null>(null);

  if (!profile) return null;

  const pct = profileCompletion(profile);

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
                ? "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-purple)_70%,var(--brand-cyan)),var(--brand-magenta))] text-white shadow-md"
                : "glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid gap-6 lg:grid-cols-[280px_1fr]"
        >
          <GlassPanel className="p-6 text-center">
            <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              {profile.avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-4xl text-[var(--text-secondary)]">
                  {user.displayName.slice(0, 1)}
                </div>
              )}
            </div>
            <label className="mt-4 inline-block cursor-pointer rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]">
              Загрузить фото
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateApplicant({ avatarDataUrl: String(reader.result) });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{user.email}</p>

            <div className="mt-6 text-left">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Статус поиска работы
              </label>
              <select
                className="glass-select mt-2 w-full px-3 py-2.5 text-sm"
                value={profile.jobSearchStatus}
                onChange={(e) =>
                  updateApplicant({ jobSearchStatus: e.target.value as JobSearchStatus })
                }
              >
                {(Object.keys(JOB_SEARCH_LABELS) as JobSearchStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {JOB_SEARCH_LABELS[k]}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Виден вам и (при открытом профиле) контактам для рекомендаций.
              </p>
            </div>

            <div className="mt-6 text-left">
              <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                <span>Заполнение профиля</span>
                <span>{pct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--glass-bg)]">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#8b5cf6,#e6007e)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-4 p-6">
            <Field
              label="ФИО"
              value={profile.fullName}
              onChange={(v) => updateApplicant({ fullName: v })}
            />
            <Field
              label="Вуз"
              value={profile.university}
              onChange={(v) => updateApplicant({ university: v })}
            />
            <Field
              label="Курс / год выпуска"
              value={profile.courseOrYear}
              onChange={(v) => updateApplicant({ courseOrYear: v })}
            />
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Навыки (через запятую)</label>
              <input
                className="glass-input mt-1 w-full px-4 py-3 text-sm"
                value={profile.skills.join(", ")}
                onChange={(e) =>
                  updateApplicant({
                    skills: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">О себе</label>
              <textarea
                className="glass-input mt-1 min-h-[100px] w-full px-4 py-3 text-sm"
                value={profile.bio}
                onChange={(e) => updateApplicant({ bio: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Ссылки на репозитории (по одной в строке)</label>
              <textarea
                className="glass-input mt-1 min-h-[72px] w-full px-4 py-3 text-sm"
                value={profile.repoLinks.join("\n")}
                onChange={(e) =>
                  updateApplicant({
                    repoLinks: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Резюме оформляется во вкладке «Резюме».
            </p>
            <button
              type="button"
              onClick={() =>
                void updateApplicantProfile({
                  fullName: profile.fullName,
                  university: profile.university,
                  courseOrYear: profile.courseOrYear,
                  skills: profile.skills,
                  bio: profile.bio,
                  repoLinks: profile.repoLinks,
                  avatarDataUrl: profile.avatarDataUrl,
                  jobSearchStatus: profile.jobSearchStatus,
                  resume: profile.resume as unknown as Record<string, unknown>,
                })
                  .then(() => showToast("Профиль успешно обновлён", "success"))
                  .catch((e) => {
                    const msg = e instanceof Error ? e.message : "Не удалось сохранить профиль";
                    setApiError(msg);
                    showToast(msg, "error");
                  })
              }
              className="rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2 text-sm font-semibold text-white"
            >
              Сохранить профиль
            </button>
          </GlassPanel>
        </motion.div>
      )}

      {tab === "resume" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <GlassPanel className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Резюме</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Сформируйте структурированное резюме — при отклике на вакансию работодателю уходит
              снимок этих полей вместе с контактами из профиля.
            </p>
            <Field
              label="Желаемая позиция (заголовок)"
              value={profile.resume.headline}
              onChange={(v) => updateApplicant({ resume: { ...profile.resume, headline: v } })}
            />
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Краткое резюме (summary)</label>
              <textarea
                className="glass-input mt-1 min-h-[100px] w-full px-4 py-3 text-sm"
                value={profile.resume.summary}
                onChange={(e) =>
                  updateApplicant({ resume: { ...profile.resume, summary: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Опыт и проекты</label>
              <textarea
                className="glass-input mt-1 min-h-[120px] w-full px-4 py-3 text-sm"
                value={profile.resume.experience}
                onChange={(e) =>
                  updateApplicant({ resume: { ...profile.resume, experience: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Образование</label>
              <textarea
                className="glass-input mt-1 min-h-[72px] w-full px-4 py-3 text-sm"
                value={profile.resume.education}
                onChange={(e) =>
                  updateApplicant({ resume: { ...profile.resume, education: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Языки</label>
              <input
                className="glass-input mt-1 w-full px-4 py-3 text-sm"
                value={profile.resume.languages}
                onChange={(e) =>
                  updateApplicant({ resume: { ...profile.resume, languages: e.target.value } })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Сертификаты и курсы</label>
              <textarea
                className="glass-input mt-1 min-h-[64px] w-full px-4 py-3 text-sm"
                value={profile.resume.certifications}
                onChange={(e) =>
                  updateApplicant({ resume: { ...profile.resume, certifications: e.target.value } })
                }
              />
            </div>
            <button
              type="button"
              onClick={() =>
                void updateApplicantProfile({
                  fullName: profile.fullName,
                  university: profile.university,
                  courseOrYear: profile.courseOrYear,
                  skills: profile.skills,
                  bio: profile.bio,
                  repoLinks: profile.repoLinks,
                  avatarDataUrl: profile.avatarDataUrl,
                  jobSearchStatus: profile.jobSearchStatus,
                  resume: profile.resume as unknown as Record<string, unknown>,
                })
                  .then(() => showToast("Резюме успешно сохранено", "success"))
                  .catch((e) => {
                    const msg = e instanceof Error ? e.message : "Не удалось сохранить резюме";
                    setApiError(msg);
                    showToast(msg, "error");
                  })
              }
              className="rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2 text-sm font-semibold text-white"
            >
              Сохранить резюме
            </button>
          </GlassPanel>
        </motion.div>
      )}

      {tab === "contacts" && (
        <GlassPanel className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Профессиональные контакты</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Контакты видят ваш статус поиска («{JOB_SEARCH_LABELS[profile.jobSearchStatus]}») при
            открытом нетворкинге и могут рекомендовать вакансии.
          </p>
          <Link
            href="/applicant/contacts"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            Управление контактами →
          </Link>
        </GlassPanel>
      )}

      {tab === "privacy" && (
        <GlassPanel className="space-y-6 p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Приватность</h2>
          <ToggleRow
            label="Скрывать отклики от других соискателей"
            description="Если включено, контакты не увидят список ваших откликов."
            checked={profile.privacy.hideApplicationsFromPeers}
            onChange={(v) =>
              void (async () => {
                try {
                  await updateApplicantPrivacy({
                    hideApplicationsFromPeers: v,
                    openProfileToNetwork: profile.privacy.openProfileToNetwork,
                    blockRecommendations: profile.privacy.blockRecommendations ?? false,
                  });
                  updateApplicant({
                    privacy: { ...profile.privacy, hideApplicationsFromPeers: v },
                  });
                  showToast("Профиль успешно обновлён", "success");
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Не удалось обновить приватность";
                  setApiError(msg);
                  showToast(msg, "error");
                }
              })()
            }
          />
          <ToggleRow
            label="Открыть профиль для нетворкинга"
            description="Авторизованные соискатели смогут видеть расширенную информацию и статус поиска."
            checked={profile.privacy.openProfileToNetwork}
            onChange={(v) =>
              void (async () => {
                try {
                  await updateApplicantPrivacy({
                    hideApplicationsFromPeers: profile.privacy.hideApplicationsFromPeers,
                    openProfileToNetwork: v,
                    blockRecommendations: profile.privacy.blockRecommendations ?? false,
                  });
                  updateApplicant({
                    privacy: { ...profile.privacy, openProfileToNetwork: v },
                  });
                  showToast("Профиль успешно обновлён", "success");
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Не удалось обновить приватность";
                  setApiError(msg);
                  showToast(msg, "error");
                }
              })()
            }
          />
          <ToggleRow
            label="Запретить рекомендации"
            description="Если включено, контакты не смогут рекомендовать вам вакансии. Вы не будете отображаться в списке для рекомендаций."
            checked={profile.privacy.blockRecommendations ?? false}
            onChange={(v) =>
              void (async () => {
                try {
                  await updateApplicantPrivacy({
                    hideApplicationsFromPeers: profile.privacy.hideApplicationsFromPeers,
                    openProfileToNetwork: profile.privacy.openProfileToNetwork,
                    blockRecommendations: v,
                  });
                  updateApplicant({
                    privacy: { ...profile.privacy, blockRecommendations: v },
                  });
                  showToast("Профиль успешно обновлён", "success");
                } catch (e) {
                  const msg = e instanceof Error ? e.message : "Не удалось обновить приватность";
                  setApiError(msg);
                  showToast(msg, "error");
                }
              })()
            }
          />
        </GlassPanel>
      )}
      {apiError && <p className="text-xs text-red-300">{apiError}</p>}
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--glass-border)] p-4">
      <div>
        <p className="font-medium text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border transition",
          checked
            ? "border-[var(--brand-orange)] bg-[color-mix(in_srgb,var(--brand-orange)_35%,transparent)]"
            : "border-[var(--glass-border)] bg-[var(--glass-bg)]",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition",
            checked && "translate-x-6",
          )}
        />
      </button>
    </div>
  );
}

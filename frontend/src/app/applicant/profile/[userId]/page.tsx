"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { JOB_SEARCH_LABELS } from "@/lib/profile-defaults";
import { fetchPublicProfile, sendContactRequest } from "@/lib/api";
import type { PublicProfileApi } from "@/lib/types";
import { useToast } from "@/hooks/useToast";
import { applicationStatusBadge } from "@/lib/status-badges";
import { cn } from "@/lib/cn";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserAdd01Icon,
  CheckmarkCircle01Icon,
  Briefcase01Icon,
} from "@hugeicons/core-free-icons";
import { navLinkButtonClass } from "@/lib/nav-link-styles";

const statusLabels: Record<string, string> = {
  pending: "На рассмотрении",
  accepted: "Принят",
  rejected: "Отклонён",
  reserve: "В резерве",
};

function PublicProfilePageInner() {
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<PublicProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!params.userId) return;
    if (params.userId === user.id) {
      router.replace("/dashboard");
      return;
    }
    fetchPublicProfile(params.userId)
      .then((p) => {
        setProfile(p);
        setRequestSent(p.hasPending);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [params.userId, user, router]);

  const handleSendRequest = async () => {
    if (!profile) return;
    try {
      await sendContactRequest(profile.userId);
      setRequestSent(true);
      showToast("Заявка отправлена", "success");
    } catch {
      showToast("Не удалось отправить заявку", "error");
    }
  };

  if (loading) {
    return (
      <GlassPanel className="mx-auto mt-12 flex h-48 max-w-3xl items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
      </GlassPanel>
    );
  }

  const fromEmployer =
    user?.role === "employer" || searchParams.get("from") === "employer-applications";
  const backHref = fromEmployer ? "/employer/applications" : "/applicant/contacts";
  const backLabel = fromEmployer ? "← К откликам" : "← Назад к контактам";

  if (!profile) {
    return (
      <GlassPanel className="mx-auto mt-12 max-w-3xl p-8 text-center">
        <p className="text-[var(--text-primary)]">Профиль не найден.</p>
        <Link href={backHref} className={`${navLinkButtonClass} mt-4 inline-flex`}>
          {fromEmployer ? "К откликам" : "Вернуться к контактам"}
        </Link>
      </GlassPanel>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={backHref} className={navLinkButtonClass}>
        {backLabel}
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <GlassPanel className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-gradient-to-br from-[var(--brand-magenta)] to-[var(--brand-orange)]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {(profile.fullName || profile.displayName)[0]}
                </span>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                {profile.fullName || profile.displayName}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{profile.email}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="card-meta-chip rounded-full bg-[var(--glass-bg-strong)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                  {JOB_SEARCH_LABELS[profile.jobSearchStatus as keyof typeof JOB_SEARCH_LABELS] ?? profile.jobSearchStatus}
                </span>
              </div>
              {profile.bio && (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">{profile.bio}</p>
              )}
            </div>
            {user?.role === "applicant" && (
              <div className="flex gap-2">
                {profile.isContact ? (
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium",
                      applicationStatusBadge.accepted,
                    )}
                  >
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                    В контактах
                  </span>
                ) : requestSent ? (
                  <span
                    className={cn(
                      "inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 py-2 text-center text-sm font-medium leading-snug",
                      applicationStatusBadge.pending,
                    )}
                  >
                    Заявка отправлена
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleSendRequest()}
                    className="flex items-center gap-1 rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
                  >
                    <HugeiconsIcon icon={UserAdd01Icon} size={16} />
                    Добавить в контакты
                  </button>
                )}
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>

      {/* Навыки */}
      {profile.skills && profile.skills.length > 0 && (
        <GlassPanel className="p-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Карьерные интересы</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <span
                key={s}
                className="rounded-lg border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--brand-cyan)_12%,transparent)] px-2.5 py-1 text-sm text-[var(--text-primary)]"
              >
                {s}
              </span>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Расширенная информация (при openProfile) */}
      {profile.openProfile && (
        <>
          {(profile.university || profile.courseOrYear) && (
            <GlassPanel className="p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Образование</h2>
              {profile.university && (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{profile.university}</p>
              )}
              {profile.courseOrYear && (
                <p className="text-sm text-[var(--text-secondary)]">{profile.courseOrYear}</p>
              )}
            </GlassPanel>
          )}

          {profile.resume && profile.resume.headline && (
            <GlassPanel className="p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Резюме</h2>
              <p className="mt-2 font-medium text-[var(--text-primary)]">{profile.resume.headline}</p>
              {profile.resume.summary && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{profile.resume.summary}</p>
              )}
              {profile.resume.experience && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase text-[var(--text-secondary)]">Опыт</p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{profile.resume.experience}</p>
                </div>
              )}
            </GlassPanel>
          )}

          {profile.repoLinks && profile.repoLinks.length > 0 && (
            <GlassPanel className="p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Ссылки</h2>
              <ul className="mt-2 space-y-1">
                {profile.repoLinks.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noreferrer" className="text-sm text-[var(--brand-cyan)] hover:underline">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          )}

          {profile.contacts && profile.contacts.length > 0 && (
            <GlassPanel className="p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Контакты пользователя</h2>
              <div className="mt-3 space-y-2">
                {profile.contacts.map((c) => (
                  <Link
                    key={c.peerId}
                    href={`/applicant/profile/${c.peerId}`}
                    className="flex items-center gap-2 rounded-lg border border-[var(--glass-border)] p-2 text-sm hover:bg-[var(--glass-bg-strong)]"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-magenta)] to-[var(--brand-orange)]">
                      <span className="text-xs font-bold text-white">{c.name[0]}</span>
                    </div>
                    <span className="text-[var(--text-primary)]">{c.name}</span>
                  </Link>
                ))}
              </div>
            </GlassPanel>
          )}

          {profile.applications && profile.applications.length > 0 && (
            <GlassPanel className="p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                <HugeiconsIcon icon={Briefcase01Icon} size={20} />
                Отклики
              </h2>
              <div className="mt-3 space-y-2">
                {profile.applications.map((a) => (
                  <Link
                    key={a.opportunityId}
                    href={`/opportunities/${a.opportunityId}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--glass-border)] p-3 hover:bg-[var(--glass-bg-strong)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{a.opportunityTitle}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{a.companyName}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        a.status === "accepted"
                          ? applicationStatusBadge.accepted
                          : a.status === "rejected"
                            ? applicationStatusBadge.rejected
                            : a.status === "reserve"
                              ? applicationStatusBadge.reserve
                              : applicationStatusBadge.pending,
                      )}
                    >
                      {statusLabels[a.status] ?? a.status}
                    </span>
                  </Link>
                ))}
              </div>
            </GlassPanel>
          )}
        </>
      )}

      {!profile.openProfile && (
        <GlassPanel className="p-5 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Пользователь ограничил видимость профиля. Доступна только общая информация и карьерные интересы.
          </p>
        </GlassPanel>
      )}
    </div>
  );
}

export default function PublicProfilePage() {
  return (
    <Suspense
      fallback={
        <GlassPanel className="mx-auto mt-12 flex h-48 max-w-3xl items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      }
    >
      <PublicProfilePageInner />
    </Suspense>
  );
}

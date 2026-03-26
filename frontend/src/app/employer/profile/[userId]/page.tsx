"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicEmployerProfile, type PublicEmployerProfileApi } from "@/lib/api";

export default function EmployerPublicProfilePage() {
  const params = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicEmployerProfileApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!params.userId) return;
    fetchPublicEmployerProfile(params.userId)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.userId]);

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
        <Link href="/" className="mt-4 inline-block text-sm text-[var(--brand-cyan)] hover:underline">
          ← На главную
        </Link>
      </GlassPanel>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← На главную
      </Link>

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
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                    Верифицировано
                  </span>
                )}
              </div>
              {profile.industry && (
                <p className="mt-1 text-sm text-[var(--brand-magenta)]">{profile.industry}</p>
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
    </div>
  );
}

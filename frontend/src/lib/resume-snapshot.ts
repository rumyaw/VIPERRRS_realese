import type { ApplicantProfile } from "./types";

/** Краткий текст для работодателя при отклике (до полной интеграции с PDF). */
export function buildResumeSnapshot(profile: ApplicantProfile): string {
  const r = profile.resume;
  const parts = [
    profile.fullName,
    r.headline,
    r.summary?.trim(),
    profile.skills.length ? `Навыки: ${profile.skills.join(", ")}` : "",
    r.experience?.trim() ? `Опыт: ${r.experience.slice(0, 280)}` : "",
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 1200);
}

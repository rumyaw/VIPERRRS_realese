import type { ApplicantProfile, ApplicantResume, JobSearchStatus } from "./types";

export const JOB_SEARCH_LABELS: Record<JobSearchStatus, string> = {
  active_search: "В активном поиске",
  considering: "Рассматриваю предложения",
  not_looking: "Не ищу работу",
};

export function emptyResume(): ApplicantResume {
  return {
    headline: "",
    summary: "",
    experience: "",
    education: "",
    languages: "",
    certifications: "",
  };
}

export function defaultApplicantProfile(over?: Partial<ApplicantProfile>): ApplicantProfile {
  const base: ApplicantProfile = {
    fullName: "",
    university: "",
    courseOrYear: "",
    skills: [],
    bio: "",
    repoLinks: [],
    avatarDataUrl: null,
    jobSearchStatus: "active_search",
    resume: emptyResume(),
    privacy: {
      hideApplicationsFromPeers: false,
      openProfileToNetwork: true,
      blockRecommendations: false,
    },
  };
  if (!over) return base;
  return {
    ...base,
    ...over,
    resume: { ...base.resume, ...over.resume },
    privacy: { ...base.privacy, ...over.privacy },
  };
}

export function mergeApplicantProfile(raw: Partial<ApplicantProfile> | undefined): ApplicantProfile {
  return defaultApplicantProfile(raw);
}

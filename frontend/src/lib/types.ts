/** Авторизованные роли. «Гость» — не роль, а отсутствие сессии (user === null). */
export type UserRole = "applicant" | "employer" | "curator";

export type OpportunityType =
  | "internship"
  | "vacancy_junior"
  | "vacancy_senior"
  | "mentorship"
  | "event";

export type WorkFormat = "office" | "hybrid" | "remote";

export type EmploymentType = "full" | "part" | "project";

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "reserve";

/** Статус карьерных намерений соискателя (виден в кабинете / при нетворкинге). */
export type JobSearchStatus = "active_search" | "considering" | "not_looking";

export interface ApplicantResume {
  headline: string;
  summary: string;
  experience: string;
  education: string;
  languages: string;
  certifications: string;
}

export interface Opportunity {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  companyName: string;
  companyId: string;
  type: OpportunityType;
  workFormat: WorkFormat;
  /** Адрес офиса или город для удалёнки */
  locationLabel: string;
  /** [lat, lon] для Яндекс.Карт */
  coords: [number, number];
  publishedAt: string;
  validUntil: string | null;
  eventDate: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  contacts: {
    email?: string;
    phone?: string;
    website?: string;
    telegram?: string;
  };
  tags: string[];
  level: "intern" | "junior" | "middle" | "senior";
  employment: EmploymentType;
  mediaUrl?: string;
}

export interface ApplicantProfile {
  fullName: string;
  university: string;
  courseOrYear: string;
  skills: string[];
  bio: string;
  repoLinks: string[];
  avatarDataUrl: string | null;
  jobSearchStatus: JobSearchStatus;
  resume: ApplicantResume;
  privacy: {
    hideApplicationsFromPeers: boolean;
    openProfileToNetwork: boolean;
  };
}

export interface EmployerProfile {
  companyName: string;
  description: string;
  industry: string;
  website: string;
  socials: string;
  inn: string;
  verified: boolean;
  logoDataUrl: string | null;
}

export interface ApplicationRecord {
  id: string;
  opportunityId: string;
  applicantId: string;
  status: ApplicationStatus;
  createdAt: string;
  /** Краткий снимок резюме, отправленный работодателю при отклике */
  resumeSnapshot?: string;
}

export interface ContactEdge {
  peerId: string;
  since: string;
}

export interface Recommendation {
  id: string;
  fromUserId: string;
  toUserId: string;
  opportunityId: string;
  message: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  applicant?: ApplicantProfile;
  employer?: EmployerProfile;
}

export interface ModerationItem {
  id: string;
  kind: "opportunity" | "employer_verify" | "user_report";
  title: string;
  status: "open" | "resolved";
  createdAt: string;
}

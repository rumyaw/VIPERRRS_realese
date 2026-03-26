import type {
  Opportunity,
  ContactRequestApi,
  SearchApplicantApi,
  PublicProfileApi,
  RecommendableContactApi,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080/api/v1";

type OpportunityApi = {
  id: string;
  authorId?: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  companyName: string;
  type: Opportunity["type"];
  workFormat: Opportunity["workFormat"];
  locationLabel: string;
  coords?: [number, number];
  publishedAt?: string;
  validUntil?: string | null;
  eventDate?: string | null;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  contacts?: Opportunity["contacts"];
  tags?: string[];
  level?: Opportunity["level"];
  employment?: Opportunity["employment"];
  mediaUrl?: string;
};

function toOpportunity(item: OpportunityApi): Opportunity {
  return {
    id: item.id,
    title: item.title,
    shortDescription: item.shortDescription,
    fullDescription: item.fullDescription,
    companyName: item.companyName,
    companyId: item.authorId ?? item.companyName.toLowerCase().replace(/\s+/g, "-"),
    type: item.type,
    workFormat: item.workFormat,
    locationLabel: item.locationLabel,
    coords: item.coords ?? [55.7558, 37.6173],
    publishedAt: item.publishedAt ?? "",
    validUntil: item.validUntil ?? null,
    eventDate: item.eventDate ?? null,
    salaryMin: item.salaryMin ?? null,
    salaryMax: item.salaryMax ?? null,
    currency: item.currency ?? "RUB",
    contacts: item.contacts ?? {},
    tags: item.tags ?? [],
    level: item.level ?? "junior",
    employment: item.employment ?? "full",
    mediaUrl: item.mediaUrl,
  };
}

export async function fetchOpportunities(signal?: AbortSignal): Promise<Opportunity[]> {
  const res = await fetch(`${API_BASE}/opportunities?limit=200&offset=0`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to load opportunities: ${res.status}`);
  }
  const data = (await res.json()) as { items?: OpportunityApi[] };
  return (data.items ?? []).map(toOpportunity);
}

export async function fetchOpportunityById(id: string, signal?: AbortSignal): Promise<Opportunity | null> {
  const res = await fetch(`${API_BASE}/opportunities/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
    signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load opportunity: ${res.status}`);
  }
  return toOpportunity((await res.json()) as OpportunityApi);
}

export type EmployerApplication = {
  id: string;
  opportunityId: string;
  opportunity: string;
  status: "pending" | "accepted" | "rejected" | "reserve";
  resumeSnapshot?: string;
  createdAt: string;
  applicant: {
    id: string;
    displayName: string;
    email: string;
  };
};

export type PendingCompany = {
  userId: string;
  email: string;
  displayName: string;
  companyName: string;
  industry: string;
  website: string;
  inn: string;
  verified: boolean;
};

export type ApplicantContactApi = {
  peerId: string;
  email: string;
  name: string;
  since: string;
  skills?: string[];
  avatarUrl?: string;
  bio?: string;
  jobSearch?: string;
};

export type RecommendationInboxApi = {
  id: string;
  fromUserId: string;
  fromName: string;
  opportunityId: string;
  opportunityTitle?: string;
  companyName?: string;
  locationLabel?: string;
  message: string;
  createdAt: string;
  viewed: boolean;
};

type ApiResponse<T> = { items?: T; error?: string };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as ApiResponse<T> | T;
  if (!res.ok) {
    const err = (data as ApiResponse<T>)?.error ?? `Request failed: ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

export async function fetchEmployerOpportunities(): Promise<Opportunity[]> {
  const data = await apiFetch<{ items: OpportunityApi[] }>("/employer/opportunities", { method: "GET" });
  return (data.items ?? []).map(toOpportunity);
}

export async function createEmployerOpportunity(input: {
  title: string;
  shortDescription: string;
  fullDescription: string;
  companyName: string;
  type: Opportunity["type"];
  workFormat: Opportunity["workFormat"];
  locationLabel: string;
  lat?: number;
  lng?: number;
  contacts?: Opportunity["contacts"];
  tags?: string[];
  level?: Opportunity["level"];
  employment?: Opportunity["employment"];
  mediaUrl?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
}): Promise<Opportunity> {
  const data = await apiFetch<OpportunityApi>("/employer/opportunities", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toOpportunity(data);
}

export async function fetchEmployerApplications(): Promise<EmployerApplication[]> {
  const data = await apiFetch<{ items: EmployerApplication[] }>("/employer/applications", { method: "GET" });
  return data.items ?? [];
}

export async function setEmployerApplicationStatus(
  applicationId: string,
  status: EmployerApplication["status"],
): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/employer/applications/${encodeURIComponent(applicationId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchApplicantApplications(): Promise<Array<Record<string, unknown>>> {
  const data = await apiFetch<{ items: Array<Record<string, unknown>> }>("/applicant/applications", {
    method: "GET",
  });
  return data.items ?? [];
}

export async function createApplicantApplication(opportunityId: string, resumeSnapshot: string): Promise<void> {
  await apiFetch<{ ok: boolean }>("/applicant/applications", {
    method: "POST",
    body: JSON.stringify({ opportunityId, resumeSnapshot }),
  });
}

export async function updateApplicantPrivacy(input: {
  hideApplicationsFromPeers: boolean;
  openProfileToNetwork: boolean;
  blockRecommendations: boolean;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>("/applicant/privacy", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateApplicantProfile(input: {
  fullName: string;
  university: string;
  courseOrYear: string;
  skills: string[];
  bio: string;
  repoLinks: string[];
  avatarDataUrl: string | null;
  jobSearchStatus: "active_search" | "considering" | "not_looking";
  resume: Record<string, unknown>;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>("/applicant/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function fetchApplicantContacts(): Promise<ApplicantContactApi[]> {
  const data = await apiFetch<{ items: ApplicantContactApi[] }>("/applicant/contacts", { method: "GET" });
  return data.items ?? [];
}

export async function addApplicantContact(peerEmail: string): Promise<void> {
  await apiFetch<{ ok: boolean }>("/applicant/contacts", {
    method: "POST",
    body: JSON.stringify({ peerEmail }),
  });
}

export async function sendRecommendation(input: {
  toUserId: string;
  opportunityId: string;
  message: string;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>("/applicant/recommendations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchRecommendationsInbox(): Promise<RecommendationInboxApi[]> {
  const data = await apiFetch<{ items: RecommendationInboxApi[] }>("/applicant/recommendations/inbox", {
    method: "GET",
  });
  return data.items ?? [];
}

export async function fetchPendingCompanies(): Promise<PendingCompany[]> {
  const data = await apiFetch<{ items: PendingCompany[] }>("/curator/companies/pending", { method: "GET" });
  return data.items ?? [];
}

export async function setCompanyVerification(companyId: string, verified: boolean): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/curator/companies/${encodeURIComponent(companyId)}/verification`, {
    method: "PATCH",
    body: JSON.stringify({ verified }),
  });
}

export async function fetchPendingOpportunities(): Promise<Array<Record<string, unknown>>> {
  const data = await apiFetch<{ items: Array<Record<string, unknown>> }>("/curator/opportunities/pending", {
    method: "GET",
  });
  return data.items ?? [];
}

export async function setOpportunityModerationStatus(opportunityId: string, status: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/curator/opportunities/${encodeURIComponent(opportunityId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type AdminStats = {
  totalUsers: number;
  totalOpportunities: number;
  totalApplications: number;
  pendingVerifications: number;
  pendingModeration: number;
};

export type TimelinePoint = {
  date: string;
  count: number;
};

export type AdminTimeline = {
  userRegistrations: TimelinePoint[];
  applications: TimelinePoint[];
  opportunities: TimelinePoint[];
};

export async function fetchAdminStats(): Promise<AdminStats> {
  return await apiFetch<AdminStats>("/admin/stats", { method: "GET" });
}

export async function fetchAdminTimeline(): Promise<AdminTimeline> {
  return await apiFetch<AdminTimeline>("/admin/timeline", { method: "GET" });
}

export type EmployerProfileDTO = {
  companyName: string;
  description: string;
  industry: string;
  website: string;
  socials: string;
  inn: string;
};

export async function updateEmployerProfile(input: EmployerProfileDTO): Promise<void> {
  await apiFetch<{ ok: boolean }>("/employer/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// --- Contact Requests ---

export async function sendContactRequest(toUserId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>("/applicant/contact-requests", {
    method: "POST",
    body: JSON.stringify({ toUserId }),
  });
}

export async function fetchContactRequests(): Promise<ContactRequestApi[]> {
  const data = await apiFetch<{ items: ContactRequestApi[] }>("/applicant/contact-requests", { method: "GET" });
  return data.items ?? [];
}

export async function acceptContactRequest(requestId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/applicant/contact-requests/${encodeURIComponent(requestId)}/accept`, {
    method: "PATCH",
  });
}

export async function rejectContactRequest(requestId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/applicant/contact-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "PATCH",
  });
}

// --- Search ---

export async function searchApplicants(query: string): Promise<SearchApplicantApi[]> {
  const data = await apiFetch<{ items: SearchApplicantApi[] }>(`/applicant/search?q=${encodeURIComponent(query)}`, { method: "GET" });
  return data.items ?? [];
}

// --- Public Profile ---

export async function fetchPublicProfile(userId: string): Promise<PublicProfileApi> {
  return await apiFetch<PublicProfileApi>(`/applicant/profile/${encodeURIComponent(userId)}`, { method: "GET" });
}

// --- Mark recommendation viewed ---

export async function markRecommendationViewed(recommendationId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/applicant/recommendations/${encodeURIComponent(recommendationId)}/viewed`, {
    method: "PATCH",
  });
}

// --- Server-side favorites ---

export async function fetchServerFavorites(): Promise<string[]> {
  const data = await apiFetch<{ items: string[] }>("/applicant/favorites", { method: "GET" });
  return data.items ?? [];
}

export async function addServerFavorite(opportunityId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>("/applicant/favorites", {
    method: "POST",
    body: JSON.stringify({ opportunityId }),
  });
}

export async function removeServerFavorite(opportunityId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/applicant/favorites/${encodeURIComponent(opportunityId)}`, {
    method: "DELETE",
  });
}

// --- Recommendable contacts (filtered by privacy) ---

export async function fetchRecommendableContacts(): Promise<RecommendableContactApi[]> {
  const data = await apiFetch<{ items: RecommendableContactApi[] }>("/applicant/recommendable-contacts", { method: "GET" });
  return data.items ?? [];
}

// --- Remove contact ---

export async function removeApplicantContact(peerId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/applicant/contacts/${encodeURIComponent(peerId)}`, {
    method: "DELETE",
  });
}

// --- Public employer profile ---

export type PublicEmployerProfileApi = {
  userId: string;
  companyName: string;
  description: string;
  industry: string;
  website: string;
  verified: boolean;
  logoUrl?: string;
};

export async function fetchPublicEmployerProfile(userId: string): Promise<PublicEmployerProfileApi> {
  return await apiFetch<PublicEmployerProfileApi>(`/employer/public-profile/${encodeURIComponent(userId)}`, { method: "GET" });
}

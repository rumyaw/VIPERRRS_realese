import type { Opportunity } from "@/lib/types";
import { moderationStatusBadge } from "@/lib/status-badges";

export const employerModerationFilterOptions: { value: string; label: string }[] = [
  { value: "", label: "Все статусы" },
  { value: "pending", label: "На модерации (новая)" },
  { value: "approved", label: "Опубликовано" },
  { value: "rejected", label: "Отклонено" },
  { value: "revision_pending", label: "Правка на модерации" },
  { value: "revision_rejected", label: "Правка отклонена" },
];

export function employerOppMatchesModFilter(opp: Opportunity, filterMod: string): boolean {
  if (!filterMod) return true;
  if (filterMod === "revision_pending") return opp.revisionModerationStatus === "pending";
  if (filterMod === "revision_rejected") return opp.revisionModerationStatus === "rejected";
  return (opp.moderationStatus ?? "pending") === filterMod;
}

export function employerModerationBadgeKey(opp: Opportunity): keyof typeof moderationStatusBadge {
  if (opp.revisionModerationStatus === "pending") return "revision_pending";
  if (opp.revisionModerationStatus === "rejected") return "revision_rejected";
  const st = opp.moderationStatus ?? "pending";
  if (st in moderationStatusBadge) return st as keyof typeof moderationStatusBadge;
  return "pending";
}

export function employerModerationLabel(opp: Opportunity): string {
  if (opp.revisionModerationStatus === "pending") return "Правка на модерации";
  if (opp.revisionModerationStatus === "rejected") return "Правка отклонена";
  const st = opp.moderationStatus ?? "pending";
  if (st === "approved") return "Опубликовано";
  if (st === "rejected") return "Отклонено";
  return "На модерации";
}

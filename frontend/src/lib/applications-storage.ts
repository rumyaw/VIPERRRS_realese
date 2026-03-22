import type { ApplicationRecord } from "./types";

const KEY = "tramplin_applications_v1";

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("tramplin-applications-change"));
}

function readAll(): ApplicationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ApplicationRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: ApplicationRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getStoredApplications(applicantId: string): ApplicationRecord[] {
  return readAll().filter((a) => a.applicantId === applicantId);
}

export function addStoredApplication(row: ApplicationRecord) {
  const list = readAll();
  if (
    list.some(
      (a) =>
        a.id === row.id ||
        (a.opportunityId === row.opportunityId && a.applicantId === row.applicantId),
    )
  ) {
    return;
  }
  writeAll([...list, row]);
  emitChange();
}

export function hasApplied(applicantId: string, opportunityId: string): boolean {
  return readAll().some((a) => a.applicantId === applicantId && a.opportunityId === opportunityId);
}

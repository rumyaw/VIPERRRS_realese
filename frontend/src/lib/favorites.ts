const KEY = "tramplin_favorites_v1";

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): boolean {
  const set = new Set(getFavoriteIds());
  const next = set.has(id);
  if (next) set.delete(id);
  else set.add(id);
  localStorage.setItem(KEY, JSON.stringify([...set]));
  return !next;
}

export function isFavorite(id: string): boolean {
  return getFavoriteIds().includes(id);
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { getFavoriteIds, isFavorite as favCheck, toggleFavorite } from "@/lib/favorites";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setIds(getFavoriteIds());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tramplin_favorites_v1") refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const toggle = useCallback((id: string) => {
    toggleFavorite(id);
    refresh();
  }, [refresh]);

  const has = useCallback((id: string) => favCheck(id), []);

  return { favoriteIds: ids, toggle, has, refresh };
}

"use client";

import { useEffect, useRef } from "react";
import type { Opportunity } from "@/lib/types";

const SCRIPT_ID = "yandex-maps-2-1-script";

type YMapsNS = {
  ready: (cb: () => void) => void;
  Map: new (
    el: HTMLElement | string,
    state: { center: number[]; zoom: number; controls?: string[] },
    options?: { suppressMapOpenBlock?: boolean },
  ) => {
    geoObjects: {
      add: (obj: unknown) => void;
      removeAll: () => void;
    };
    destroy: () => void;
  };
  Placemark: new (
    geometry: number[],
    properties: Record<string, string>,
    options: { preset?: string },
  ) => unknown;
};

function loadYmapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { ymaps?: YMapsNS };
  if (w.ymaps) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "1" && w.ymaps) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("Не удалось загрузить Яндекс.Карты"));
    document.head.appendChild(script);
  });
}

export type YandexMapProps = {
  opportunities: Opportunity[];
  favoriteIds: string[];
  onMarkerClick?: (id: string) => void;
  className?: string;
};

export function YandexMap({
  opportunities,
  favoriteIds,
  onMarkerClick,
  className,
}: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    const el = containerRef.current;
    if (!apiKey || !el) return;

    let cancelled = false;

    const run = async () => {
      try {
        await loadYmapsScript(apiKey);
        if (cancelled || !el) return;

        const ymaps = (window as unknown as { ymaps: YMapsNS }).ymaps;
        await new Promise<void>((resolve) => ymaps.ready(() => resolve()));

        if (cancelled || !el) return;

        if (mapRef.current) {
          try {
            mapRef.current.destroy();
          } catch {
            /* noop */
          }
          mapRef.current = null;
        }

        el.innerHTML = "";

        const center =
          opportunities.length > 0
            ? opportunities[0].coords
            : ([37.6173, 55.7558] as [number, number]);

        const map = new ymaps.Map(
          el,
          {
            center,
            zoom: opportunities.length === 1 ? 12 : 9,
            controls: ["zoomControl", "fullscreenControl", "geolocationControl"],
          },
          { suppressMapOpenBlock: true },
        );
        mapRef.current = map as { destroy: () => void };

        opportunities.forEach((opp) => {
          const fav = favoriteIds.includes(opp.id);
          const salary =
            opp.salaryMin != null && opp.salaryMax != null
              ? `${opp.salaryMin.toLocaleString("ru-RU")}–${opp.salaryMax.toLocaleString("ru-RU")} ${opp.currency}`
              : "ЗП по договорённости";

          const placemark = new ymaps.Placemark(
            opp.coords,
            {
              balloonContentHeader: `<div style="font-weight:600;font-size:15px">${opp.title}</div>`,
              balloonContentBody: `<div style="margin-top:6px">${opp.companyName}</div><div style="margin-top:8px;font-size:13px;opacity:.85">${salary}</div><div style="margin-top:8px;font-size:12px">${opp.tags.slice(0, 4).join(" · ")}</div>`,
              hintContent: `${opp.title} · ${opp.companyName}`,
            },
            {
              preset: fav ? "islands#orangeDotIcon" : "islands#blueDotIcon",
            },
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (placemark as any).events.add("click", () => onMarkerClick?.(opp.id));
          map.geoObjects.add(placemark);
        });
      } catch (e) {
        console.error(e);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {
          /* noop */
        }
        mapRef.current = null;
      }
      if (el) el.innerHTML = "";
    };
  }, [opportunities, favoriteIds, onMarkerClick]);

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div
        className={
          className ??
          "glass-panel flex min-h-[320px] items-center justify-center p-8 text-center text-[var(--text-secondary)]"
        }
      >
        <div>
          <p className="text-lg font-medium text-[var(--text-primary)]">Карта недоступна</p>
          <p className="mt-2 max-w-md text-sm">
            Укажите ключ в файле{" "}
            <code className="rounded bg-[var(--glass-bg-strong)] px-1.5 py-0.5">.env.local</code>:{" "}
            <code className="rounded bg-[var(--glass-bg-strong)] px-1.5 py-0.5">
              NEXT_PUBLIC_YANDEX_MAPS_API_KEY
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[min(62vh,560px)] w-full overflow-hidden rounded-2xl"}
    />
  );
}

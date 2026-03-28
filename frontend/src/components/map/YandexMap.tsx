"use client";

import { useEffect, useRef, useState } from "react";
import type { Opportunity } from "@/lib/types";

/** Стабильная подпись маркеров: без неё каждый рендер с `favoriteIds={[]}` и новым onMapClick пересоздаёт карту */
function opportunitiesLayoutKey(opportunities: Opportunity[]): string {
  return opportunities.map((o) => `${o.id}:${o.coords[0]},${o.coords[1]}`).join("|");
}

const SCRIPT_ID = "yandex-maps-2-1-script";
let ymapsLoadPromise: Promise<void> | null = null;

type YMapsNS = {
  ready: (cb: () => void) => void;
  Map: new (
    el: HTMLElement | string,
    state: { center: number[]; zoom: number; controls?: string[]; type?: string },
    options?: { suppressMapOpenBlock?: boolean; yandexMapDisablePoiInteractivity?: boolean },
  ) => {
    geoObjects: {
      add: (obj: unknown) => void;
      remove: (obj: unknown) => void;
      removeAll: () => void;
    };
    destroy: () => void;
    setType: (type: string) => void;
  };
  Placemark: new (
    geometry: number[],
    properties: Record<string, string>,
    options: { 
      preset?: string; 
      iconLayout?: string;
      iconContentLayout?: string;
      iconColor?: string;
      balloonMaxWidth?: number; 
      [key: string]: unknown;
    },
  ) => unknown;
};

function loadYmapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as { ymaps?: YMapsNS };
  if (w.ymaps) return Promise.resolve();
  if (ymapsLoadPromise) return ymapsLoadPromise;

  ymapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      const check = () => {
        if ((window as unknown as { ymaps?: YMapsNS }).ymaps) resolve();
        else setTimeout(check, 100);
      };
      check();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.onload = () => resolve();
    script.onerror = () => {
      ymapsLoadPromise = null;
      reject(new Error("Не удалось загрузить Яндекс.Карты"));
    };
    document.head.appendChild(script);
  });

  return ymapsLoadPromise;
}

export type YandexMapProps = {
  opportunities: Opportunity[];
  favoriteIds: string[];
  onMarkerClick?: (id: string) => void;
  className?: string;
  onMapClick?: (coords: [number, number]) => void;
  selectable?: boolean;
};

export function YandexMap({
  opportunities,
  favoriteIds,
  onMarkerClick,
  className,
  onMapClick,
  selectable = false,
}: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ destroy: () => void } | null>(null);
  const onMapClickRef = useRef(onMapClick);
  const onMarkerClickRef = useRef(onMarkerClick);
  onMapClickRef.current = onMapClick;
  onMarkerClickRef.current = onMarkerClick;

  const opportunitiesKey = opportunitiesLayoutKey(opportunities);
  const favoritesKey = [...favoriteIds].sort().join("\0");

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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

        if (!document.getElementById("ymaps-dark-theme")) {
          const s = document.createElement("style");
          s.id = "ymaps-dark-theme";
          s.textContent = [
            ".ymaps-dark-map { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9); }",
            '.ymaps-dark-map [class*="-placemark"], .ymaps-dark-map [class*="-icon"], .ymaps-dark-map img[src*="islands"] { filter: invert(1) hue-rotate(180deg); }',
            '.dark [class*="-balloon__layout"] { background-color: #1a1a2e !important; border: 1px solid #3d3d5c !important; border-radius: 14px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important; overflow: hidden !important; }',
            '.dark [class*="-balloon__content"] { background: #1a1a2e !important; padding: 0 !important; margin: 0 !important; }',
            '.dark [class*="-balloon__close-button"] { filter: invert(1) brightness(2) !important; }',
            '.dark [class*="-balloon__tail"]::after { background: #1a1a2e !important; }',
          ].join("\n");
          document.head.appendChild(s);
        }

        const center =
          opportunities.length > 0
            ? opportunities[0].coords
            : ([55.7558, 37.6173] as [number, number]);

        const map = new ymaps.Map(
          el,
          {
            center,
            zoom: opportunities.length === 1 ? 12 : 9,
            controls: ["zoomControl", "fullscreenControl", "geolocationControl"],
            type: "yandex#map",
          },
          { 
            suppressMapOpenBlock: true,
            yandexMapDisablePoiInteractivity: false,
          },
        );
        
        mapRef.current = map as { destroy: () => void };

        opportunities.forEach((opp) => {
          const fav = favoriteIds.includes(opp.id);
          const isEvent = opp.type === "event";
          let salaryHtml = "";
          if (opp.salaryMin != null && opp.salaryMax != null) {
            salaryHtml = `${opp.salaryMin.toLocaleString("ru-RU")}–${opp.salaryMax.toLocaleString("ru-RU")} ${opp.currency}`;
          } else if (!isEvent) {
            salaryHtml = "Зарплата не указана";
          }
          const headerBg = isDark ? "#1a1a2e" : "#f5f0e8";
          const headerColor = isDark ? "#ffffff" : "#111827";
          const headerBorder = isDark ? "#3d3d5c" : "#e7dfd0";
          const bodyBg = isDark ? "#1a1a2e" : "#fffdf9";
          const bodyText = isDark ? "#e0e0ff" : "#334155";
          const companyColor = isDark ? "#ff6b6b" : "#b45309";
          const salaryColor = isDark ? "#ffd93d" : "#0f766e";
          const tagsColor = isDark ? "#a0a0cc" : "#64748b";

          const placemark = new ymaps.Placemark(
            opp.coords,
            {
              balloonContentHeader: `<div style="font-weight:600;font-size:15px;padding:12px 16px;background:${headerBg};color:${headerColor};border-bottom:1px solid ${headerBorder};">${opp.title}</div>`,
              balloonContentBody: `<div style="padding:14px 16px;background:${bodyBg};color:${bodyText};"><div style="font-weight:500;margin-bottom:8px;color:${companyColor};">${opp.companyName}</div>${salaryHtml ? `<div style="margin-top:10px;min-height:40px;display:flex;align-items:center;font-size:14px;color:${salaryColor};font-weight:600;">${salaryHtml}</div>` : `<div style="margin-top:10px;min-height:40px;"></div>`}<div style="margin-top:10px;font-size:12px;color:${tagsColor};">${opp.tags.slice(0, 4).join(" · ")}</div></div>`,
              hintContent: `<span style="color:${isDark ? "#fff" : "#111"};background:${isDark ? "#2d2d44" : "#e8e4dc"};padding:4px 8px;border-radius:4px;">${opp.title} · ${opp.companyName}</span>`,
            },
            {
              // Используем кастомные цвета вместо стандартных пресетов
              preset: fav ? "islands#redDotIcon" : "islands#blueDotIcon",
              iconColor: fav ? "#ff4757" : "#3742fa",
              balloonMaxWidth: 320,
            },
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (placemark as any).events.add("click", () => onMarkerClickRef.current?.(opp.id));
          map.geoObjects.add(placemark);
        });
        if (selectable) {
          let selectionMark: unknown = null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (map as any).events.add("click", (e: any) => {
            const coords = e.get("coords") as [number, number];
            onMapClickRef.current?.(coords);

            if (selectionMark) map.geoObjects.remove(selectionMark);
            selectionMark = new ymaps.Placemark(coords, {}, {
              preset: "islands#redCircleDotIcon",
              iconColor: "#ff2d55",
            });
            map.geoObjects.add(selectionMark);
          });
        }
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
    // Колбэки через ref — иначе inline-функции с родителя пересоздают карту на каждый ввод в форме.
    // Ключи вместо []/opportunities по ссылке (каждый рендер — новый объект).
    // opportunities / favoriteIds берём из замыкания той же отрисовки, что и key.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренно только layout-ключи
  }, [opportunitiesKey, favoritesKey, selectable, isDark]);

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
      className={`${isDark ? "ymaps-dark-map" : ""} ${className ?? "h-[min(62vh,560px)] w-full overflow-hidden rounded-2xl"}`}
    />
  );
}

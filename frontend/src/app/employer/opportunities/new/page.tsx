"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { YandexMap } from "@/components/map/YandexMap";
import { createEmployerOpportunity } from "@/lib/api";
import type { Opportunity, OpportunityType, WorkFormat } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";
import { SkillPicker } from "@/components/ui/SkillPicker";
import { GlassSelect } from "@/components/ui/GlassSelect";

const noSalaryTypes: OpportunityType[] = ["event", "mentorship"];

export default function CreateOpportunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const [tagList, setTagList] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    type: "vacancy_junior" as OpportunityType,
    workFormat: "hybrid" as WorkFormat,
    locationLabel: "",
    salaryMin: "",
    salaryMax: "",
    mediaUrl: "" as string,
    validUntil: "",
    eventStart: "",
    eventEnd: "",
  });

  const companyNameForMap = user?.employer?.companyName ?? "";

  const mapPreviewOpps = useMemo((): Opportunity[] => {
    if (!selectedCoords) return [];
    return [
      {
        id: "preview",
        title: "Точка на карте",
        shortDescription: "Название и описание заполняются в форме слева — ввод там не перезагружает карту.",
        fullDescription: "",
        companyName: companyNameForMap || "Компания",
        companyId: "preview",
        type: "vacancy_junior",
        workFormat: "hybrid",
        locationLabel: "",
        coords: selectedCoords,
        publishedAt: new Date().toISOString(),
        validUntil: null,
        eventDate: null,
        salaryMin: null,
        salaryMax: null,
        currency: "RUB",
        contacts: {},
        tags: [],
        level: "junior",
        employment: "full",
      } as Opportunity,
    ];
  }, [selectedCoords, companyNameForMap]);

  const emp = user?.employer;
  if (!emp) return null;

  if (!emp.verified) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <GlassPanel className="p-8 text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Аккаунт не верифицирован</h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            Для публикации карточек возможностей необходимо пройти верификацию компании.
            Обратитесь к куратору платформы.
          </p>
          <Link href="/employer/company" className="mt-4 inline-block text-sm text-[var(--brand-cyan)] hover:underline">
            ← Профиль компании
          </Link>
        </GlassPanel>
      </div>
    );
  }

  const geocodeAddress = async () => {
    if (!form.locationLabel.trim()) return;
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    if (!apiKey) {
      showToast("Ключ Яндекс.Карт не настроен", "error");
      return;
    }
    setGeocoding(true);
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(apiKey)}&geocode=${encodeURIComponent(form.locationLabel)}&format=json&results=1`;
      const res = await fetch(url);
      const data = await res.json();
      const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      if (pos) {
        const [lon, lat] = pos.split(" ").map(Number);
        setSelectedCoords([lat, lon]);
        showToast("Адрес найден на карте", "success");
      } else {
        showToast("Адрес не найден. Укажите точку на карте вручную", "info");
      }
    } catch {
      showToast("Ошибка геокодирования", "error");
    } finally {
      setGeocoding(false);
    }
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    if (!apiKey) return;
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(apiKey)}&geocode=${lon},${lat}&format=json&results=1`;
      const res = await fetch(url);
      const data = await res.json();
      const geo = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
      const text =
        geo?.metaDataProperty?.GeocoderMetaData?.text ??
        geo?.name ??
        (typeof geo?.description === "string" ? `${geo.name}, ${geo.description}` : null);
      if (text && typeof text === "string") {
        setForm((f) => ({ ...f, locationLabel: text }));
        showToast("Адрес подставлен по точке на карте", "success");
      }
    } catch {
      showToast("Не удалось определить адрес по карте", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isFree = noSalaryTypes.includes(form.type);
      const isEvent = form.type === "event";
      await createEmployerOpportunity({
        title: form.title,
        shortDescription: form.shortDescription,
        fullDescription: form.shortDescription,
        companyName: emp.companyName,
        type: form.type,
        workFormat: form.workFormat,
        locationLabel: form.locationLabel,
        lat: selectedCoords?.[0],
        lng: selectedCoords?.[1],
        contacts: { email: user?.email ?? "" },
        tags: tagList,
        level: "junior",
        employment: "full",
        salaryMin: isFree ? undefined : (form.salaryMin ? parseInt(form.salaryMin) : undefined),
        salaryMax: isFree ? undefined : (form.salaryMax ? parseInt(form.salaryMax) : undefined),
        currency: "RUB",
        mediaUrl: form.mediaUrl || undefined,
        validUntil: isEvent ? undefined : (form.validUntil || undefined),
        eventStart: isEvent ? (form.eventStart || undefined) : undefined,
        eventEnd: isEvent ? (form.eventEnd || undefined) : undefined,
      });
      showToast("Карточка отправлена на модерацию", "success");
      router.push("/employer/opportunities");
    } catch (e) {
      console.error(e);
      showToast("Не удалось создать карточку", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Создать карточку</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Новая возможность для студентов и выпускников</p>
        </div>
        <Link href="/employer/opportunities" className="text-sm text-[var(--brand-cyan)] hover:underline">
          ← Мои карточки
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_min(100%,22rem)]">
        <motion.form 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <GlassPanel className="space-y-4 p-6">
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Название *</label>
              <input
                required
                type="text"
                className="glass-input mt-1 w-full px-4 py-3 text-sm"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Junior Frontend Developer"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Краткое описание *</label>
              <textarea
                required
                className="glass-input mt-1 min-h-[80px] w-full px-4 py-3 text-sm"
                value={form.shortDescription}
                onChange={(e) => setForm(f => ({ ...f, shortDescription: e.target.value }))}
                placeholder="Основные задачи и требования"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Тип</label>
                <GlassSelect
                  className="mt-1 w-full"
                  buttonClassName="px-4 py-3 text-sm"
                  value={form.type}
                  onChange={(v) => setForm((f) => ({ ...f, type: v as OpportunityType }))}
                  options={[
                    { value: "internship", label: "Стажировка" },
                    { value: "vacancy_junior", label: "Вакансия Junior" },
                    { value: "vacancy_senior", label: "Вакансия Middle+" },
                    { value: "mentorship", label: "Менторская программа" },
                    { value: "event", label: "Мероприятие" },
                  ]}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Формат</label>
                <GlassSelect
                  className="mt-1 w-full"
                  buttonClassName="px-4 py-3 text-sm"
                  value={form.workFormat}
                  onChange={(v) => setForm((f) => ({ ...f, workFormat: v as WorkFormat }))}
                  options={[
                    { value: "office", label: "Офис" },
                    { value: "hybrid", label: "Гибрид" },
                    { value: "remote", label: "Удалённо" },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Адрес / Локация</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  className="glass-input flex-1 px-4 py-3 text-sm"
                  value={form.locationLabel}
                  onChange={(e) => setForm(f => ({ ...f, locationLabel: e.target.value }))}
                  placeholder="Москва, ул. Примерная, 1"
                />
                <button
                  type="button"
                  onClick={geocodeAddress}
                  disabled={geocoding || !form.locationLabel.trim()}
                  className="shrink-0 rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--glass-bg)] disabled:opacity-50"
                >
                  {geocoding ? "..." : "Найти"}
                </button>
              </div>
            </div>

            {form.type === "event" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Дата проведения с</label>
                  <input
                    type="date"
                    className="glass-input mt-1 w-full px-4 py-3 text-sm"
                    value={form.eventStart}
                    onChange={(e) => setForm((f) => ({ ...f, eventStart: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-secondary)]">по</label>
                  <input
                    type="date"
                    className="glass-input mt-1 w-full px-4 py-3 text-sm"
                    value={form.eventEnd}
                    onChange={(e) => setForm((f) => ({ ...f, eventEnd: e.target.value }))}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Действительно до</label>
                <input
                  type="date"
                  className="glass-input mt-1 w-full px-4 py-3 text-sm"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
            )}

            {!noSalaryTypes.includes(form.type) && (
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Зарплата, ₽</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Указывается только в рублях</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">От</label>
                    <input
                      type="number"
                      className="glass-input input-no-spinner mt-1 w-full px-4 py-3 text-sm"
                      value={form.salaryMin}
                      onChange={(e) => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                      placeholder="80000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)]">До</label>
                    <input
                      type="number"
                      className="glass-input input-no-spinner mt-1 w-full px-4 py-3 text-sm"
                      value={form.salaryMax}
                      onChange={(e) => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                      placeholder="120000"
                    />
                  </div>
                </div>
              </div>
            )}

            <SkillPicker
              label="Теги и стек"
              searchPlaceholder="Найти тег..."
              customPlaceholder="Свой тег..."
              selected={tagList}
              onChange={setTagList}
            />

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Изображение</label>
              <input
                type="file"
                accept="image/*"
                className="glass-input mt-1 w-full px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--glass-bg-strong)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--text-primary)]"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setForm(f => ({ ...f, mediaUrl: reader.result as string }));
                  reader.readAsDataURL(file);
                }}
              />
              {form.mediaUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.mediaUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:text-red-300"
                    onClick={() => setForm(f => ({ ...f, mediaUrl: "" }))}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className={cn(
                "w-full rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90",
                saving && "opacity-70 cursor-not-allowed"
              )}
            >
              {saving ? "Отправка..." : "Отправить на модерацию"}
            </button>
          </GlassPanel>
        </motion.form>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <GlassPanel className="p-4">
            <h3 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Укажите место на карте</h3>
            <YandexMap
              opportunities={mapPreviewOpps}
              favoriteIds={[]}
              selectable
              onMapClick={(coords) => {
                setSelectedCoords(coords);
                void reverseGeocode(coords[0], coords[1]);
              }}
              className="h-[min(42vh,320px)] w-full rounded-xl sm:h-[300px]"
            />
            {selectedCoords && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Координаты: {selectedCoords[0].toFixed(4)}, {selectedCoords[1].toFixed(4)}
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="p-4">
            <h3 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Подсказки</h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li>• Введите адрес и нажмите «Найти» для геокодирования</li>
              <li>• Или укажите точку на карте вручную</li>
              <li>• Добавьте зарплатную вилку для привлечения кандидатов</li>
              <li>• Карточка будет отправлена на модерацию</li>
            </ul>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}

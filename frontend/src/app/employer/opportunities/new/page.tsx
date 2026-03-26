"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { YandexMap } from "@/components/map/YandexMap";
import { createEmployerOpportunity } from "@/lib/api";
import type { Opportunity, OpportunityType, WorkFormat } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useToast } from "@/hooks/useToast";

export default function CreateOpportunityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    fullDescription: "",
    type: "vacancy_junior" as OpportunityType,
    workFormat: "hybrid" as WorkFormat,
    locationLabel: "",
    salaryMin: "",
    salaryMax: "",
    currency: "RUB",
    tags: "",
    mediaUrl: "" as string,
  });

  const emp = user?.employer;
  if (!emp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createEmployerOpportunity({
        title: form.title,
        shortDescription: form.shortDescription,
        fullDescription: form.fullDescription || form.shortDescription,
        companyName: emp.companyName,
        type: form.type,
        workFormat: form.workFormat,
        locationLabel: form.locationLabel,
        lat: selectedCoords?.[0],
        lng: selectedCoords?.[1],
        contacts: { email: user?.email ?? "" },
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        level: "junior",
        employment: "full",
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : undefined,
        currency: form.currency,
        mediaUrl: form.mediaUrl || undefined,
      });
      showToast("Карточка успешно создана", "success");
      router.push("/employer/opportunities");
    } catch (e) {
      console.error(e);
      showToast("Не удалось создать карточку", "error");
    } finally {
      setSaving(false);
    }
  };

  const previewOpps: Opportunity[] = selectedCoords ? [{
    id: "preview",
    title: form.title || "Новая возможность",
    shortDescription: form.shortDescription || "Описание...",
    fullDescription: "",
    companyName: emp.companyName,
    companyId: "preview",
    type: form.type,
    workFormat: form.workFormat,
    locationLabel: form.locationLabel || "Москва",
    coords: selectedCoords,
    publishedAt: new Date().toISOString(),
    validUntil: null,
    eventDate: null,
    salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
    salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
    currency: form.currency,
    contacts: {},
    tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    level: "junior",
    employment: "full",
  } as Opportunity] : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Создать карточку</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Новая возможность для студентов и выпускников</p>
        </div>
        <Link href="/employer/opportunities" className="text-sm text-[var(--brand-cyan)] hover:underline">
          ← Мои карточки
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Полное описание</label>
              <textarea
                className="glass-input mt-1 min-h-[120px] w-full px-4 py-3 text-sm"
                value={form.fullDescription}
                onChange={(e) => setForm(f => ({ ...f, fullDescription: e.target.value }))}
                placeholder="Детальное описание вакансии, условия, требования"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Тип</label>
                <select
                  className="glass-select mt-1 w-full px-4 py-3 text-sm"
                  value={form.type}
                  onChange={(e) => setForm(f => ({ ...f, type: e.target.value as OpportunityType }))}
                >
                  <option value="internship">Стажировка</option>
                  <option value="vacancy_junior">Вакансия Junior</option>
                  <option value="vacancy_senior">Вакансия Middle+</option>
                  <option value="mentorship">Менторство</option>
                  <option value="event">Мероприятие</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Формат</label>
                <select
                  className="glass-select mt-1 w-full px-4 py-3 text-sm"
                  value={form.workFormat}
                  onChange={(e) => setForm(f => ({ ...f, workFormat: e.target.value as WorkFormat }))}
                >
                  <option value="office">Офис</option>
                  <option value="hybrid">Гибрид</option>
                  <option value="remote">Удалённо</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Адрес / Локация</label>
              <input
                type="text"
                className="glass-input mt-1 w-full px-4 py-3 text-sm"
                value={form.locationLabel}
                onChange={(e) => setForm(f => ({ ...f, locationLabel: e.target.value }))}
                placeholder="Москва, ул. Примерная, 1"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Зарплата от</label>
                <input
                  type="number"
                  className="glass-input mt-1 w-full px-4 py-3 text-sm"
                  value={form.salaryMin}
                  onChange={(e) => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                  placeholder="80000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Зарплата до</label>
                <input
                  type="number"
                  className="glass-input mt-1 w-full px-4 py-3 text-sm"
                  value={form.salaryMax}
                  onChange={(e) => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                  placeholder="120000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)]">Валюта</label>
                <select
                  className="glass-select mt-1 w-full px-4 py-3 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                >
                  <option value="RUB">RUB</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)]">Теги (через запятую)</label>
              <input
                type="text"
                className="glass-input mt-1 w-full px-4 py-3 text-sm"
                value={form.tags}
                onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="React, TypeScript, Next.js"
              />
            </div>

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
              {saving ? "Создание..." : "Создать карточку"}
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
              opportunities={previewOpps}
              favoriteIds={[]}
              selectable
              onMapClick={(coords) => setSelectedCoords(coords)}
              className="h-[300px] w-full rounded-xl"
            />
            {selectedCoords && (
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                Выбрано: {selectedCoords[0].toFixed(4)}, {selectedCoords[1].toFixed(4)}
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="p-4">
            <h3 className="mb-2 text-sm font-medium text-[var(--text-primary)]">Подсказки</h3>
            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              <li>• Укажите конкретный адрес для отображения на карте</li>
              <li>• Добавьте зарплатную вилку для привлечения кандидатов</li>
              <li>• Используйте релевантные теги для поиска</li>
              <li>• Карточка будет отправлена на модерацию</li>
            </ul>
          </GlassPanel>
        </motion.div>
      </div>
    </div>
  );
}

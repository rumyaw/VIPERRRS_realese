"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";
import { updateEmployerProfile } from "@/lib/api";

export default function CompanyPage() {
  const { user, updateEmployer } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "employer") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const emp = user?.employer;
  if (!emp) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEmployerProfile({
        companyName: emp.companyName,
        description: emp.description,
        industry: emp.industry,
        website: emp.website,
        socials: emp.socials,
        inn: emp.inn,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Компания</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Управление профилем работодателя</p>
        </div>
        <Link href="/" className="text-sm text-[var(--brand-cyan)] hover:underline">
          ← На главную
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <GlassPanel className="grid gap-6 p-6 lg:grid-cols-[200px_1fr]">
          <div className="text-center">
            <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
              {emp.logoDataUrl ? (
                <img src={emp.logoDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-bold text-[var(--text-secondary)]">
                  {emp.companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <label className="mt-4 inline-block cursor-pointer rounded-xl bg-[var(--glass-bg-strong)] px-4 py-2 text-sm hover:bg-[var(--glass-bg)] transition">
              Логотип
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => updateEmployer({ logoDataUrl: String(reader.result) });
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <p
              className={cn(
                "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium",
                emp.verified
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "bg-amber-500/20 text-amber-100",
              )}
            >
              {emp.verified ? "Верифицировано" : "Ожидает верификации"}
            </p>
          </div>
          <div className="space-y-4">
            <Field
              label="Наименование"
              value={emp.companyName}
              onChange={(v) => updateEmployer({ companyName: v })}
            />
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">Описание</label>
              <textarea
                className="glass-input mt-1 min-h-[88px] w-full px-4 py-3 text-sm"
                value={emp.description}
                onChange={(e) => updateEmployer({ description: e.target.value })}
              />
            </div>
            <Field
              label="Сфера деятельности"
              value={emp.industry}
              onChange={(v) => updateEmployer({ industry: v })}
            />
            <Field label="Сайт" value={emp.website} onChange={(v) => updateEmployer({ website: v })} />
            <Field
              label="Соцсети / профили"
              value={emp.socials}
              onChange={(v) => updateEmployer({ socials: v })}
            />
            <Field label="ИНН" value={emp.inn} onChange={(v) => updateEmployer({ inn: v })} />
            
            <div className="pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition",
                  saved 
                    ? "bg-emerald-500" 
                    : "bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] hover:opacity-90",
                  saving && "opacity-70 cursor-not-allowed"
                )}
              >
                {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить"}
              </button>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      <input
        type="text"
        className="glass-input mt-1 w-full px-4 py-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

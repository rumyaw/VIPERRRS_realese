"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { JOB_SEARCH_LABELS } from "@/lib/profile-defaults";
import {
  addApplicantContact,
  fetchApplicantContacts,
  type ApplicantContactApi,
} from "@/lib/api";

export default function ContactsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<ApplicantContactApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "applicant") {
      router.replace("/dashboard");
      return;
    }
    loadContacts();
  }, [user, router]);

  const loadContacts = async () => {
    try {
      const data = await fetchApplicantContacts();
      setContacts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить контакты");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!contactEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addApplicantContact(contactEmail.trim());
      const updated = await fetchApplicantContacts();
      setContacts(updated);
      setContactEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить контакт");
    } finally {
      setAdding(false);
    }
  };

  const profile = user?.applicant;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Контакты</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Профессиональные контакты и нетворкинг</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          ← Кабинет
        </Link>
      </div>

      {profile && (
        <GlassPanel className="p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Ваш статус поиска:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {JOB_SEARCH_LABELS[profile.jobSearchStatus]}
            </span>
            {" — "}виден контактам при открытом нетворкинге.
          </p>
        </GlassPanel>
      )}

      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Добавить контакт</h2>
        <div className="mt-3 flex gap-2">
          <input
            className="glass-input flex-1 px-4 py-3 text-sm"
            placeholder="Email соискателя для добавления в контакты"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAdd();
            }}
          />
          <button
            type="button"
            disabled={adding || !contactEmail.trim()}
            onClick={() => void handleAdd()}
            className="rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adding ? "Добавление..." : "Добавить"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </GlassPanel>

      {loading ? (
        <GlassPanel className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
        </GlassPanel>
      ) : contacts.length === 0 ? (
        <GlassPanel className="flex h-48 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-lg font-medium text-[var(--text-primary)]">Нет контактов</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Добавьте соискателей по email, чтобы обмениваться рекомендациями
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {contacts.map((c, idx) => (
            <motion.div
              key={c.peerId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <GlassPanel className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{c.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{c.email}</p>
                </div>
                <span className="text-xs text-[var(--text-secondary)]">с {c.since}</span>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

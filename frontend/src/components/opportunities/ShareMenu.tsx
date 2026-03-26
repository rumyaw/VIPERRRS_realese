"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { fetchRecommendableContacts, sendRecommendation } from "@/lib/api";
import type { RecommendableContactApi } from "@/lib/types";
import { useToast } from "@/hooks/useToast";

export function ShareMenu({ opportunityId }: { opportunityId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contacts, setContacts] = useState<RecommendableContactApi[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setContactsOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleOpenContacts = async () => {
    setContactsOpen(true);
    setLoadingContacts(true);
    try {
      const data = await fetchRecommendableContacts();
      setContacts(data);
    } catch {
      showToast("Не удалось загрузить контакты", "error");
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleRecommend = async (peerId: string) => {
    setSending(peerId);
    try {
      await sendRecommendation({
        toUserId: peerId,
        opportunityId,
        message: "Рекомендую обратить внимание на эту возможность",
      });
      showToast("Рекомендация отправлена", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    } finally {
      setSending(null);
    }
  };

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/opportunities/${opportunityId}`
    : "";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
          setContactsOpen(false);
        }}
        className="glass-panel rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        title="Порекомендовать"
      >
        📤
      </button>

      <AnimatePresence>
        {open && !contactsOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-full right-0 z-50 mb-2 flex gap-2 rounded-xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--page-bg)_95%,transparent)] p-2 shadow-xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => void handleOpenContacts()}
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition hover:bg-[var(--glass-bg-strong)]"
              title="Контакты"
            >
              <span className="text-lg">👥</span>
              <span className="text-[var(--text-secondary)]">Контакты</span>
            </button>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Посмотри эту вакансию!")}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition hover:bg-[var(--glass-bg-strong)]"
              title="Telegram"
            >
              <span className="text-lg">✈️</span>
              <span className="text-[var(--text-secondary)]">Telegram</span>
            </a>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Посмотри эту вакансию! " + shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition hover:bg-[var(--glass-bg-strong)]"
              title="WhatsApp"
            >
              <span className="text-lg">💬</span>
              <span className="text-[var(--text-secondary)]">WhatsApp</span>
            </a>
            <a
              href={`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition hover:bg-[var(--glass-bg-strong)]"
              title="VK"
            >
              <span className="text-lg">🔵</span>
              <span className="text-[var(--text-secondary)]">VK</span>
            </a>
          </motion.div>
        )}

        {open && contactsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full right-0 z-50 mb-2 w-80 max-h-72 overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--page-bg)_95%,transparent)] p-3 shadow-xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Выберите контакт</p>
              <button
                type="button"
                onClick={() => setContactsOpen(false)}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ← Назад
              </button>
            </div>

            {loadingContacts ? (
              <div className="flex h-20 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                <p>Нет контактов для рекомендации</p>
                <p className="mt-1 text-xs">Контакты со статусом &quot;не ищу работу&quot; или запретом рекомендаций не отображаются</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <div
                    key={c.peerId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--glass-border)] p-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-magenta)] to-[var(--brand-orange)]">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-white">{c.name[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{c.name}</p>
                        <p className="truncate text-[10px] text-[var(--text-secondary)]">
                          {c.skills?.slice(0, 2).join(", ")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={sending === c.peerId}
                      onClick={() => void handleRecommend(c.peerId)}
                      className="shrink-0 rounded-lg bg-[var(--brand-cyan)]/20 px-3 py-1 text-xs font-medium text-[var(--brand-cyan)] transition hover:bg-[var(--brand-cyan)]/30 disabled:opacity-50"
                    >
                      {sending === c.peerId ? "..." : "Рекомендовать"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

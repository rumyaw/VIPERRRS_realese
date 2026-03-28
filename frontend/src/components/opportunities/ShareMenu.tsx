"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { fetchRecommendableContacts, sendRecommendation } from "@/lib/api";
import type { RecommendableContactApi } from "@/lib/types";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/cn";
import { HugeiconsIcon } from "@hugeicons/react";
import { Share01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

function VKIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.12-5.339-3.202-2.17-3.048-2.763-5.339-2.763-5.814 0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.17-3.624 2.17-3.624.119-.254.322-.491.762-.491h1.744c.525 0 .643.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.744-.576.744z"/>
    </svg>
  );
}

type Anchor = { top: number; left: number; transform: string };

const shareIconBtnClass =
  "flex min-h-[52px] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs transition hover:bg-[var(--glass-bg-strong)] sm:min-h-0 sm:min-w-[4.75rem] sm:flex-none";

export function ShareMenu({
  opportunityId,
  showContactsRecommendation = true,
  shareButtonClassName,
}: {
  opportunityId: string;
  showContactsRecommendation?: boolean;
  /** Растянуть кнопку «Поделиться» (например w-full в сетке карточки) */
  shareButtonClassName?: string;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contacts, setContacts] = useState<RecommendableContactApi[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [recommendMessage, setRecommendMessage] = useState("");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const computeAnchor = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const popW = Math.min(contactsOpen ? 300 : 300, vw - 2 * margin);
    const idealLeft = r.left + r.width / 2 - popW / 2;
    const left = Math.min(vw - popW - margin, Math.max(margin, idealLeft));

    const estH = contactsOpen ? Math.min(320, window.innerHeight * 0.5) : 88;
    const spaceAbove = r.top - margin;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    /* Попап по умолчанию над кнопкой; вниз — только если сверху совсем мало места */
    const preferAbove = spaceAbove >= estH + 4 || spaceAbove >= spaceBelow;

    if (preferAbove) {
      setAnchor({
        top: r.top - 12,
        left,
        transform: "translateY(-100%)",
      });
    } else {
      setAnchor({
        top: r.bottom + 8,
        left,
        transform: "none",
      });
    }
  }, [contactsOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (rootRef.current?.contains(t)) return;
      if (t.closest?.("[data-share-popover]")) return;
      setOpen(false);
      setContactsOpen(false);
      setRecommendMessage("");
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      window.addEventListener("resize", computeAnchor);
      window.addEventListener("scroll", computeAnchor, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", computeAnchor);
      window.removeEventListener("scroll", computeAnchor, true);
    };
  }, [open, computeAnchor]);

  useEffect(() => {
    if (open) computeAnchor();
  }, [contactsOpen, open, computeAnchor]);

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
        message: recommendMessage.trim().slice(0, 500),
      });
      showToast("Рекомендация отправлена", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    } finally {
      setSending(null);
    }
  };

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/opportunities/${opportunityId}` : "";

  const popoverClass =
    "fixed z-[1000] flex max-w-[calc(100vw-1rem)] flex-wrap justify-center gap-1 rounded-xl border border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--page-bg)_98%,transparent)] p-2 shadow-2xl backdrop-blur-xl sm:flex-nowrap sm:justify-start";

  const popover = typeof document !== "undefined"
    ? createPortal(
        <AnimatePresence>
          {open && anchor && !contactsOpen && (
            <motion.div
              data-share-popover
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={popoverClass}
              style={{
                top: anchor.top,
                left: anchor.left,
                transform: anchor.transform,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {showContactsRecommendation && (
                <button
                  type="button"
                  onClick={() => void handleOpenContacts()}
                  className={shareIconBtnClass}
                  title="Контакты"
                >
                  <HugeiconsIcon icon={UserGroupIcon} size={20} className="text-[var(--brand-cyan)]" />
                  <span className="text-[var(--text-secondary)]">Контакты</span>
                </button>
              )}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Посмотри эту возможность!")}`}
                target="_blank"
                rel="noreferrer"
                className={shareIconBtnClass}
                title="Telegram"
              >
                <span className="text-[#26A5E4]">
                  <TelegramIcon />
                </span>
                <span className="text-[var(--text-secondary)]">Telegram</span>
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Посмотри эту возможность! " + shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className={shareIconBtnClass}
                title="WhatsApp"
              >
                <span className="text-[#25D366]">
                  <WhatsAppIcon />
                </span>
                <span className="text-[var(--text-secondary)]">WhatsApp</span>
              </a>
              <a
                href={`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className={shareIconBtnClass}
                title="VK"
              >
                <span className="text-[#0077FF]">
                  <VKIcon />
                </span>
                <span className="text-[var(--text-secondary)]">VK</span>
              </a>
            </motion.div>
          )}
          {open && anchor && contactsOpen && (
            <motion.div
              data-share-popover
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className={`${popoverClass} w-[min(20rem,calc(100vw-1.5rem))] max-h-[min(24rem,58vh)] flex-col overflow-y-auto`}
              style={{
                top: anchor.top,
                left: anchor.left,
                transform: anchor.transform,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex w-full shrink-0 items-center justify-between">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Выберите контакт</p>
                <button
                  type="button"
                  onClick={() => setContactsOpen(false)}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ← Назад
                </button>
              </div>

              <label className="mb-2 block w-full shrink-0 text-left">
                <span className="mb-1 block text-xs text-[var(--text-secondary)]">
                  Сообщение к рекомендации (по желанию)
                </span>
                <textarea
                  value={recommendMessage}
                  onChange={(e) => setRecommendMessage(e.target.value.slice(0, 500))}
                  placeholder="Например: подойдёт по стеку и формату работы"
                  rows={2}
                  className="glass-input w-full resize-none px-3 py-2 text-xs"
                />
              </label>

              {loadingContacts ? (
                <div className="flex h-20 w-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-cyan)] border-t-transparent" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-4 text-center text-sm text-[var(--text-secondary)]">
                  <p>Нет контактов для рекомендации</p>
                  <p className="mt-1 text-xs">Контакты со статусом &quot;не ищу работу&quot; или запретом рекомендаций не отображаются</p>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  {contacts.map((c) => (
                    <div
                      key={c.peerId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[var(--glass-border)] p-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
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
                        className="shrink-0 rounded-lg bg-[var(--brand-cyan)]/20 px-3 py-2 text-xs font-medium text-[var(--brand-cyan)] transition hover:bg-[var(--brand-cyan)]/30 disabled:opacity-50"
                      >
                        {sending === c.peerId ? "..." : "Рекомендовать"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <div className={cn("relative", shareButtonClassName?.includes("w-full") && "w-full")} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) {
            setOpen(false);
            setContactsOpen(false);
            setRecommendMessage("");
            return;
          }
          setContactsOpen(false);
          setRecommendMessage("");
          setOpen(true);
          requestAnimationFrame(() => computeAnchor());
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--brand-cyan)_45%,var(--glass-border))] hover:bg-[var(--glass-bg-strong)]",
          shareButtonClassName,
        )}
        title="Поделиться"
      >
        <HugeiconsIcon icon={Share01Icon} size={16} />
        <span className="hidden sm:inline">Поделиться</span>
      </button>
      {popover}
    </div>
  );
}

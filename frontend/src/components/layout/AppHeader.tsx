"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/cn";
import { roleLabelRu } from "@/lib/role-labels";
import type { AuthUser } from "@/lib/types";

function navFor(user: AuthUser | null) {
  const home = { href: "/", label: "Главная" };
  if (!user) {
    return [home, { href: "/login", label: "Вход" }, { href: "/register", label: "Регистрация" }];
  }
  if (user.role === "applicant") {
    return [
      home,
      { href: "/applicant/applications", label: "Мои отклики" },
      { href: "/applicant/recommendations", label: "Рекомендации" },
      { href: "/applicant/contacts", label: "Контакты" },
      { href: "/dashboard", label: "Кабинет" },
    ];
  }
  if (user.role === "employer") {
    return [
      home,
      { href: "/employer/opportunities", label: "Мои карточки" },
      { href: "/employer/opportunities/new", label: "Создать карточку" },
      { href: "/employer/applications", label: "Отклики" },
      { href: "/employer/stats", label: "Статистика" },
      { href: "/employer/company", label: "Компания" },
    ];
  }
  if (user.role === "curator") {
    return [home, { href: "/admin/dashboard", label: "Панель управления" }];
  }
  return [home, { href: "/dashboard", label: "Кабинет" }];
}

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = navFor(user);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--page-bg)_72%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <motion.div whileHover={{ scale: 1.03 }} className="relative h-10 w-10 shrink-0">
            <Image src="/images/logo.png" alt="Трамплин" fill className="object-contain drop-shadow-md" priority />
          </motion.div>
          <div className="leading-tight">
            <span className="block text-lg font-bold tracking-tight text-[var(--text-primary)]">
              Трамплин
            </span>
            <span className="hidden text-xs text-[var(--text-secondary)] sm:block">
              Карьерная экосистема
            </span>
          </div>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 overflow-x-auto md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition",
                pathname === item.href
                  ? "bg-[var(--glass-bg-strong)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user && (
            <>
              <span className="max-w-[200px] truncate rounded-full border border-[var(--glass-border)] px-3 py-1 text-xs text-[var(--text-secondary)] sm:max-w-none">
                {user.displayName} · {roleLabelRu(user.role)}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]"
              >
                Выйти
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="glass-panel inline-flex h-10 w-10 items-center justify-center rounded-xl md:hidden"
            aria-expanded={open}
            aria-label="Меню"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="text-xl">{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[var(--glass-border)] md:hidden"
          >
            <div className="glass-panel-strong mx-4 mb-4 space-y-1 rounded-2xl p-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-3 py-3 text-sm font-medium",
                    pathname === item.href
                      ? "bg-[var(--glass-bg)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="w-full rounded-xl px-3 py-3 text-left text-sm text-[var(--brand-magenta)]"
                >
                  Выйти
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

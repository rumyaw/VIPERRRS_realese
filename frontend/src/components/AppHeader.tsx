'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import AuthStatus from './AuthStatus';
import ThemeToggle from './theme/ThemeToggle';

export default function AppHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/40">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Трамплин" width={34} height={34} className="h-9 w-9" priority />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-black dark:text-white">Трамплин</span>
            <span className="text-xs text-black/55 dark:text-white/55">Карьерная платформа</span>
          </div>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          <ThemeToggle />
          <AuthStatus />
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-black/80 backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-white/85 dark:hover:bg-black/55"
            aria-label="Open mobile menu"
          >
            ☰
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-black/5 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-black/55 sm:hidden">
          <nav className="mb-3 flex flex-col gap-2">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black/80 dark:border-white/15 dark:bg-black/40 dark:text-white/85"
            >
              Главная
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black/80 dark:border-white/15 dark:bg-black/40 dark:text-white/85"
            >
              Кабинет
            </Link>
          </nav>
          <AuthStatus />
        </div>
      ) : null}
    </header>
  );
}


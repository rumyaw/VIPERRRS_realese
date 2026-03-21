'use client';

import { useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const onToggle = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('theme', next);
    setDark(next === 'dark');
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm font-medium text-black/80 backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-white/85 dark:hover:bg-black/55"
      aria-label="Toggle theme"
    >
      <span aria-hidden>{dark ? '🌙' : '☀️'}</span>
      <span className="hidden sm:inline">{dark ? 'Тёмная' : 'Светлая'}</span>
    </button>
  );
}


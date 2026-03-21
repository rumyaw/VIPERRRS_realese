'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/api';

type MeResponse = {
  id: string;
  email: string;
  role: string;
  displayName: string;
  status: string;
};

export default function AuthStatus() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/me`, {
          credentials: 'include',
        });
        if (resp.ok) {
          const data = await resp.json();
          setMe(data);
        } else {
          setMe(null);
        }
      } catch {
        setMe(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await apiPost('/api/auth/logout', {});
    } finally {
      setMe(null);
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <span className="h-8 w-8 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
    );
  }

  if (me) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-700 backdrop-blur transition hover:bg-indigo-500/20 dark:text-indigo-300"
        >
          {me.displayName}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-black/80 backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-white/85"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-3">
      <Link
        className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-black/80 backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-white/85"
        href="/login"
      >
        Вход
      </Link>
      <Link
        className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-black/80 backdrop-blur transition hover:bg-white dark:border-white/15 dark:bg-black/40 dark:text-white/85"
        href="/register"
      >
        Регистрация
      </Link>
    </nav>
  );
}

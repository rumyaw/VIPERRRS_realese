"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError(res.error ?? "Ошибка входа");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
      <GlassPanel className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Вход</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Введите email и пароль для входа в систему.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="glass-input mt-1 w-full px-4 py-3 text-sm outline-none ring-[var(--brand-cyan)] focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Пароль</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="current-password"
                className="glass-input w-full px-4 py-3 pr-11 text-sm outline-none ring-[var(--brand-cyan)] focus:ring-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <p className="rounded-xl border-2 border-red-800/40 bg-red-100 px-3 py-2 text-sm font-semibold !text-black dark:border-red-500/40 dark:bg-red-500/15 dark:!text-red-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[linear-gradient(135deg,var(--brand-magenta),var(--brand-orange))] py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-[var(--brand-cyan)] hover:underline">
            Регистрация
          </Link>
        </p>
      </GlassPanel>
    </motion.div>
  );
}

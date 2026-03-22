"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          Демо: <code className="text-xs">student@example.com</code> (соискатель),{" "}
          <code className="text-xs">hr@codeinsight.example</code> (работодатель),{" "}
          <code className="text-xs">admin@tramplin.example</code> (админ; ранее{" "}
          <code className="text-xs">curator@university.example</code>) — пароль от 4 символов.
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
            <input
              type="password"
              required
              autoComplete="current-password"
              className="glass-input mt-1 w-full px-4 py-3 text-sm outline-none ring-[var(--brand-cyan)] focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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

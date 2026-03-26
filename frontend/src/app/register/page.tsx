"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/types";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Extract<UserRole, "applicant" | "employer">>("applicant");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await register({ email, displayName, password, role });
    setLoading(false);
    if (res.ok) router.push("/dashboard");
    else setError(res.error ?? "Ошибка регистрации");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
      <GlassPanel className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Регистрация</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Создайте аккаунт, чтобы начать пользоваться платформой.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["applicant", "Соискатель"],
                ["employer", "Работодатель"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-sm font-medium transition",
                  role === value
                    ? "border-[var(--brand-orange)] bg-[var(--glass-bg-strong)] text-[var(--text-primary)]"
                    : "border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Отображаемое имя</label>
            <input
              required
              className="glass-input mt-1 w-full px-4 py-3 text-sm outline-none ring-[var(--brand-cyan)] focus:ring-2"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
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
            <label className="text-xs font-medium text-[var(--text-secondary)]">Пароль (мин. 8 символов)</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
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
          {role === "employer" && (
            <p className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-xs text-[var(--text-secondary)]">
              После регистрации компания проходит верификацию куратором платформы.
            </p>
          )}
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
            {loading ? "Создаём…" : "Создать аккаунт"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-[var(--brand-cyan)] hover:underline">
            Войти
          </Link>
        </p>
      </GlassPanel>
    </motion.div>
  );
}

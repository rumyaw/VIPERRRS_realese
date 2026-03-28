"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApplicantCabinet } from "@/components/dashboard/ApplicantCabinet";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { roleLabelRu } from "@/lib/role-labels";
import { navLinkButtonClass } from "@/lib/nav-link-styles";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "curator") {
      router.replace("/admin/dashboard");
    }
    if (user.role === "employer") {
      router.replace("/employer/company");
    }
  }, [user, router]);

  if (!user) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-[var(--text-secondary)]">Перенаправление на вход…</p>
      </GlassPanel>
    );
  }

  if (user.role === "curator") {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-[var(--text-secondary)]">Перенаправление в панель администратора…</p>
      </GlassPanel>
    );
  }

  if (user.role === "employer") {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-[var(--text-secondary)]">Перенаправление в профиль компании…</p>
      </GlassPanel>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Личный кабинет</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Роль: <span className="text-[var(--text-primary)]">{roleLabelRu(user.role)}</span>
          </p>
        </div>
        <Link href="/" className={navLinkButtonClass}>
          ← На главную
        </Link>
      </div>

      {user.role === "applicant" && <ApplicantCabinet />}
    </motion.div>
  );
}

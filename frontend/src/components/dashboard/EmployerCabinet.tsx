"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/GlassPanel";

const links = [
  { href: "/employer/company", label: "Компания", desc: "Профиль работодателя и верификация" },
  { href: "/employer/opportunities", label: "Мои карточки", desc: "Управление возможностями" },
  { href: "/employer/opportunities/new", label: "Создать карточку", desc: "Новая вакансия или стажировка" },
  { href: "/employer/applications", label: "Отклики", desc: "Отклики соискателей на ваши карточки" },
];

export function EmployerCabinet() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {links.map((link, idx) => (
        <motion.div
          key={link.href}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.06 }}
        >
          <Link href={link.href} className="block h-full">
            <GlassPanel className="flex h-full flex-col justify-between p-5 transition hover:border-[var(--brand-cyan)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{link.label}</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{link.desc}</p>
              <span className="mt-4 text-sm text-[var(--brand-cyan)]">Перейти →</span>
            </GlassPanel>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

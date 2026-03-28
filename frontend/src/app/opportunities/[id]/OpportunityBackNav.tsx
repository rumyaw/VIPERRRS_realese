"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export function OpportunityBackNav() {
  const searchParams = useSearchParams();
  const fromRecommendations = searchParams.get("from") === "recommendations";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← Назад к поиску
      </Link>
      {fromRecommendations && (
        <Link
          href="/applicant/contacts?tab=recommendations"
          className="text-sm font-medium text-[var(--brand-cyan)] hover:underline"
        >
          ← К рекомендациям
        </Link>
      )}
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { navLinkButtonClass } from "@/lib/nav-link-styles";

export function OpportunityBackNav() {
  const searchParams = useSearchParams();
  const fromRecommendations = searchParams.get("from") === "recommendations";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2">
      <Link href="/" className={navLinkButtonClass}>
        ← Назад к поиску
      </Link>
      {fromRecommendations && (
        <Link href="/applicant/contacts?tab=recommendations" className={navLinkButtonClass}>
          ← К рекомендациям
        </Link>
      )}
    </motion.div>
  );
}

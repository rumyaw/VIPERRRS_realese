"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { navLinkButtonClass } from "@/lib/nav-link-styles";

export function EmployerProfileBackLink() {
  const searchParams = useSearchParams();
  const fromAdmin = searchParams.get("from") === "admin-pending";

  if (fromAdmin) {
    return (
      <Link href="/admin/dashboard" className={navLinkButtonClass}>
        ← К панели администратора
      </Link>
    );
  }

  return (
    <Link href="/" className={navLinkButtonClass}>
      ← На главную
    </Link>
  );
}

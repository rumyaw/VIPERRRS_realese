"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function EmployerProfileBackLink() {
  const searchParams = useSearchParams();
  const fromAdmin = searchParams.get("from") === "admin-pending";

  if (fromAdmin) {
    return (
      <Link href="/admin/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← К панели администратора
      </Link>
    );
  }

  return (
    <Link href="/" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
      ← На главную
    </Link>
  );
}

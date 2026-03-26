"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RecommendationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/applicant/contacts");
  }, [router]);

  return null;
}

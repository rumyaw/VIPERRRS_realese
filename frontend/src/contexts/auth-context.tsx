"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ApplicantProfile, AuthUser, EmployerProfile, UserRole } from "@/lib/types";
import { mergeApplicantProfile } from "@/lib/profile-defaults";
import { MOCK_USERS } from "@/lib/mock-data";

const STORAGE_KEY = "tramplin_auth_user_v1";

export type RegisterInput = {
  email: string;
  displayName: string;
  password: string;
  role: Extract<UserRole, "applicant" | "employer">;
};

type AuthContextValue = {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  register: (input: RegisterInput) => Promise<{ ok: boolean; error?: string }>;
  updateApplicant: (patch: Partial<ApplicantProfile>) => void;
  updateEmployer: (patch: Partial<EmployerProfile>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeAuthUser(raw: AuthUser): AuthUser {
  let u = { ...raw };
  if ((u as { role?: string }).role === "curator") {
    u = { ...u, role: "admin" as UserRole };
  }
  if (u.applicant) {
    u = { ...u, applicant: mergeApplicantProfile(u.applicant) };
  }
  return u;
}

function loadStored(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    const normalized = normalizeAuthUser(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      saveUser(normalized);
    }
    return normalized;
  } catch {
    return null;
  }
}

function saveUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (!user) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(loadStored());
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 280));
    const normalized = email.trim().toLowerCase();
    if (password.length < 4) return { ok: false, error: "Пароль слишком короткий" };

    if (normalized === "student@example.com") {
      const raw = MOCK_USERS["user-applicant"];
      const u = normalizeAuthUser({ ...raw });
      saveUser(u);
      setUser(u);
      return { ok: true };
    }
    if (normalized === "hr@codeinsight.example") {
      const u = { ...MOCK_USERS["user-employer"] };
      saveUser(u);
      setUser(u);
      return { ok: true };
    }
    if (normalized === "admin@tramplin.example" || normalized === "curator@university.example") {
      const u = { ...MOCK_USERS["user-admin"] };
      saveUser(u);
      setUser(u);
      return { ok: true };
    }

    return {
      ok: false,
      error:
        "Демо: student@example.com, hr@codeinsight.example или admin@tramplin.example (ранее curator@university.example)",
    };
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await new Promise((r) => setTimeout(r, 320));
    if (input.password.length < 6) return { ok: false, error: "Минимум 6 символов в пароле" };

    const base: AuthUser = {
      id: `local-${Date.now()}`,
      email: input.email.trim().toLowerCase(),
      displayName: input.displayName.trim(),
      role: input.role,
    };

    if (input.role === "applicant") {
      base.applicant = mergeApplicantProfile({
        fullName: input.displayName.trim(),
      });
    } else if (input.role === "employer") {
      base.employer = {
        companyName: "",
        description: "",
        industry: "",
        website: "",
        socials: "",
        inn: "",
        verified: false,
        logoDataUrl: null,
      };
    }

    saveUser(base);
    setUser(base);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    saveUser(null);
    setUser(null);
  }, []);

  const updateApplicant = useCallback((patch: Partial<ApplicantProfile>) => {
    setUser((prev) => {
      if (!prev?.applicant) return prev;
      const merged: ApplicantProfile = {
        ...prev.applicant,
        ...patch,
        resume: { ...prev.applicant.resume, ...patch.resume },
        privacy: { ...prev.applicant.privacy, ...patch.privacy },
      };
      const next: AuthUser = { ...prev, applicant: mergeApplicantProfile(merged) };
      saveUser(next);
      return next;
    });
  }, []);

  const updateEmployer = useCallback((patch: Partial<EmployerProfile>) => {
    setUser((prev) => {
      if (!prev?.employer) return prev;
      const next: AuthUser = {
        ...prev,
        employer: { ...prev.employer, ...patch },
      };
      saveUser(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      register,
      updateApplicant,
      updateEmployer,
    }),
    [user, login, logout, register, updateApplicant, updateEmployer],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

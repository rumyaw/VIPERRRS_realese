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

const STORAGE_KEY = "tramplin_auth_user_v1";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8080/api/v1";

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
    void (async () => {
      try {
        const me = await requestMe();
        if (me) {
          const normalized = normalizeAuthUser(me);
          saveUser(normalized);
          setUser(normalized);
        }
      } catch {
        // noop: backend may be unavailable at first load
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: AuthUser;
      };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error ?? "Ошибка входа" };
      }
      const normalized = normalizeAuthUser(data.user);
      saveUser(normalized);
      setUser(normalized);
      return { ok: true };
    } catch {
      return { ok: false, error: "Backend недоступен" };
    }
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: AuthUser;
      };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error ?? "Ошибка регистрации" };
      }
      const normalized = normalizeAuthUser(data.user);
      saveUser(normalized);
      setUser(normalized);
      return { ok: true };
    } catch {
      return { ok: false, error: "Backend недоступен" };
    }
  }, []);

  const logout = useCallback(() => {
    void fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      saveUser(null);
      setUser(null);
    });
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

async function requestMe(): Promise<AuthUser | null> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (res.status === 401) {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!refreshed.ok) return null;
    const retry = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!retry.ok) return null;
    const retryData = (await retry.json()) as { user?: AuthUser };
    return retryData.user ?? null;
  }
  if (!res.ok) return null;
  const data = (await res.json()) as { user?: AuthUser };
  return data.user ?? null;
}

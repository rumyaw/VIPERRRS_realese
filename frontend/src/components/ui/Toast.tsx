"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 350;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, EXIT_ANIMATION_MS);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-3"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const typeStyles: Record<ToastType, string> = {
  success:
    "border-emerald-400/40 shadow-[0_0_24px_rgba(16,185,129,0.12)]",
  error:
    "border-red-400/40 shadow-[0_0_24px_rgba(239,68,68,0.12)]",
  info:
    "border-blue-400/40 shadow-[0_0_24px_rgba(59,130,246,0.12)]",
};

const dotStyles: Record<ToastType, string> = {
  success: "bg-emerald-400",
  error: "bg-red-400",
  info: "bg-blue-400",
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = mounted && !toast.leaving;

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-80 items-start gap-3 rounded-2xl border bg-[var(--glass-bg)] px-4 py-3 backdrop-blur-xl transition-all duration-300 ease-out",
        typeStyles[toast.type],
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-8 opacity-0",
      )}
    >
      <span
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotStyles[toast.type])}
      />
      <p className="flex-1 text-sm leading-snug text-[var(--text-primary)]">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 text-[var(--text-secondary)] transition hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

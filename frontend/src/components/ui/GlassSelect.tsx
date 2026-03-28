"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type GlassSelectOption = { value: string; label: string };

type GlassSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  /** Обёртка: уже есть relative min-w-0 */
  className?: string;
  /** Стили кнопки (например glass-select + px/py + min-h) */
  buttonClassName?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/**
 * Выпадающий список вместо нативного &lt;select&gt;: панель не шире кнопки (важно для узких экранов).
 */
export function GlassSelect({
  value,
  onChange,
  options,
  className,
  buttonClassName,
  disabled,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? options[0]?.label ?? "";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
    queueMicrotask(() => btnRef.current?.focus());
  };

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "glass-select flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName,
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
      </button>
      {open && options.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={cn(
            "absolute left-0 right-0 top-full z-[60] mt-1 max-h-[min(50vh,18rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--glass-border)] py-1 shadow-lg",
            "bg-[var(--page-bg)] dark:bg-[#1a1a2e]",
          )}
        >
          {options.map((opt) => (
            <li key={opt.value === "" ? "__empty" : opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={cn(
                  "w-full break-words px-4 py-2.5 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--glass-bg-strong)]",
                  opt.value === value && "bg-[var(--glass-bg-strong)]",
                )}
                onClick={() => pick(opt.value)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

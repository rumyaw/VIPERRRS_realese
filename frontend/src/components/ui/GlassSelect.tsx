"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type GlassSelectOption = { value: string; label: string };

type ListRect = { top: number; left: number; width: number; maxHeight: number };

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

const DROPDOWN_Z = 10050;

function measureListRect(btn: HTMLElement): ListRect {
  const r = btn.getBoundingClientRect();
  const margin = 8;
  const below = r.bottom + 6;
  const spaceBelow = window.innerHeight - below - margin;
  const spaceAbove = r.top - margin;
  const maxPreferred = Math.min(window.innerHeight * 0.5, 18 * 16);
  let top = below;
  let maxHeight = Math.max(120, Math.min(spaceBelow, maxPreferred));
  if (spaceBelow < 160 && spaceAbove > spaceBelow) {
    maxHeight = Math.max(120, Math.min(spaceAbove - 10, maxPreferred));
    top = r.top - 6 - maxHeight;
  }
  return {
    top,
    left: r.left,
    width: r.width,
    maxHeight,
  };
}

/**
 * Выпадающий список вместо нативного &lt;select&gt;: панель не шире кнопки (важно для узких экранов).
 * Список рендерится в document.body (fixed), чтобы не прятался под соседними блоками / motion transform (Safari).
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
  const [listRect, setListRect] = useState<ListRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const selectedLabel = selected?.label ?? options[0]?.label ?? "";

  const updateRect = () => {
    const btn = btnRef.current;
    if (!btn) return;
    setListRect(measureListRect(btn));
  };

  useLayoutEffect(() => {
    if (!open) {
      setListRect(null);
      return;
    }
    updateRect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updateRect();
    const onResize = () => updateRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (rootRef.current?.contains(t)) return;
      if (t.closest?.("[data-glass-select-list]")) return;
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

  const listEl =
    open && options.length > 0 && listRect && typeof document !== "undefined"
      ? createPortal(
          <ul
            id={listId}
            data-glass-select-list
            role="listbox"
            tabIndex={-1}
            style={{
              position: "fixed",
              top: listRect.top,
              left: listRect.left,
              width: listRect.width,
              maxHeight: listRect.maxHeight,
              zIndex: DROPDOWN_Z,
            }}
            className={cn(
              "overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--glass-border)] py-1 shadow-lg",
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
          </ul>,
          document.body,
        )
      : null;

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
      {listEl}
    </div>
  );
}

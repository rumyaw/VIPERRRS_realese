/** Пастельные фоны + Tailwind dark:; в светлой теме текст дополнительно фиксируется в globals.css (.status-badge-pill). */

const iconInherit = "[&_svg]:text-current";
const pill = "status-badge-pill";

export const applicationStatusBadge = {
  pending:
    `${pill} border border-amber-800/35 bg-amber-200 !text-black shadow-sm ${iconInherit} dark:border-transparent dark:bg-amber-500/20 dark:!text-amber-100 dark:shadow-none`,
  accepted:
    `${pill} border border-emerald-800/35 bg-emerald-200 !text-black shadow-sm ${iconInherit} dark:border-transparent dark:bg-emerald-500/20 dark:!text-emerald-100 dark:shadow-none`,
  rejected:
    `${pill} border border-red-800/35 bg-red-200 !text-black shadow-sm ${iconInherit} dark:border-transparent dark:bg-red-500/20 dark:!text-red-100 dark:shadow-none`,
  reserve:
    `${pill} border border-sky-800/35 bg-sky-200 !text-black shadow-sm ${iconInherit} dark:border-transparent dark:bg-blue-500/20 dark:!text-blue-100 dark:shadow-none`,
} as const;

export const applicationActionButton = {
  accept:
    "border border-emerald-800/40 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:border-transparent dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/30",
  reject:
    "border border-red-800/40 bg-red-600 text-white shadow-sm hover:bg-red-700 dark:border-transparent dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/30",
  reserve:
    "border border-sky-800/40 bg-sky-600 text-white shadow-sm hover:bg-sky-700 dark:border-transparent dark:bg-blue-500/20 dark:text-blue-100 dark:hover:bg-blue-500/30",
} as const;

export const moderationStatusBadge = {
  approved:
    `${pill} border border-emerald-800/35 bg-emerald-200 !text-black shadow-sm ${iconInherit} dark:border-transparent dark:bg-emerald-500/15 dark:!text-emerald-200`,
  pending:
    `${pill} border border-amber-800/35 bg-amber-200 !text-black shadow-sm ${iconInherit} dark:border-transparent dark:bg-amber-500/15 dark:!text-amber-200`,
  rejected:
    `${pill} border border-red-800/35 bg-red-200 !text-black shadow-sm ${iconInherit} dark:border-transparent dark:bg-red-500/15 dark:!text-red-200`,
} as const;

export const moderationIconButton = {
  approve:
    "border border-emerald-900/30 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:border-transparent dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/35",
  reject:
    "border border-amber-900/30 bg-amber-600 text-white shadow-sm hover:bg-amber-700 dark:border-transparent dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/35",
  delete:
    "border border-red-900/30 bg-red-600 text-white shadow-sm hover:bg-red-700 dark:border-transparent dark:bg-red-500/20 dark:text-red-200 dark:hover:bg-red-500/35",
} as const;

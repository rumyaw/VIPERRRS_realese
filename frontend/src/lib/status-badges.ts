/** Пастельные фоны + Tailwind dark:; в светлой теме текст дополнительно фиксируется в globals.css (.status-badge-pill). */

const iconInherit = "[&_svg]:text-current";
const pill = "status-badge-pill";

export const applicationStatusBadge = {
  pending:
    `${pill} border border-amber-800/35 bg-amber-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-amber-500/20 dark:!text-amber-100 dark:shadow-none`,
  accepted:
    `${pill} border border-emerald-800/35 bg-emerald-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-emerald-500/20 dark:!text-emerald-100 dark:shadow-none`,
  rejected:
    `${pill} border border-red-800/35 bg-red-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-red-500/20 dark:!text-red-100 dark:shadow-none`,
  reserve:
    `${pill} border border-sky-800/35 bg-sky-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-blue-500/20 dark:!text-blue-100 dark:shadow-none`,
} as const;

const action = "application-action-btn";

export const applicationActionButton = {
  accept: `${action} inline-flex items-center justify-center gap-1.5 border border-emerald-800/40 bg-emerald-100/95 text-[#2d1a0e] shadow-sm [&_svg]:shrink-0 [&_svg]:text-current hover:bg-emerald-200/95 dark:border-transparent dark:bg-emerald-500/20 dark:!text-emerald-100 dark:hover:bg-emerald-500/30`,
  reject: `${action} inline-flex items-center justify-center gap-1.5 border border-red-800/40 bg-red-100/95 text-[#2d1a0e] shadow-sm [&_svg]:shrink-0 [&_svg]:text-current hover:bg-red-200/95 dark:border-transparent dark:bg-red-500/20 dark:!text-red-100 dark:hover:bg-red-500/30`,
  reserve: `${action} inline-flex items-center justify-center gap-1.5 border border-sky-800/40 bg-sky-100/95 text-[#2d1a0e] shadow-sm [&_svg]:shrink-0 [&_svg]:text-current hover:bg-sky-200/95 dark:border-transparent dark:bg-blue-500/20 dark:!text-blue-100 dark:hover:bg-blue-500/30`,
} as const;

export const moderationStatusBadge = {
  approved:
    `${pill} border border-emerald-800/35 bg-emerald-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-emerald-500/15 dark:!text-emerald-200`,
  pending:
    `${pill} border border-amber-800/35 bg-amber-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-amber-500/15 dark:!text-amber-200`,
  rejected:
    `${pill} border border-red-800/35 bg-red-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-red-500/15 dark:!text-red-200`,
  /** Правка к уже опубликованной карточке на проверке */
  revision_pending:
    `${pill} border border-violet-800/35 bg-violet-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-violet-500/15 dark:!text-violet-200`,
  revision_rejected:
    `${pill} border border-rose-800/35 bg-rose-200 text-[#2d1a0e] shadow-sm ${iconInherit} dark:border-transparent dark:bg-rose-500/15 dark:!text-rose-200`,
} as const;

export const moderationIconButton = {
  approve:
    "moderation-icon-pill inline-flex items-center justify-center rounded-lg border-2 border-emerald-800/50 bg-emerald-200 p-2 shadow-sm transition hover:bg-emerald-300/90 dark:border-transparent dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/35",
  reject:
    "moderation-icon-pill inline-flex items-center justify-center rounded-lg border-2 border-amber-800/50 bg-amber-200 p-2 shadow-sm transition hover:bg-amber-300/90 dark:border-transparent dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/35",
  delete:
    "moderation-icon-pill inline-flex items-center justify-center rounded-lg border-2 border-red-800/55 bg-red-200 p-2 shadow-sm transition hover:bg-red-300/90 dark:border-transparent dark:bg-red-500/20 dark:text-red-100 dark:hover:bg-red-500/35",
} as const;

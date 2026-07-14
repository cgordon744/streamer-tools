// Single source of truth for deal pipeline statuses and content types.
// The DB enums in src/modules/deals/schema.ts are derived from these arrays —
// adding a value here requires a companion migration (pnpm db:generate).

export const DEAL_STATUSES = [
  "pitched",
  "negotiating",
  "signed",
  "delivered",
  "paid",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  pitched: "Pitched",
  negotiating: "Negotiating",
  signed: "Signed",
  delivered: "Delivered",
  paid: "Paid",
};

// Tailwind classes for status badges, kept with the status definitions so a
// new status ships with its visual treatment in one edit.
export const DEAL_STATUS_BADGE_CLASSES: Record<DealStatus, string> = {
  pitched:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:border-slate-400/20",
  negotiating:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20",
  signed:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/20",
  delivered:
    "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/20",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20",
};

// Solid dot/accent color per status, used by the pipeline board column headers.
export const DEAL_STATUS_DOT_CLASSES: Record<DealStatus, string> = {
  pitched: "bg-slate-400",
  negotiating: "bg-amber-400",
  signed: "bg-blue-500 dark:bg-blue-400",
  delivered: "bg-violet-500 dark:bg-violet-400",
  paid: "bg-emerald-500 dark:bg-emerald-400",
};

export const CONTENT_TYPES = ["video", "short", "post"] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: "Video",
  short: "Short",
  post: "Post",
};

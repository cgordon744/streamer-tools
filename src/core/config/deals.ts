// Single source of truth for deal pipeline stages and content types
// (CHASSIS_SPEC §4: config-driven enums). Values are stored as plain text in
// the DB — adding or renaming a stage is an edit here plus a data backfill if
// existing rows use the old value; no schema migration.

export const DEAL_STATUSES = [
  "lead",
  "negotiating",
  "contract_signed",
  "content_delivered",
  "invoiced",
  "paid",
  "dead",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  lead: "Lead",
  negotiating: "Negotiating",
  contract_signed: "Contract Signed",
  content_delivered: "Content Delivered",
  invoiced: "Invoiced",
  paid: "Paid",
  dead: "Dead",
};

// Stages where the content obligation is complete — deliverable deadlines no
// longer create urgency.
export const CONTENT_DONE_STATUSES: readonly DealStatus[] = [
  "content_delivered",
  "invoiced",
  "paid",
];

// Stages that take a deal out of the active pipeline (nothing left to chase).
export const TERMINAL_DEAL_STATUSES: readonly DealStatus[] = ["paid", "dead"];

// Tailwind classes for status badges, kept with the status definitions so a
// new status ships with its visual treatment in one edit.
export const DEAL_STATUS_BADGE_CLASSES: Record<DealStatus, string> = {
  lead: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400/10 dark:text-slate-300 dark:border-slate-400/20",
  negotiating:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20",
  contract_signed:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:border-blue-400/20",
  content_delivered:
    "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-400/10 dark:text-violet-300 dark:border-violet-400/20",
  invoiced:
    "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-400/10 dark:text-cyan-300 dark:border-cyan-400/20",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20",
  dead: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-400/10 dark:text-zinc-400 dark:border-zinc-400/20",
};

// Solid dot/accent color per status, used by the pipeline board column headers.
export const DEAL_STATUS_DOT_CLASSES: Record<DealStatus, string> = {
  lead: "bg-slate-400",
  negotiating: "bg-amber-400",
  contract_signed: "bg-blue-500 dark:bg-blue-400",
  content_delivered: "bg-violet-500 dark:bg-violet-400",
  invoiced: "bg-cyan-500 dark:bg-cyan-400",
  paid: "bg-emerald-500 dark:bg-emerald-400",
  dead: "bg-zinc-400",
};

export const CONTENT_TYPES = ["video", "short", "post"] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: "Video",
  short: "Short",
  post: "Post",
};

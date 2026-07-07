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
  pitched: "bg-slate-100 text-slate-700 border-slate-200",
  negotiating: "bg-amber-100 text-amber-800 border-amber-200",
  signed: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-violet-100 text-violet-800 border-violet-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const CONTENT_TYPES = ["video", "short", "post"] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: "Video",
  short: "Short",
  post: "Post",
};

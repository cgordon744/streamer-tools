// Due dates are stored as plain YYYY-MM-DD strings (Postgres `date`).
// Format without constructing a Date at UTC midnight to avoid off-by-one
// rendering in western timezones.
export function formatDueDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export type DueUrgency = "overdue" | "soon" | "normal";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Rendered server-side and passed down so server and client agree on "today".
export function todayIso(): string {
  return toIso(new Date());
}

// "soon" = within the next 7 days. YYYY-MM-DD compares lexicographically,
// so plain string comparison is correct and timezone-free.
export function dueUrgency(isoDate: string, today: string): DueUrgency {
  if (isoDate < today) return "overdue";
  const [year, month, day] = today.split("-").map(Number);
  const weekOut = new Date(year, month - 1, day + 7);
  if (isoDate <= toIso(weekOut)) return "soon";
  return "normal";
}

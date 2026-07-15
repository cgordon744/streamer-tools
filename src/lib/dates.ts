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
// Uses the server's clock/zone — only correct as a fallback; request-scoped
// code should go through core/time's getToday(), which knows the user's zone.
export function todayIso(): string {
  return toIso(new Date());
}

// Today's date in an IANA timezone ("America/Denver"). en-CA formats as
// YYYY-MM-DD. The zone comes from a client-writable cookie, so an invalid
// value must fall back rather than throw.
export function todayInTimeZone(timeZone: string | undefined): string {
  if (timeZone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch {
      // Unknown zone — fall through to the server clock.
    }
  }
  return todayIso();
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

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

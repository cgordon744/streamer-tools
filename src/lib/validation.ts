// Form fields arrive as "" when left blank; store them as NULL instead.
export function emptyToNull(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

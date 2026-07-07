const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(cents: number): string {
  return usdFormatter.format(cents / 100);
}

// "1,234.56" -> 123456. Returns null for anything that isn't a plain positive
// dollar amount with at most two decimal places.
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [dollars, decimals = ""] = cleaned.split(".");
  return Number(dollars) * 100 + Number(decimals.padEnd(2, "0") || "0");
}

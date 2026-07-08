import { describe, expect, it } from "vitest";

import { formatCents, parseDollarsToCents } from "./money";

describe("formatCents", () => {
  it("formats whole dollars with grouping", () => {
    expect(formatCents(150000)).toBe("$1,500.00");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats sub-dollar amounts", () => {
    expect(formatCents(65)).toBe("$0.65");
  });
});

describe("parseDollarsToCents", () => {
  it("parses a plain integer", () => {
    expect(parseDollarsToCents("1500")).toBe(150000);
  });

  it("parses commas and decimals", () => {
    expect(parseDollarsToCents("1,500.00")).toBe(150000);
  });

  it("parses a leading dollar sign", () => {
    expect(parseDollarsToCents("$25")).toBe(2500);
  });

  it("pads a single decimal digit", () => {
    expect(parseDollarsToCents("0.5")).toBe(50);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDollarsToCents("  12.34 ")).toBe(1234);
  });

  it("rejects more than two decimal places", () => {
    expect(parseDollarsToCents("1.234")).toBeNull();
  });

  it("rejects negative amounts", () => {
    expect(parseDollarsToCents("-5")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseDollarsToCents("")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseDollarsToCents("abc")).toBeNull();
  });
});

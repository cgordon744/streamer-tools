import { describe, expect, it } from "vitest";

import { daysPastDue, isPaymentOverdue } from "./payments";

const TODAY = "2026-07-14";

function fields(overrides = {}) {
  return {
    status: "invoiced" as const,
    paymentStatus: "invoiced" as const,
    paymentDueDate: "2026-07-01",
    ...overrides,
  };
}

describe("isPaymentOverdue", () => {
  it("flags an unpaid deal whose due date has passed", () => {
    expect(isPaymentOverdue(fields(), TODAY)).toBe(true);
  });

  it("flags an overdue deal even before it has been invoiced", () => {
    expect(
      isPaymentOverdue(fields({ paymentStatus: "not_invoiced" }), TODAY),
    ).toBe(true);
  });

  it("does not flag a paid deal", () => {
    expect(isPaymentOverdue(fields({ paymentStatus: "paid" }), TODAY)).toBe(
      false,
    );
  });

  it("does not flag a dead deal", () => {
    expect(isPaymentOverdue(fields({ status: "dead" }), TODAY)).toBe(false);
  });

  it("does not flag a deal with no payment due date", () => {
    expect(isPaymentOverdue(fields({ paymentDueDate: null }), TODAY)).toBe(
      false,
    );
  });

  it("does not flag a due date of today (due, not overdue)", () => {
    expect(isPaymentOverdue(fields({ paymentDueDate: TODAY }), TODAY)).toBe(
      false,
    );
  });

  it("does not flag a future due date", () => {
    expect(
      isPaymentOverdue(fields({ paymentDueDate: "2026-08-01" }), TODAY),
    ).toBe(false);
  });
});

describe("daysPastDue", () => {
  it("counts whole days between due date and today", () => {
    expect(daysPastDue("2026-07-01", TODAY)).toBe(13);
    expect(daysPastDue("2026-07-13", TODAY)).toBe(1);
    expect(daysPastDue(TODAY, TODAY)).toBe(0);
  });

  it("is negative for future dates", () => {
    expect(daysPastDue("2026-07-16", TODAY)).toBe(-2);
  });

  it("crosses month and year boundaries correctly", () => {
    expect(daysPastDue("2026-06-30", "2026-07-01")).toBe(1);
    expect(daysPastDue("2025-12-31", "2026-01-01")).toBe(1);
  });
});

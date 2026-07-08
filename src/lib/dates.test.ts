import { describe, expect, it } from "vitest";

import { dueUrgency, formatDueDate, formatShortDate, todayIso } from "./dates";

describe("formatDueDate", () => {
  it("formats an ISO date without timezone drift", () => {
    expect(formatDueDate("2026-07-15")).toBe("Jul 15, 2026");
  });

  it("formats the first of a month (UTC-midnight off-by-one guard)", () => {
    expect(formatDueDate("2026-08-01")).toBe("Aug 1, 2026");
  });

  it("renders a dash for null", () => {
    expect(formatDueDate(null)).toBe("—");
  });
});

describe("formatShortDate", () => {
  it("formats without the year", () => {
    expect(formatShortDate("2026-07-15")).toBe("Jul 15");
  });
});

describe("todayIso", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("dueUrgency", () => {
  const today = "2026-07-07";

  it("flags past dates as overdue", () => {
    expect(dueUrgency("2026-07-06", today)).toBe("overdue");
  });

  it("flags today as soon", () => {
    expect(dueUrgency("2026-07-07", today)).toBe("soon");
  });

  it("flags exactly seven days out as soon", () => {
    expect(dueUrgency("2026-07-14", today)).toBe("soon");
  });

  it("flags eight days out as normal", () => {
    expect(dueUrgency("2026-07-15", today)).toBe("normal");
  });

  it("handles month boundaries", () => {
    expect(dueUrgency("2026-08-02", "2026-07-28")).toBe("soon");
    expect(dueUrgency("2026-08-05", "2026-07-28")).toBe("normal");
  });
});

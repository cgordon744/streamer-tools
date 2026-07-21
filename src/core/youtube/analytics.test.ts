import { describe, expect, it } from "vitest";

import {
  createStubAnalyticsClient,
  mapCountryRows,
  mapViewerPercentageRows,
} from "@/core/youtube/analytics";

describe("mapViewerPercentageRows", () => {
  it("collapses age×gender cells into each axis", () => {
    const rows = [
      ["age18-24", "male", 30],
      ["age18-24", "female", 12],
      ["age25-34", "male", 28],
      ["age25-34", "female", 20],
      ["age35-44", "male", 6],
      ["age35-44", "female", 4],
    ];
    const { ageGroups, genders } = mapViewerPercentageRows(rows);
    expect(ageGroups).toEqual([
      { range: "25-34", pct: 48 },
      { range: "18-24", pct: 42 },
      { range: "35-44", pct: 10 },
    ]);
    expect(genders).toEqual([
      { group: "male", pct: 64 },
      { group: "female", pct: 36 },
    ]);
  });

  it("sorts buckets by share descending", () => {
    const { ageGroups } = mapViewerPercentageRows([
      ["age45-54", "male", 5],
      ["age18-24", "male", 60],
      ["age25-34", "male", 35],
    ]);
    expect(ageGroups.map((g) => g.range)).toEqual(["18-24", "25-34", "45-54"]);
  });

  it("normalizes user_specified to other and skips non-numeric cells", () => {
    const { genders } = mapViewerPercentageRows([
      ["age18-24", "male", 50],
      ["age18-24", "user_specified", 3],
      ["age18-24", "female", "not-a-number"],
    ]);
    expect(genders).toEqual([
      { group: "male", pct: 50 },
      { group: "other", pct: 3 },
    ]);
  });

  it("handles an empty report (no demographic data)", () => {
    expect(mapViewerPercentageRows([])).toEqual({
      ageGroups: [],
      genders: [],
    });
  });
});

describe("mapCountryRows", () => {
  it("converts views to share of total, sorted, top 5 only", () => {
    const rows = [
      ["US", 500],
      ["GB", 200],
      ["CA", 100],
      ["AU", 80],
      ["DE", 70],
      ["FR", 50],
    ];
    const countries = mapCountryRows(rows);
    expect(countries).toHaveLength(5);
    expect(countries[0].code).toBe("US");
    expect(countries[0].pct).toBe(50);
    expect(countries.map((c) => c.code)).not.toContain("FR");
    const total = countries.reduce((sum, c) => sum + c.pct, 0);
    expect(total).toBeLessThanOrEqual(100);
  });

  it("returns empty for zero or missing views", () => {
    expect(mapCountryRows([])).toEqual([]);
    expect(mapCountryRows([["US", 0]])).toEqual([]);
  });
});

describe("stub analytics client", () => {
  it("is deterministic for the same seed", async () => {
    const a = await createStubAnalyticsClient("user-1").fetchDemographics("");
    const b = await createStubAnalyticsClient("user-1").fetchDemographics("");
    expect(a).toEqual(b);
  });

  it("varies by seed", async () => {
    const a = await createStubAnalyticsClient("user-1").fetchDemographics("");
    const b = await createStubAnalyticsClient("user-234").fetchDemographics("");
    expect(a).not.toEqual(b);
  });

  it("produces complete, plausible demographics", async () => {
    const d = await createStubAnalyticsClient("seed").fetchDemographics("");
    const ageTotal = d.ageGroups.reduce((sum, g) => sum + g.pct, 0);
    expect(ageTotal).toBe(100);
    const genderTotal = d.genders.reduce((sum, g) => sum + g.pct, 0);
    expect(genderTotal).toBe(100);
    expect(d.topCountries.length).toBeGreaterThan(0);
    expect(d.topCountries[0].code).toBe("US");
    expect(d.windowDays).toBe(90);
  });
});

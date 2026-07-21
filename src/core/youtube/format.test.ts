import { describe, expect, it } from "vitest";

import type { ChannelDemographics } from "@/core/youtube/analytics";
import {
  formatAudienceAge,
  formatAudienceGender,
  formatAudienceGeo,
  formatDemographics,
} from "@/core/youtube/format";

function demographics(
  overrides: Partial<ChannelDemographics> = {},
): ChannelDemographics {
  return {
    ageGroups: [
      { range: "18-24", pct: 42.4 },
      { range: "25-34", pct: 31.2 },
      { range: "35-44", pct: 26.4 },
    ],
    genders: [
      { group: "male", pct: 61.7 },
      { group: "female", pct: 35.8 },
      { group: "other", pct: 2.5 },
    ],
    topCountries: [
      { code: "US", pct: 44.2 },
      { code: "GB", pct: 12.1 },
      { code: "CA", pct: 6.8 },
      { code: "AU", pct: 4.1 },
    ],
    windowDays: 90,
    ...overrides,
  };
}

describe("formatAudienceAge", () => {
  it("shows the top two buckets with rounded percentages and en dashes", () => {
    expect(formatAudienceAge(demographics())).toBe("18–24 (42%) · 25–34 (31%)");
  });

  it("renders the open-ended bucket as 65+", () => {
    expect(
      formatAudienceAge(
        demographics({ ageGroups: [{ range: "65-", pct: 80 }] }),
      ),
    ).toBe("65+ (80%)");
  });

  it("drops buckets that round to zero and returns null when empty", () => {
    expect(
      formatAudienceAge(
        demographics({
          ageGroups: [
            { range: "18-24", pct: 99.6 },
            { range: "25-34", pct: 0.4 },
          ],
        }),
      ),
    ).toBe("18–24 (100%)");
    expect(formatAudienceAge(demographics({ ageGroups: [] }))).toBeNull();
  });
});

describe("formatAudienceGender", () => {
  it("shows the top two groups", () => {
    expect(formatAudienceGender(demographics())).toBe("62% male / 36% female");
  });

  it("returns null when empty", () => {
    expect(formatAudienceGender(demographics({ genders: [] }))).toBeNull();
  });
});

describe("formatAudienceGeo", () => {
  it("shows the top three countries with display names", () => {
    expect(formatAudienceGeo(demographics())).toBe(
      "United States 44% · United Kingdom 12% · Canada 7%",
    );
  });

  it("falls back to the code when the region can't be named", () => {
    // Malformed code — Intl.DisplayNames throws, format catches and echoes.
    expect(
      formatAudienceGeo(
        demographics({ topCountries: [{ code: "Z9", pct: 50 }] }),
      ),
    ).toBe("Z9 50%");
  });

  it("returns null when empty", () => {
    expect(formatAudienceGeo(demographics({ topCountries: [] }))).toBeNull();
  });
});

describe("formatDemographics", () => {
  it("bundles all three display strings", () => {
    expect(formatDemographics(demographics())).toEqual({
      audienceAge: "18–24 (42%) · 25–34 (31%)",
      audienceGender: "62% male / 36% female",
      audienceGeo: "United States 44% · United Kingdom 12% · Canada 7%",
    });
  });
});

import { describe, expect, it } from "vitest";

import { kitInputSchema } from "@/domains/media-kit/validation";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    template: "classic",
    niche: "Tech reviews",
    pitch: "I review gadgets.",
    audienceAge: "18–34",
    audienceGender: "70% male",
    audienceGeo: "US, UK",
    contactEmail: "creator@example.com",
    accentColor: "#7c3aed",
    rateCard: [{ label: "Dedicated video", price: "$2,500" }],
    brandHighlights: ["1M views on sponsored series"],
    showVerifiedSponsors: true,
    ...overrides,
  };
}

describe("kitInputSchema", () => {
  it("accepts a complete kit", () => {
    expect(kitInputSchema.safeParse(baseInput()).success).toBe(true);
  });

  it("accepts an empty kit (everything optional except template/toggle)", () => {
    const result = kitInputSchema.safeParse(
      baseInput({
        niche: "",
        pitch: "",
        audienceAge: "",
        audienceGender: "",
        audienceGeo: "",
        contactEmail: "",
        accentColor: "",
        rateCard: [],
        brandHighlights: [],
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.niche).toBeNull();
      expect(result.data.contactEmail).toBeNull();
      expect(result.data.accentColor).toBeNull();
    }
  });

  it("rejects an unknown template", () => {
    expect(
      kitInputSchema.safeParse(baseInput({ template: "vaporwave" })).success,
    ).toBe(false);
  });

  it("rejects an invalid contact email", () => {
    expect(
      kitInputSchema.safeParse(baseInput({ contactEmail: "not-an-email" }))
        .success,
    ).toBe(false);
  });

  it("rejects a malformed accent color", () => {
    expect(
      kitInputSchema.safeParse(baseInput({ accentColor: "purple" })).success,
    ).toBe(false);
    expect(
      kitInputSchema.safeParse(baseInput({ accentColor: "#fff" })).success,
    ).toBe(false);
  });

  it("rejects rate lines missing a label or price", () => {
    expect(
      kitInputSchema.safeParse(
        baseInput({ rateCard: [{ label: "", price: "$1" }] }),
      ).success,
    ).toBe(false);
    expect(
      kitInputSchema.safeParse(
        baseInput({ rateCard: [{ label: "Video", price: "" }] }),
      ).success,
    ).toBe(false);
  });

  it("caps rate lines and highlights at 12", () => {
    const line = { label: "Video", price: "$1" };
    expect(
      kitInputSchema.safeParse(baseInput({ rateCard: Array(13).fill(line) }))
        .success,
    ).toBe(false);
    expect(
      kitInputSchema.safeParse(
        baseInput({ brandHighlights: Array(13).fill("hit") }),
      ).success,
    ).toBe(false);
  });
});

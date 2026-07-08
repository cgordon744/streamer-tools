import { describe, expect, it } from "vitest";

import { sponsorInputSchema } from "./validation";

describe("sponsorInputSchema", () => {
  it("parses a minimal sponsor, nulling blank optionals", () => {
    const result = sponsorInputSchema.safeParse({
      name: "NordVPN",
      contactName: "",
      contactEmail: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "NordVPN",
        contactName: null,
        contactEmail: null,
        notes: null,
      });
    }
  });

  it("trims the name", () => {
    const result = sponsorInputSchema.safeParse({
      name: "  Squarespace  ",
      contactName: "",
      contactEmail: "",
      notes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Squarespace");
    }
  });

  it("rejects a blank name", () => {
    const result = sponsorInputSchema.safeParse({
      name: "  ",
      contactName: "",
      contactEmail: "",
      notes: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid contact email", () => {
    const result = sponsorInputSchema.safeParse({
      name: "NordVPN",
      contactName: "",
      contactEmail: "not-an-email",
      notes: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid contact email", () => {
    const result = sponsorInputSchema.safeParse({
      name: "NordVPN",
      contactName: "Mara",
      contactEmail: "mara@example.com",
      notes: "",
    });
    expect(result.success).toBe(true);
  });
});

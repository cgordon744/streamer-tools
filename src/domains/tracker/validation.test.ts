import { describe, expect, it } from "vitest";

import { dealInputSchema, sponsorInputSchema } from "./validation";

const SPONSOR_ID = "6a46993c-4ffd-42d5-a412-6a966240dcfb";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    sponsorId: SPONSOR_ID,
    status: "lead",
    amount: "1,500.00",
    contentType: "video",
    deliverableDueDate: "",
    paymentDueDate: "",
    notes: "",
    ...overrides,
  };
}

describe("dealInputSchema", () => {
  it("parses a valid form and converts the amount to cents", () => {
    const result = dealInputSchema.safeParse(baseInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(150000);
      expect(result.data.deliverableDueDate).toBeNull();
      expect(result.data.paymentDueDate).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("keeps provided dates and notes", () => {
    const result = dealInputSchema.safeParse(
      baseInput({
        deliverableDueDate: "2026-08-01",
        paymentDueDate: "2026-09-01",
        notes: "  two videos  ",
      }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliverableDueDate).toBe("2026-08-01");
      expect(result.data.paymentDueDate).toBe("2026-09-01");
      expect(result.data.notes).toBe("two videos");
    }
  });

  it("rejects a malformed amount with a helpful message", () => {
    const result = dealInputSchema.safeParse(baseInput({ amount: "12.345" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/dollar amount/i);
    }
  });

  it("rejects an empty amount", () => {
    const result = dealInputSchema.safeParse(baseInput({ amount: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = dealInputSchema.safeParse(baseInput({ status: "ghosted" }));
    expect(result.success).toBe(false);
  });

  it("rejects an unknown content type", () => {
    const result = dealInputSchema.safeParse(
      baseInput({ contentType: "podcast" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid sponsor id", () => {
    const result = dealInputSchema.safeParse(
      baseInput({ sponsorId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const result = dealInputSchema.safeParse(
      baseInput({ deliverableDueDate: "08/01/2026" }),
    );
    expect(result.success).toBe(false);
  });
});
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

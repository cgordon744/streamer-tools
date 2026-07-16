import { describe, expect, it } from "vitest";

import { signupInputSchema } from "@/core/auth/validation";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Creator Casey",
    email: "casey@example.com",
    password: "long-enough-password",
    confirmPassword: "long-enough-password",
    ...overrides,
  };
}

describe("signupInputSchema", () => {
  it("accepts a valid signup", () => {
    const result = signupInputSchema.safeParse(baseInput());
    expect(result.success).toBe(true);
  });

  it("trims and lowercases the email", () => {
    const result = signupInputSchema.safeParse(
      baseInput({ email: "  Casey@Example.COM " }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("casey@example.com");
    }
  });

  it("trims the name", () => {
    const result = signupInputSchema.safeParse(baseInput({ name: "  Casey " }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Casey");
    }
  });

  it("rejects an invalid email", () => {
    const result = signupInputSchema.safeParse(
      baseInput({ email: "not-an-email" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    const result = signupInputSchema.safeParse(baseInput({ name: "   " }));
    expect(result.success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const result = signupInputSchema.safeParse(
      baseInput({ password: "short12", confirmPassword: "short12" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 8/i);
    }
  });

  it("rejects mismatched password confirmation", () => {
    const result = signupInputSchema.safeParse(
      baseInput({ confirmPassword: "different-password" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/match/i);
    }
  });

  it("rejects missing fields", () => {
    const result = signupInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

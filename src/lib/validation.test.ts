import { describe, expect, it } from "vitest";

import { emptyToNull } from "./validation";

describe("emptyToNull", () => {
  it("converts an empty string to null", () => {
    expect(emptyToNull("")).toBeNull();
  });

  it("converts a whitespace-only string to null", () => {
    expect(emptyToNull("   ")).toBeNull();
  });

  it("passes through non-empty strings", () => {
    expect(emptyToNull("hello")).toBe("hello");
  });

  it("passes through non-strings untouched", () => {
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull(0)).toBe(0);
    expect(emptyToNull(undefined)).toBeUndefined();
  });
});

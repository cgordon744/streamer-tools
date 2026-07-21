import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { open, seal } from "@/core/crypto/secretbox";

describe("secretbox", () => {
  let savedSecret: string | undefined;

  beforeEach(() => {
    savedSecret = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "test-secret-for-unit-tests";
  });

  afterEach(() => {
    if (savedSecret !== undefined) process.env.AUTH_SECRET = savedSecret;
    else delete process.env.AUTH_SECRET;
  });

  it("round-trips plaintext", () => {
    const sealed = seal("1//refresh-token-value");
    expect(sealed).not.toContain("refresh-token-value");
    expect(open(sealed)).toBe("1//refresh-token-value");
  });

  it("round-trips unicode", () => {
    expect(open(seal("токен-🎬"))).toBe("токен-🎬");
  });

  it("produces distinct ciphertexts for the same plaintext (fresh IV)", () => {
    expect(seal("same")).not.toBe(seal("same"));
  });

  it("returns null for tampered ciphertext", () => {
    const sealed = seal("secret");
    const raw = Buffer.from(sealed, "base64");
    raw[raw.length - 1] ^= 0xff;
    expect(open(raw.toString("base64"))).toBeNull();
  });

  it("returns null for truncated or garbage input", () => {
    expect(open("")).toBeNull();
    expect(open("AAAA")).toBeNull();
    expect(open("not-base64-!!!")).toBeNull();
  });

  it("returns null when opened under a different key", () => {
    const sealed = seal("secret");
    process.env.AUTH_SECRET = "a-different-secret";
    expect(open(sealed)).toBeNull();
  });

  it("throws when AUTH_SECRET is missing", () => {
    delete process.env.AUTH_SECRET;
    expect(() => seal("x")).toThrow(/AUTH_SECRET/);
  });
});

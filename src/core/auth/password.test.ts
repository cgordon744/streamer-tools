import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the original password and rejects others", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).not.toContain("correct horse");
    await expect(
      verifyPassword("correct horse battery staple", hash),
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  }, 15000);

  it("produces unique salts per hash", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same input"),
      hashPassword("same input"),
    ]);
    expect(a).not.toBe(b);
  }, 15000);
});

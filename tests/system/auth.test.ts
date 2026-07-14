import { describe, expect, it } from "vitest";

import { getDb } from "@/core/db/client";
import { users } from "@/core/db/schema";
import { findUserByEmail } from "@/core/auth/service";

describe("auth service", () => {
  it("finds a user regardless of email casing in the query", async () => {
    await getDb().insert(users).values({
      email: "casing@test.example",
      name: "Casing Test",
      passwordHash: "not-a-real-hash",
    });

    const found = await findUserByEmail("  CASING@Test.Example ");
    expect(found?.email).toBe("casing@test.example");
  });

  it("returns null for an unknown email", async () => {
    expect(await findUserByEmail("nobody@test.example")).toBeNull();
  });
});

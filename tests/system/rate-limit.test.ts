import { describe, expect, it } from "vitest";

import {
  clientIp,
  isRateLimited,
  MAX_ATTEMPTS,
  recordFailedLogin,
  WINDOW_MINUTES,
} from "@/core/auth/rate-limit";
import { loginAttempts } from "@/core/auth/schema";
import { getDb } from "@/core/db/client";
import { eq } from "drizzle-orm";

// Unique per test so runs against the shared test DB never collide.
let counter = 0;
function testIp(): string {
  counter += 1;
  return `test-ip-${process.pid}-${counter}`;
}

async function insertAttemptAt(ip: string, createdAt: Date): Promise<void> {
  await getDb().insert(loginAttempts).values({ ip, createdAt });
}

describe("login rate limiting", () => {
  it("allows attempts below the cap", async () => {
    const ip = testIp();
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      await recordFailedLogin(ip);
    }
    expect(await isRateLimited(ip)).toBe(false);
  });

  it("blocks once the cap is reached", async () => {
    const ip = testIp();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailedLogin(ip);
    }
    expect(await isRateLimited(ip)).toBe(true);
  });

  it("ignores attempts older than the window", async () => {
    const ip = testIp();
    const stale = new Date(Date.now() - (WINDOW_MINUTES + 1) * 60_000);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await insertAttemptAt(ip, stale);
    }
    expect(await isRateLimited(ip)).toBe(false);
  });

  it("scopes the cap per IP", async () => {
    const blocked = testIp();
    const other = testIp();
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await recordFailedLogin(blocked);
    }
    expect(await isRateLimited(blocked)).toBe(true);
    expect(await isRateLimited(other)).toBe(false);
  });

  it("prunes attempts older than a day on write", async () => {
    const ip = testIp();
    await insertAttemptAt(ip, new Date(Date.now() - 2 * 86_400_000));
    await recordFailedLogin(testIp());

    const remaining = await getDb()
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.ip, ip));
    expect(remaining).toHaveLength(0);
  });
});

describe("clientIp", () => {
  it("takes the leftmost x-forwarded-for entry", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    expect(clientIp(request)).toBe("203.0.113.9");
  });

  it("falls back when the header is absent", () => {
    expect(clientIp(new Request("http://localhost"))).toBe("unknown");
  });
});

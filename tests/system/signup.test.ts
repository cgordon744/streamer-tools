import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { verifyPassword } from "@/core/auth/password";
import {
  isSignupRateLimited,
  recordSignup,
  SIGNUP_MAX_ATTEMPTS,
  SIGNUP_WINDOW_MINUTES,
} from "@/core/auth/rate-limit";
import { signupAttempts, users } from "@/core/auth/schema";
import { findUserByEmail, registerUser } from "@/core/auth/service";
import { getDb } from "@/core/db/client";
import { events } from "@/core/events/schema";

// Unique per test so runs against the shared test DB never collide.
let counter = 0;
function testEmail(): string {
  counter += 1;
  return `signup${counter}-${process.pid}@test.example`;
}
function testIp(): string {
  counter += 1;
  return `signup-ip-${process.pid}-${counter}`;
}

describe("registerUser", () => {
  it("creates a user with a verifiable password hash", async () => {
    const email = testEmail();
    const result = await registerUser({
      email,
      name: "New Creator",
      password: "long-enough-password",
    });

    expect(result.ok).toBe(true);
    const user = await findUserByEmail(email);
    expect(user).not.toBeNull();
    expect(user!.name).toBe("New Creator");
    expect(user!.passwordHash).not.toBe("long-enough-password");
    expect(
      await verifyPassword("long-enough-password", user!.passwordHash),
    ).toBe(true);
  });

  it("normalizes the email on insert", async () => {
    const email = testEmail();
    const result = await registerUser({
      email: `  ${email.toUpperCase()}  `,
      name: "Shouty Creator",
      password: "long-enough-password",
    });

    expect(result.ok).toBe(true);
    expect(await findUserByEmail(email)).not.toBeNull();
  });

  it("tracks a signup event for the new user", async () => {
    const result = await registerUser({
      email: testEmail(),
      name: "Tracked Creator",
      password: "long-enough-password",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = await getDb()
      .select()
      .from(events)
      .where(and(eq(events.userId, result.userId), eq(events.event, "signup")));
    expect(rows).toHaveLength(1);
  });

  it("rejects a duplicate email", async () => {
    const email = testEmail();
    await registerUser({
      email,
      name: "First",
      password: "long-enough-password",
    });
    const second = await registerUser({
      email,
      name: "Second",
      password: "other-long-password",
    });

    expect(second).toEqual({ ok: false, error: "email_taken" });
    const rows = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email));
    expect(rows).toHaveLength(1);
  });

  it("rejects a duplicate that differs only in case/whitespace", async () => {
    const email = testEmail();
    await registerUser({
      email,
      name: "First",
      password: "long-enough-password",
    });
    const second = await registerUser({
      email: ` ${email.toUpperCase()} `,
      name: "Second",
      password: "other-long-password",
    });

    expect(second).toEqual({ ok: false, error: "email_taken" });
  });

  it("survives a concurrent duplicate race — exactly one wins", async () => {
    const email = testEmail();
    const results = await Promise.all([
      registerUser({ email, name: "A", password: "long-enough-password" }),
      registerUser({ email, name: "B", password: "long-enough-password" }),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
    const rows = await getDb()
      .select()
      .from(users)
      .where(eq(users.email, email));
    expect(rows).toHaveLength(1);
  });
});

describe("signup rate limiting", () => {
  async function insertSignupAt(ip: string, createdAt: Date): Promise<void> {
    await getDb().insert(signupAttempts).values({ ip, createdAt });
  }

  it("allows signups below the cap", async () => {
    const ip = testIp();
    for (let i = 0; i < SIGNUP_MAX_ATTEMPTS - 1; i++) {
      await recordSignup(ip);
    }
    expect(await isSignupRateLimited(ip)).toBe(false);
  });

  it("blocks once the cap is reached", async () => {
    const ip = testIp();
    for (let i = 0; i < SIGNUP_MAX_ATTEMPTS; i++) {
      await recordSignup(ip);
    }
    expect(await isSignupRateLimited(ip)).toBe(true);
  });

  it("ignores signups older than the window", async () => {
    const ip = testIp();
    const stale = new Date(Date.now() - (SIGNUP_WINDOW_MINUTES + 1) * 60_000);
    for (let i = 0; i < SIGNUP_MAX_ATTEMPTS; i++) {
      await insertSignupAt(ip, stale);
    }
    expect(await isSignupRateLimited(ip)).toBe(false);
  });

  it("scopes the cap per IP", async () => {
    const blocked = testIp();
    const other = testIp();
    for (let i = 0; i < SIGNUP_MAX_ATTEMPTS; i++) {
      await recordSignup(blocked);
    }
    expect(await isSignupRateLimited(blocked)).toBe(true);
    expect(await isSignupRateLimited(other)).toBe(false);
  });

  it("prunes signups older than a day on write", async () => {
    const ip = testIp();
    await insertSignupAt(ip, new Date(Date.now() - 2 * 86_400_000));
    await recordSignup(testIp());

    const remaining = await getDb()
      .select()
      .from(signupAttempts)
      .where(eq(signupAttempts.ip, ip));
    expect(remaining).toHaveLength(0);
  });
});

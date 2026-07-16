import { and, count, eq, gt, lt } from "drizzle-orm";

import { loginAttempts, signupAttempts } from "@/core/auth/schema";
import { getDb } from "@/core/db/client";

// Login rate limiting: at most MAX_ATTEMPTS failed logins per IP per window.
// DB-backed because serverless instances share no memory. bcrypt already
// makes each guess ~100ms of work; this is the standard cap on top.
// Deliberately framework-free (no next-auth import) so it stays testable
// outside the Next runtime; the RateLimitedError thrown on a hit lives with
// the authorize wiring in src/auth.ts.

export const MAX_ATTEMPTS = 10;
export const WINDOW_MINUTES = 15;

function windowStart(): Date {
  return new Date(Date.now() - WINDOW_MINUTES * 60_000);
}

export async function isRateLimited(ip: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ attempts: count() })
    .from(loginAttempts)
    .where(
      and(eq(loginAttempts.ip, ip), gt(loginAttempts.createdAt, windowStart())),
    );
  return row.attempts >= MAX_ATTEMPTS;
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const db = getDb();
  await db.insert(loginAttempts).values({ ip });
  // Opportunistic prune so the table never accumulates (contrast with
  // `events`, which is append-only on purpose): anything past the window is
  // dead weight. A day's grace keeps the delete cheap and off the hot path
  // of the index scan above.
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, new Date(Date.now() - 86_400_000)));
}

// Signup rate limiting: at most SIGNUP_MAX_ATTEMPTS accounts per IP per
// window. Counts *successful* creations (recorded by the signup action), not
// failures — the abuse being capped is mass account creation, and a human
// who typo-fails validation five times shouldn't be locked out.
export const SIGNUP_MAX_ATTEMPTS = 5;
export const SIGNUP_WINDOW_MINUTES = 60;

export async function isSignupRateLimited(ip: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ attempts: count() })
    .from(signupAttempts)
    .where(
      and(
        eq(signupAttempts.ip, ip),
        gt(
          signupAttempts.createdAt,
          new Date(Date.now() - SIGNUP_WINDOW_MINUTES * 60_000),
        ),
      ),
    );
  return row.attempts >= SIGNUP_MAX_ATTEMPTS;
}

export async function recordSignup(ip: string): Promise<void> {
  const db = getDb();
  await db.insert(signupAttempts).values({ ip });
  // Same opportunistic prune as login attempts: past the window the rows are
  // dead weight, a day's grace keeps the delete off the index scan's path.
  await db
    .delete(signupAttempts)
    .where(lt(signupAttempts.createdAt, new Date(Date.now() - 86_400_000)));
}

// Leftmost x-forwarded-for entry is the client (Vercel sets the header).
// Absent (local dev, tests) everything shares one bucket, which is fine —
// the limits only need to hold in production.
export function ipFromForwardedFor(forwarded: string | null): string {
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// Client IP for the current request, for callers holding a Request (the
// Credentials authorize hook). Server actions read next/headers and use
// ipFromForwardedFor directly.
export function clientIp(request: Request): string {
  return ipFromForwardedFor(request.headers.get("x-forwarded-for"));
}

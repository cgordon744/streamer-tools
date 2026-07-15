import { and, count, eq, gt, lt } from "drizzle-orm";

import { loginAttempts } from "@/core/auth/schema";
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

// Client IP for the current request. Vercel sets x-forwarded-for; the
// leftmost entry is the client. Absent (local dev, tests) everything shares
// one bucket, which is fine — the limit only needs to hold in production.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

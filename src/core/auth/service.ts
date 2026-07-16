import { eq } from "drizzle-orm";

import { getDb } from "@/core/db/client";
import { hashPassword } from "@/core/auth/password";
import { users, type User } from "@/core/auth/schema";
import { trackEvent } from "@/core/events/track";

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return user ?? null;
}

export async function getUserName(userId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.name ?? null;
}

export type RegisterResult =
  { ok: true; userId: string } | { ok: false; error: "email_taken" };

// Insert-and-catch instead of check-then-insert: the unique constraint on
// users.email is the arbiter, so a concurrent duplicate signup loses cleanly
// instead of racing past a pre-check.
export async function registerUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<RegisterResult> {
  const db = getDb();
  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db
      .insert(users)
      .values({
        email: input.email.toLowerCase().trim(),
        name: input.name,
        passwordHash,
      })
      .returning({ id: users.id });
    await trackEvent(user.id, "signup");
    return { ok: true, userId: user.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "email_taken" };
    }
    throw error;
  }
}

// Postgres unique_violation. node-postgres puts the code on the error;
// drizzle may wrap the pg error, so walk the cause chain.
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = current.cause;
  }
  return false;
}

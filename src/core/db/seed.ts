import "dotenv/config";

import { eq } from "drizzle-orm";

import { hashPassword } from "@/core/auth/password";
import { trackEvent } from "@/core/events/track";

import { getDb } from "./client";
import { users } from "./schema";

// Creates (or updates) the single user from SEED_USER_* env vars.
// Multi-user later means adding signup — not changing this table.
async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? "Creator";

  if (!email || !password) {
    throw new Error("SEED_USER_EMAIL and SEED_USER_PASSWORD must be set");
  }

  const db = getDb();
  const passwordHash = await hashPassword(password);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash })
    .onConflictDoUpdate({
      target: users.email,
      set: { name, passwordHash, updatedAt: new Date() },
    })
    .returning({ id: users.id, email: users.email });

  // Seeding is the only signup path today — instrument it as one, first
  // creation only (CHASSIS_SPEC §7 activation metrics).
  if (!existing) {
    await trackEvent(user.id, "signup");
  }

  console.log(`Seeded user ${user.email} (${user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

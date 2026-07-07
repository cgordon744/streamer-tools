import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users, type User } from "@/modules/auth/schema";

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return user ?? null;
}

import { getDb } from "@/core/db/client";
import { users } from "@/core/db/schema";

let counter = 0;

// Inserts a user directly (bypassing bcrypt) — system tests exercise the
// sponsor/deal services, not password hashing.
export async function createTestUser(): Promise<string> {
  counter += 1;
  const [user] = await getDb()
    .insert(users)
    .values({
      email: `user${counter}-${process.pid}@test.example`,
      name: `Test User ${counter}`,
      passwordHash: "not-a-real-hash",
    })
    .returning({ id: users.id });
  return user.id;
}

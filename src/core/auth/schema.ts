import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;

// Failed login attempts by IP, for rate limiting (core/auth/rate-limit.ts).
// Not user-scoped — the attempts we care about are the ones that never became
// a session. Rows expire operationally: pruned on write, never read past the
// rate-limit window. No soft delete; this is security bookkeeping, not
// user-facing data.
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ip: text("ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("login_attempts_ip_created_at_idx").on(table.ip, table.createdAt),
  ],
);

// Successful account creations by IP, for signup rate limiting — same
// operational profile as login_attempts (pruned on write, security
// bookkeeping, no soft delete). Separate table because the two limits have
// different windows and clearing one must never reset the other.
export const signupAttempts = pgTable(
  "signup_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ip: text("ip").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("signup_attempts_ip_created_at_idx").on(table.ip, table.createdAt),
  ],
);

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "@/core/auth/schema";

// Chassis-level activation/retention instrumentation (CHASSIS_SPEC §7).
// Internal only — powers the kill-criteria metrics (thesis §6), not product
// features. Append-only; no soft delete needed.
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_user_id_idx").on(table.userId),
    index("events_event_created_at_idx").on(table.event, table.createdAt),
  ],
);

export type Event = typeof events.$inferSelect;

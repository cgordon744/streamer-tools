import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/core/auth/schema";
import type { ContentType, DealStatus } from "@/core/config/deals";

export const sponsors = pgTable(
  "tracker_sponsors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Multi-tenancy: every row is owned by a user; all queries scope by this.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete (CHASSIS_SPEC §3): rows are flagged, never dropped —
    // creators ask for things back. All reads filter on this being null.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("tracker_sponsors_user_id_idx").on(table.userId)],
);

export type Sponsor = typeof sponsors.$inferSelect;

export const deals = pgTable(
  "tracker_deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Multi-tenancy: every row is owned by a user; all queries scope by this.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id, { onDelete: "cascade" }),
    // Plain text, not a DB enum (CHASSIS_SPEC §4) — the value set lives in
    // /core/config/deals.ts and is enforced by zod at the action boundary.
    status: text("status").$type<DealStatus>().notNull().default("lead"),
    // Money as integer cents — exact arithmetic, no float drift.
    amountCents: integer("amount_cents").notNull(),
    contentType: text("content_type").$type<ContentType>().notNull(),
    deliverableDueDate: date("deliverable_due_date"),
    paymentDueDate: date("payment_due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Soft delete (CHASSIS_SPEC §3): rows are flagged, never dropped —
    // creators ask for things back. All reads filter on this being null.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tracker_deals_user_id_idx").on(table.userId),
    index("tracker_deals_sponsor_id_idx").on(table.sponsorId),
  ],
);

export type Deal = typeof deals.$inferSelect;

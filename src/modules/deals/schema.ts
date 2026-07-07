import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { CONTENT_TYPES, DEAL_STATUSES } from "@/config/deals";
import { users } from "@/modules/auth/schema";
import { sponsors } from "@/modules/sponsors/schema";

export const dealStatusEnum = pgEnum("deal_status", DEAL_STATUSES);
export const contentTypeEnum = pgEnum("content_type", CONTENT_TYPES);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Multi-tenancy: every row is owned by a user; all queries scope by this.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sponsorId: uuid("sponsor_id")
      .notNull()
      .references(() => sponsors.id, { onDelete: "cascade" }),
    status: dealStatusEnum("status").notNull().default("pitched"),
    // Money as integer cents — exact arithmetic, no float drift.
    amountCents: integer("amount_cents").notNull(),
    contentType: contentTypeEnum("content_type").notNull(),
    deliverableDueDate: date("deliverable_due_date"),
    paymentDueDate: date("payment_due_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("deals_user_id_idx").on(table.userId),
    index("deals_sponsor_id_idx").on(table.sponsorId),
  ],
);

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;

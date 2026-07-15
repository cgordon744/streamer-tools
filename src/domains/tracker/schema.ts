import {
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/core/auth/schema";
import type {
  ContentType,
  DealStatus,
  PaymentStatus,
} from "@/core/config/deals";

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
  (table) => [
    index("tracker_sponsors_user_id_idx").on(table.userId),
    // Referenced by deals' composite ownership FK (id is already unique;
    // Postgres just needs the pair indexed to target it).
    uniqueIndex("tracker_sponsors_id_user_id_uidx").on(table.id, table.userId),
  ],
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
    // Composite FK below pins the sponsor to the same owner.
    sponsorId: uuid("sponsor_id").notNull(),
    // Plain text, not a DB enum (CHASSIS_SPEC §4) — the value set lives in
    // /core/config/deals.ts and is enforced by zod at the action boundary.
    status: text("status").$type<DealStatus>().notNull().default("lead"),
    // Money as integer cents — exact arithmetic, no float drift.
    amountCents: integer("amount_cents").notNull(),
    contentType: text("content_type").$type<ContentType>().notNull(),
    // Where the money is, independent of pipeline stage. Overdue is computed
    // (payment_due_date past + not paid), never stored.
    paymentStatus: text("payment_status")
      .$type<PaymentStatus>()
      .notNull()
      .default("not_invoiced"),
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
    // Referenced by deliverables' composite ownership FK.
    uniqueIndex("tracker_deals_id_user_id_uidx").on(table.id, table.userId),
    // DB-level backstop for the ownership invariant the action layer
    // enforces: a deal's sponsor must belong to the same user. Postgres
    // rejects the row even if a future bug bypasses the checks in code.
    foreignKey({
      name: "tracker_deals_sponsor_owner_fk",
      columns: [table.sponsorId, table.userId],
      foreignColumns: [sponsors.id, sponsors.userId],
    }).onDelete("cascade"),
  ],
);

export type Deal = typeof deals.$inferSelect;

export const deliverables = pgTable(
  "tracker_deliverables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Multi-tenancy: every row is owned by a user; all queries scope by this.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Composite FK below pins the deal to the same owner.
    dealId: uuid("deal_id").notNull(),
    title: text("title").notNull(),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
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
    index("tracker_deliverables_user_id_idx").on(table.userId),
    index("tracker_deliverables_deal_id_idx").on(table.dealId),
    // DB-level backstop: a deliverable's deal must belong to the same user.
    foreignKey({
      name: "tracker_deliverables_deal_owner_fk",
      columns: [table.dealId, table.userId],
      foreignColumns: [deals.id, deals.userId],
    }).onDelete("cascade"),
  ],
);

export type Deliverable = typeof deliverables.$inferSelect;

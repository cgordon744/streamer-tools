import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

import { users } from "@/core/auth/schema";
import type { MediaKitTemplate } from "@/core/config/media-kit";

// Presentational document content, stored as jsonb (logged deviation from
// the normalize-everything pattern — see BUILD_LOG 2026-07-16): these lines
// have no relational consumers and no lifecycle of their own; they are the
// kit's brochure copy.
export type RateCardLine = {
  label: string;
  price: string;
};

export const kits = pgTable(
  "mediakit_kits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Multi-tenancy: every row is owned by a user; all queries scope by this.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Config-driven template id (CHASSIS_SPEC §4), validated by zod at the
    // action boundary.
    template: text("template")
      .$type<MediaKitTemplate>()
      .notNull()
      .default("classic"),
    niche: text("niche"),
    pitch: text("pitch"),
    // Manual demographics (v1): the public Data API exposes none — OAuth
    // (build phase 2) will fill these automatically.
    audienceAge: text("audience_age"),
    audienceGender: text("audience_gender"),
    audienceGeo: text("audience_geo"),
    contactEmail: text("contact_email"),
    accentColor: text("accent_color"),
    rateCard: jsonb("rate_card").$type<RateCardLine[]>().notNull().default([]),
    brandHighlights: jsonb("brand_highlights")
      .$type<string[]>()
      .notNull()
      .default([]),
    // Verified-sponsors section (tracker data) is additive and owner-hideable.
    showVerifiedSponsors: boolean("show_verified_sponsors")
      .notNull()
      .default(true),
    // Public URL slug: generated once at first publish, stable forever after
    // ("the link never breaks"). Unpublish nulls publishedAt, keeps the slug.
    slug: text("slug"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
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
    // One kit per user (v1) — also the upsert conflict target.
    uniqueIndex("mediakit_kits_user_id_uidx").on(table.userId),
    uniqueIndex("mediakit_kits_slug_uidx").on(table.slug),
  ],
);

export type Kit = typeof kits.$inferSelect;

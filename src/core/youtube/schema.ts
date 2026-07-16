import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/core/auth/schema";

// Shared entity (CHASSIS_SPEC §3): a user's connected channel with cached
// public stats — multiple domains read this (media kit renders it, future
// rates/invoices consume it via core/youtube/queries).
//
// No soft delete, deliberately: this is a refreshable cache of public data
// (like login_attempts, unlike deals) — reconnecting overwrites the same row,
// and there is nothing a user would ask to get back.
export const youtubeChannels = pgTable(
  "youtube_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Multi-tenancy: every row is owned by a user; all queries scope by this.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull(),
    handle: text("handle"),
    title: text("title").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    subscriberCount: integer("subscriber_count").notNull(),
    // Lifetime view totals exceed int4 on large channels.
    viewCount: bigint("view_count", { mode: "number" }).notNull(),
    videoCount: integer("video_count").notNull(),
    avgRecentViews: integer("avg_recent_views"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One connected channel per user (v1) — also the upsert conflict target.
    uniqueIndex("youtube_channels_user_id_uidx").on(table.userId),
  ],
);

export type YoutubeChannel = typeof youtubeChannels.$inferSelect;

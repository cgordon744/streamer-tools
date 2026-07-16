import { eq } from "drizzle-orm";

import { getDb } from "@/core/db/client";
import type { ChannelSnapshot } from "@/core/youtube/client";
import { youtubeChannels, type YoutubeChannel } from "@/core/youtube/schema";

// The cross-domain read path for channel stats (media-kit spec §5's
// "getChannelSnapshot"): domains import /core freely (boundary rule 1), so
// the shared entity's accessors live here, not in any single domain.
export async function getChannelForUser(
  userId: string,
): Promise<YoutubeChannel | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(youtubeChannels)
    .where(eq(youtubeChannels.userId, userId))
    .limit(1);
  return row ?? null;
}

// One channel per user (v1): connecting a different channel replaces the row.
export async function upsertChannelForUser(
  userId: string,
  snapshot: ChannelSnapshot,
): Promise<YoutubeChannel> {
  const db = getDb();
  const values = {
    userId,
    channelId: snapshot.channelId,
    handle: snapshot.handle,
    title: snapshot.title,
    thumbnailUrl: snapshot.thumbnailUrl,
    subscriberCount: snapshot.subscriberCount,
    viewCount: snapshot.viewCount,
    videoCount: snapshot.videoCount,
    avgRecentViews: snapshot.avgRecentViews,
    fetchedAt: new Date(),
  };
  const [row] = await db
    .insert(youtubeChannels)
    .values(values)
    .onConflictDoUpdate({
      target: youtubeChannels.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  return row;
}

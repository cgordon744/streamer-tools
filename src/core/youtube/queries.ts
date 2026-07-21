import { eq } from "drizzle-orm";

import { getDb } from "@/core/db/client";
import type { ChannelDemographics } from "@/core/youtube/analytics";
import type { ChannelSnapshot } from "@/core/youtube/client";
import {
  youtubeChannels,
  youtubeConnections,
  type YoutubeChannel,
  type YoutubeConnection,
} from "@/core/youtube/schema";

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

export async function getConnectionForUser(
  userId: string,
): Promise<YoutubeConnection | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(youtubeConnections)
    .where(eq(youtubeConnections.userId, userId))
    .limit(1);
  return row ?? null;
}

// One connection per user (v1): reconnecting replaces the grant in place and
// resets connectedAt (it is a new consent).
export async function upsertConnectionForUser(
  userId: string,
  input: { refreshTokenEnc: string | null; scope: string },
): Promise<{ connection: YoutubeConnection; created: boolean }> {
  const db = getDb();
  const existing = await getConnectionForUser(userId);
  const values = {
    userId,
    refreshTokenEnc: input.refreshTokenEnc,
    scope: input.scope,
    connectedAt: new Date(),
  };
  const [row] = await db
    .insert(youtubeConnections)
    .values(values)
    .onConflictDoUpdate({
      target: youtubeConnections.userId,
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  return { connection: row, created: !existing };
}

export async function setConnectionDemographics(
  userId: string,
  demographics: ChannelDemographics,
): Promise<void> {
  const db = getDb();
  await db
    .update(youtubeConnections)
    .set({
      demographics,
      demographicsFetchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(youtubeConnections.userId, userId));
}

// Hard delete (no soft-delete on this table — see schema.ts). Returns the
// deleted row so the caller can best-effort revoke the token at Google.
export async function deleteConnectionForUser(
  userId: string,
): Promise<YoutubeConnection | null> {
  const db = getDb();
  const [row] = await db
    .delete(youtubeConnections)
    .where(eq(youtubeConnections.userId, userId))
    .returning();
  return row ?? null;
}

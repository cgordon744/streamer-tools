// Chassis YouTube boundary (CHASSIS_SPEC §2): everything above this talks to
// YouTubeClient, so the data source is swappable in one file. A real Data API
// v3 client activates when YOUTUBE_API_KEY is set; otherwise a deterministic
// stub serves plausible stats so every environment (dev without the key, CI,
// tests) exercises the full flow with no credential — same pattern as
// core/email/sender.ts.

import type { ChannelRef } from "@/core/youtube/parse";

export type ChannelSnapshot = {
  channelId: string;
  handle: string | null;
  title: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  // Mean view count of the most recent uploads (up to 10); null when the
  // channel has no videos.
  avgRecentViews: number | null;
};

export type YouTubeClient = {
  /** Identifies the active implementation in logs. */
  name: string;
  /** Resolves a parsed channel reference; null when no such channel. */
  fetchChannel(ref: ChannelRef): Promise<ChannelSnapshot | null>;
};

const API_BASE = "https://www.googleapis.com/youtube/v3";
const RECENT_UPLOADS_SAMPLE = 10;

type ApiChannel = {
  id: string;
  snippet?: {
    title?: string;
    customUrl?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
  };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
};

const dataApiClient = (apiKey: string): YouTubeClient => ({
  name: "youtube-data-api",
  async fetchChannel(ref) {
    const lookup =
      ref.kind === "id" ? `id=${ref.value}` : `forHandle=@${ref.value}`;
    const channelRes = await apiGet(
      `${API_BASE}/channels?part=snippet,statistics,contentDetails&${lookup}&key=${apiKey}`,
    );
    const channel = (channelRes.items as ApiChannel[] | undefined)?.[0];
    if (!channel) return null;

    const uploadsPlaylist =
      channel.contentDetails?.relatedPlaylists?.uploads ?? null;
    const avgRecentViews = uploadsPlaylist
      ? await fetchAvgRecentViews(apiKey, uploadsPlaylist)
      : null;

    return {
      channelId: channel.id,
      // customUrl is the handle with its @ prefix (e.g. "@mkbhd").
      handle: channel.snippet?.customUrl?.replace(/^@/, "") ?? null,
      title: channel.snippet?.title ?? "Untitled channel",
      thumbnailUrl:
        channel.snippet?.thumbnails?.medium?.url ??
        channel.snippet?.thumbnails?.default?.url ??
        null,
      subscriberCount: toCount(channel.statistics?.subscriberCount),
      viewCount: toCount(channel.statistics?.viewCount),
      videoCount: toCount(channel.statistics?.videoCount),
      avgRecentViews,
    };
  },
});

async function fetchAvgRecentViews(
  apiKey: string,
  uploadsPlaylist: string,
): Promise<number | null> {
  const itemsRes = await apiGet(
    `${API_BASE}/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=${RECENT_UPLOADS_SAMPLE}&key=${apiKey}`,
  );
  const videoIds = ((itemsRes.items as unknown[] | undefined) ?? [])
    .map(
      (item) =>
        (item as { contentDetails?: { videoId?: string } }).contentDetails
          ?.videoId,
    )
    .filter((id): id is string => !!id);
  if (videoIds.length === 0) return null;

  const videosRes = await apiGet(
    `${API_BASE}/videos?part=statistics&id=${videoIds.join(",")}&key=${apiKey}`,
  );
  const views = ((videosRes.items as unknown[] | undefined) ?? []).map((item) =>
    toCount(
      (item as { statistics?: { viewCount?: string } }).statistics?.viewCount,
    ),
  );
  if (views.length === 0) return null;
  return Math.round(views.reduce((sum, v) => sum + v, 0) / views.length);
}

async function apiGet(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  if (!res.ok) {
    // Key never appears in thrown messages — it's in the URL.
    throw new Error(`YouTube API responded ${res.status}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

function toCount(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Deterministic fake stats derived from the reference string, so dev/CI flows
// behave consistently run to run. Never intended as user-facing real data —
// the media-kit tool ships dark until the real key exists (NEEDS INPUT #7).
const stubClient: YouTubeClient = {
  name: "stub",
  async fetchChannel(ref) {
    const seed = hashString(ref.value);
    const title =
      ref.kind === "handle"
        ? ref.value.charAt(0).toUpperCase() + ref.value.slice(1)
        : `Channel ${ref.value.slice(2, 8)}`;
    const subscriberCount = 10_000 + (seed % 490_000);
    const avgRecentViews = Math.round(subscriberCount * 0.12);
    const videoCount = 50 + (seed % 400);
    return {
      channelId:
        ref.kind === "id" ? ref.value : `UCstub${ref.value.padEnd(18, "0")}`,
      handle: ref.kind === "handle" ? ref.value : null,
      title,
      thumbnailUrl: null,
      subscriberCount,
      viewCount: avgRecentViews * videoCount,
      videoCount,
      avgRecentViews,
    };
  },
};

function hashString(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000_007;
  }
  return hash;
}

export function getYouTubeClient(): YouTubeClient {
  const apiKey = process.env.YOUTUBE_API_KEY;
  return apiKey ? dataApiClient(apiKey) : stubClient;
}

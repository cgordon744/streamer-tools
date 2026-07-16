import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getYouTubeClient } from "@/core/youtube/client";

// Only the stub is unit-testable (the real client is glue over the Data API,
// verified against production once a key exists — NEEDS INPUT #7). The stub's
// contract: deterministic, plausible, complete snapshots without a credential.
describe("getYouTubeClient stub", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_API_KEY;
  });

  afterEach(() => {
    if (savedKey !== undefined) process.env.YOUTUBE_API_KEY = savedKey;
  });

  it("is selected when no API key is set", () => {
    expect(getYouTubeClient().name).toBe("stub");
  });

  it("selects the real client when a key is set", () => {
    process.env.YOUTUBE_API_KEY = "test-key";
    expect(getYouTubeClient().name).toBe("youtube-data-api");
  });

  it("returns a deterministic snapshot for the same handle", async () => {
    const client = getYouTubeClient();
    const a = await client.fetchChannel({ kind: "handle", value: "mkbhd" });
    const b = await client.fetchChannel({ kind: "handle", value: "mkbhd" });
    expect(a).toEqual(b);
  });

  it("returns different stats for different handles", async () => {
    const client = getYouTubeClient();
    const a = await client.fetchChannel({ kind: "handle", value: "alpha" });
    const b = await client.fetchChannel({ kind: "handle", value: "betabeta" });
    expect(a!.subscriberCount).not.toBe(b!.subscriberCount);
  });

  it("produces a complete, plausible snapshot", async () => {
    const snapshot = await getYouTubeClient().fetchChannel({
      kind: "handle",
      value: "mkbhd",
    });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.handle).toBe("mkbhd");
    expect(snapshot!.title.length).toBeGreaterThan(0);
    expect(snapshot!.subscriberCount).toBeGreaterThanOrEqual(10_000);
    expect(snapshot!.subscriberCount).toBeLessThan(500_000);
    expect(snapshot!.avgRecentViews).toBeGreaterThan(0);
    expect(snapshot!.videoCount).toBeGreaterThan(0);
    expect(snapshot!.viewCount).toBeGreaterThan(0);
  });

  it("echoes a provided channel id", async () => {
    const id = "UC" + "a1B2c3D4e5F6g7H8i9J0k_";
    const snapshot = await getYouTubeClient().fetchChannel({
      kind: "id",
      value: id,
    });
    expect(snapshot!.channelId).toBe(id);
    expect(snapshot!.handle).toBeNull();
  });
});

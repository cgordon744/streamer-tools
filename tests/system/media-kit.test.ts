import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { getDb } from "@/core/db/client";
import {
  getChannelForUser,
  upsertChannelForUser,
} from "@/core/youtube/queries";
import { youtubeChannels } from "@/core/youtube/schema";
import {
  getKitForUser,
  getPublishedKitBySlug,
  publishKit,
  unpublishKit,
  upsertKitForUser,
} from "@/domains/media-kit/queries";
import { kits } from "@/domains/media-kit/schema";
import type { KitInput } from "@/domains/media-kit/validation";

import { createTestUser } from "./helpers";

function kitInput(overrides: Partial<KitInput> = {}): KitInput {
  return {
    template: "classic",
    niche: "Tech",
    pitch: "I make videos.",
    audienceAge: "18–34",
    audienceGender: null,
    audienceGeo: null,
    contactEmail: "kit@test.example",
    accentColor: "#112233",
    rateCard: [{ label: "Video", price: "$1,000" }],
    brandHighlights: ["Hit 1M views"],
    showVerifiedSponsors: true,
    ...overrides,
  };
}

function snapshot(channelId: string) {
  return {
    channelId,
    handle: "testhandle",
    title: "Test Channel",
    thumbnailUrl: null,
    subscriberCount: 42_000,
    viewCount: 9_000_000,
    videoCount: 120,
    avgRecentViews: 5_000,
  };
}

describe("kit upsert", () => {
  it("creates on first save, updates on the next", async () => {
    const userId = await createTestUser();

    const first = await upsertKitForUser(userId, kitInput());
    expect(first.created).toBe(true);
    expect(first.kit.niche).toBe("Tech");

    const second = await upsertKitForUser(
      userId,
      kitInput({ niche: "Gaming" }),
    );
    expect(second.created).toBe(false);
    expect(second.kit.id).toBe(first.kit.id);
    expect(second.kit.niche).toBe("Gaming");

    const rows = await getDb()
      .select()
      .from(kits)
      .where(eq(kits.userId, userId));
    expect(rows).toHaveLength(1);
  });

  it("stores structured rate card and highlights", async () => {
    const userId = await createTestUser();
    await upsertKitForUser(
      userId,
      kitInput({
        rateCard: [
          { label: "Integration", price: "$500–$800" },
          { label: "Dedicated video", price: "$2,500" },
        ],
        brandHighlights: ["A", "B"],
      }),
    );
    const kit = await getKitForUser(userId);
    expect(kit!.rateCard).toEqual([
      { label: "Integration", price: "$500–$800" },
      { label: "Dedicated video", price: "$2,500" },
    ]);
    expect(kit!.brandHighlights).toEqual(["A", "B"]);
  });

  it("scopes kits per user", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await upsertKitForUser(a, kitInput({ niche: "A's kit" }));

    expect(await getKitForUser(b)).toBeNull();
    const bKit = await upsertKitForUser(b, kitInput({ niche: "B's kit" }));
    expect(bKit.created).toBe(true);
    expect((await getKitForUser(a))!.niche).toBe("A's kit");
  });
});

describe("publish lifecycle", () => {
  it("publish requires a saved kit", async () => {
    const userId = await createTestUser();
    expect(await publishKit(userId)).toBeNull();
  });

  it("first publish mints a slug; republishing keeps it", async () => {
    const userId = await createTestUser();
    await upsertKitForUser(userId, kitInput());

    const published = await publishKit(userId);
    expect(published!.publishedAt).not.toBeNull();
    expect(published!.slug).toMatch(/^[a-z0-9]{10}$/);

    const again = await publishKit(userId);
    expect(again!.slug).toBe(published!.slug);
  });

  it("unpublish hides the kit but keeps the slug reserved", async () => {
    const userId = await createTestUser();
    await upsertKitForUser(userId, kitInput());
    const published = await publishKit(userId);
    const slug = published!.slug!;

    const unpublished = await unpublishKit(userId);
    expect(unpublished!.publishedAt).toBeNull();
    expect(unpublished!.slug).toBe(slug);
    expect(await getPublishedKitBySlug(slug)).toBeNull();

    // Republish resurrects the same URL.
    const republished = await publishKit(userId);
    expect(republished!.slug).toBe(slug);
    expect(await getPublishedKitBySlug(slug)).not.toBeNull();
  });

  it("getPublishedKitBySlug ignores unpublished and soft-deleted kits", async () => {
    const userId = await createTestUser();
    await upsertKitForUser(userId, kitInput());
    expect(await getPublishedKitBySlug("nonexistent0")).toBeNull();

    const published = await publishKit(userId);
    const slug = published!.slug!;
    expect((await getPublishedKitBySlug(slug))!.userId).toBe(userId);

    await getDb()
      .update(kits)
      .set({ deletedAt: new Date() })
      .where(and(eq(kits.userId, userId), eq(kits.slug, slug)));
    expect(await getPublishedKitBySlug(slug)).toBeNull();
  });

  it("edits to a published kit are live without republishing", async () => {
    const userId = await createTestUser();
    await upsertKitForUser(userId, kitInput());
    const published = await publishKit(userId);
    const slug = published!.slug!;

    await upsertKitForUser(userId, kitInput({ pitch: "Updated pitch" }));
    const publicKit = await getPublishedKitBySlug(slug);
    expect(publicKit!.pitch).toBe("Updated pitch");
    expect(publicKit!.publishedAt).not.toBeNull();
  });
});

describe("youtube channel cache", () => {
  it("upserts one row per user", async () => {
    const userId = await createTestUser();
    await upsertChannelForUser(userId, snapshot("UCfirst0000000000000001x"));
    const replaced = await upsertChannelForUser(
      userId,
      snapshot("UCsecond000000000000002x"),
    );
    expect(replaced.channelId).toBe("UCsecond000000000000002x");

    const rows = await getDb()
      .select()
      .from(youtubeChannels)
      .where(eq(youtubeChannels.userId, userId));
    expect(rows).toHaveLength(1);
  });

  it("refresh updates stats in place and bumps fetchedAt", async () => {
    const userId = await createTestUser();
    const first = await upsertChannelForUser(
      userId,
      snapshot("UCx000000000000000000003"),
    );
    const refreshed = await upsertChannelForUser(userId, {
      ...snapshot("UCx000000000000000000003"),
      subscriberCount: 43_000,
    });
    expect(refreshed.id).toBe(first.id);
    expect(refreshed.subscriberCount).toBe(43_000);
    expect(refreshed.fetchedAt.getTime()).toBeGreaterThanOrEqual(
      first.fetchedAt.getTime(),
    );
  });

  it("scopes channels per user", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await upsertChannelForUser(a, snapshot("UCa000000000000000000004"));

    expect(await getChannelForUser(b)).toBeNull();
    expect((await getChannelForUser(a))!.channelId).toBe(
      "UCa000000000000000000004",
    );
  });
});

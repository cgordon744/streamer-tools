import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/core/db/client";
import { kits, type Kit } from "@/domains/media-kit/schema";
import type { KitInput } from "@/domains/media-kit/validation";
import { randomSlug } from "@/lib/slug";

export async function getKitForUser(userId: string): Promise<Kit | null> {
  const db = getDb();
  const [kit] = await db
    .select()
    .from(kits)
    .where(and(eq(kits.userId, userId), isNull(kits.deletedAt)))
    .limit(1);
  return kit ?? null;
}

// One kit per user (v1): saving always upserts the user's single kit row.
export async function upsertKitForUser(
  userId: string,
  input: KitInput,
): Promise<{ kit: Kit; created: boolean }> {
  const db = getDb();
  const existing = await getKitForUser(userId);
  if (!existing) {
    const [kit] = await db
      .insert(kits)
      .values({ userId, ...input })
      .returning();
    return { kit, created: true };
  }
  const [kit] = await db
    .update(kits)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(kits.id, existing.id), eq(kits.userId, userId)))
    .returning();
  return { kit, created: false };
}

// First publish mints the slug; republish reuses it ("the link never
// breaks"). Retries on the astronomically unlikely slug collision.
export async function publishKit(userId: string): Promise<Kit | null> {
  const db = getDb();
  const existing = await getKitForUser(userId);
  if (!existing) return null;
  if (existing.publishedAt) return existing;

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = existing.slug ?? randomSlug();
    try {
      const [kit] = await db
        .update(kits)
        .set({ slug, publishedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(kits.id, existing.id), eq(kits.userId, userId)))
        .returning();
      return kit ?? null;
    } catch (error) {
      // Unique-violation on the slug index → mint a new one and retry.
      if (existing.slug === null && isUniqueViolation(error)) continue;
      throw error;
    }
  }
  throw new Error("Could not allocate a unique kit slug");
}

export async function unpublishKit(userId: string): Promise<Kit | null> {
  const db = getDb();
  const [kit] = await db
    .update(kits)
    .set({ publishedAt: null, updatedAt: new Date() })
    .where(and(eq(kits.userId, userId), isNull(kits.deletedAt)))
    .returning();
  return kit ?? null;
}

// Public read for /kit/[slug] — published, non-deleted kits only. Returns the
// owner id so the page can load channel/sponsor data and attribute the
// kit_viewed event.
export async function getPublishedKitBySlug(slug: string): Promise<Kit | null> {
  const db = getDb();
  const [kit] = await db
    .select()
    .from(kits)
    .where(and(eq(kits.slug, slug), isNull(kits.deletedAt)))
    .limit(1);
  if (!kit || !kit.publishedAt) return null;
  return kit;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if ((current as { code?: unknown }).code === "23505") return true;
    current = current.cause;
  }
  return false;
}

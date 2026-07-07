import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { sponsors, type Sponsor } from "@/modules/sponsors/schema";
import type { SponsorInput } from "@/modules/sponsors/validation";

// All functions take the acting user's id and scope every query with it.
// This module is the only place sponsor persistence is touched.

export async function listSponsors(userId: string): Promise<Sponsor[]> {
  const db = getDb();
  return db
    .select()
    .from(sponsors)
    .where(eq(sponsors.userId, userId))
    .orderBy(asc(sponsors.name));
}

export async function getSponsor(
  userId: string,
  sponsorId: string,
): Promise<Sponsor | null> {
  const db = getDb();
  const [sponsor] = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.id, sponsorId), eq(sponsors.userId, userId)))
    .limit(1);
  return sponsor ?? null;
}

export async function createSponsor(
  userId: string,
  input: SponsorInput,
): Promise<Sponsor> {
  const db = getDb();
  const [sponsor] = await db
    .insert(sponsors)
    .values({ ...input, userId })
    .returning();
  return sponsor;
}

export async function updateSponsor(
  userId: string,
  sponsorId: string,
  input: SponsorInput,
): Promise<Sponsor | null> {
  const db = getDb();
  const [sponsor] = await db
    .update(sponsors)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(sponsors.id, sponsorId), eq(sponsors.userId, userId)))
    .returning();
  return sponsor ?? null;
}

export async function deleteSponsor(
  userId: string,
  sponsorId: string,
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(sponsors)
    .where(and(eq(sponsors.id, sponsorId), eq(sponsors.userId, userId)))
    .returning({ id: sponsors.id });
  return deleted.length > 0;
}

import { and, asc, eq, isNull, sql } from "drizzle-orm";

import type { DealStatus } from "@/core/config/deals";
import { getDb } from "@/core/db/client";
import {
  deals,
  sponsors,
  type Deal,
  type Sponsor,
} from "@/domains/tracker/schema";
import type { DealInput, SponsorInput } from "@/domains/tracker/validation";

export type DealWithSponsor = Deal & { sponsorName: string };

export type DealFilters = {
  status?: DealStatus;
  sponsorId?: string;
};

// All functions take the acting user's id and scope every query with it.
// This module is the only place deal persistence is touched.
// Deletes are soft (deletedAt) — every read filters them out.

// Nearest upcoming deadline = the earlier of the two due dates (Postgres
// LEAST ignores NULLs); deals with no dates sort last.
const nearestDeadline = sql`LEAST(${deals.deliverableDueDate}, ${deals.paymentDueDate})`;

export async function listDeals(
  userId: string,
  filters: DealFilters = {},
): Promise<DealWithSponsor[]> {
  const db = getDb();
  const conditions = [eq(deals.userId, userId), isNull(deals.deletedAt)];
  if (filters.status) {
    conditions.push(eq(deals.status, filters.status));
  }
  if (filters.sponsorId) {
    conditions.push(eq(deals.sponsorId, filters.sponsorId));
  }

  const rows = await db
    .select({ deal: deals, sponsorName: sponsors.name })
    .from(deals)
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .where(and(...conditions))
    .orderBy(
      sql`${nearestDeadline} ASC NULLS LAST`,
      sql`${deals.createdAt} DESC`,
    );

  return rows.map((row) => ({ ...row.deal, sponsorName: row.sponsorName }));
}

export async function getDeal(
  userId: string,
  dealId: string,
): Promise<Deal | null> {
  const db = getDb();
  const [deal] = await db
    .select()
    .from(deals)
    .where(
      and(
        eq(deals.id, dealId),
        eq(deals.userId, userId),
        isNull(deals.deletedAt),
      ),
    )
    .limit(1);
  return deal ?? null;
}

export async function createDeal(
  userId: string,
  input: DealInput,
): Promise<Deal> {
  const db = getDb();
  const { amount, ...rest } = input;
  const [deal] = await db
    .insert(deals)
    .values({ ...rest, amountCents: amount, userId })
    .returning();
  return deal;
}

export async function updateDeal(
  userId: string,
  dealId: string,
  input: DealInput,
): Promise<Deal | null> {
  const db = getDb();
  const { amount, ...rest } = input;
  const [deal] = await db
    .update(deals)
    .set({ ...rest, amountCents: amount, updatedAt: new Date() })
    .where(
      and(
        eq(deals.id, dealId),
        eq(deals.userId, userId),
        isNull(deals.deletedAt),
      ),
    )
    .returning();
  return deal ?? null;
}

export async function updateDealStatus(
  userId: string,
  dealId: string,
  status: DealStatus,
): Promise<Deal | null> {
  const db = getDb();
  const [deal] = await db
    .update(deals)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(deals.id, dealId),
        eq(deals.userId, userId),
        isNull(deals.deletedAt),
      ),
    )
    .returning();
  return deal ?? null;
}

export type DealStats = {
  pipelineCents: number;
  awaitingPaymentCents: number;
  paidCents: number;
  dueSoonCount: number;
};

export async function getDealStats(userId: string): Promise<DealStats> {
  const db = getDb();
  const [row] = await db
    .select({
      pipelineCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${deals.status} not in ('paid', 'dead')), 0)`,
      awaitingPaymentCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${deals.status} in ('content_delivered', 'invoiced')), 0)`,
      paidCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${deals.status} = 'paid'), 0)`,
      dueSoonCount: sql<string>`count(*) filter (where ${deals.status} not in ('paid', 'dead') and ${nearestDeadline} between current_date and current_date + 7)`,
    })
    .from(deals)
    .where(and(eq(deals.userId, userId), isNull(deals.deletedAt)));

  return {
    pipelineCents: Number(row.pipelineCents),
    awaitingPaymentCents: Number(row.awaitingPaymentCents),
    paidCents: Number(row.paidCents),
    dueSoonCount: Number(row.dueSoonCount),
  };
}

export async function deleteDeal(
  userId: string,
  dealId: string,
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .update(deals)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(deals.id, dealId),
        eq(deals.userId, userId),
        isNull(deals.deletedAt),
      ),
    )
    .returning({ id: deals.id });
  return deleted.length > 0;
}

export async function listSponsors(userId: string): Promise<Sponsor[]> {
  const db = getDb();
  return db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.userId, userId), isNull(sponsors.deletedAt)))
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
    .where(
      and(
        eq(sponsors.id, sponsorId),
        eq(sponsors.userId, userId),
        isNull(sponsors.deletedAt),
      ),
    )
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
    .where(
      and(
        eq(sponsors.id, sponsorId),
        eq(sponsors.userId, userId),
        isNull(sponsors.deletedAt),
      ),
    )
    .returning();
  return sponsor ?? null;
}

export async function deleteSponsor(
  userId: string,
  sponsorId: string,
): Promise<boolean> {
  const db = getDb();
  // Soft-delete the sponsor and its deals together (mirrors the old FK
  // cascade); both stay recoverable.
  const deleted = await db
    .update(sponsors)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(sponsors.id, sponsorId),
        eq(sponsors.userId, userId),
        isNull(sponsors.deletedAt),
      ),
    )
    .returning({ id: sponsors.id });
  if (deleted.length === 0) {
    return false;
  }
  await db
    .update(deals)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(deals.sponsorId, sponsorId),
        eq(deals.userId, userId),
        isNull(deals.deletedAt),
      ),
    );
  return true;
}

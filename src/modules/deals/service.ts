import { and, eq, sql } from "drizzle-orm";

import type { DealStatus } from "@/config/deals";
import { getDb } from "@/db/client";
import { deals, type Deal } from "@/modules/deals/schema";
import type { DealInput } from "@/modules/deals/validation";
import { sponsors } from "@/modules/sponsors/schema";

export type DealWithSponsor = Deal & { sponsorName: string };

export type DealFilters = {
  status?: DealStatus;
  sponsorId?: string;
};

// All functions take the acting user's id and scope every query with it.
// This module is the only place deal persistence is touched.

// Nearest upcoming deadline = the earlier of the two due dates (Postgres
// LEAST ignores NULLs); deals with no dates sort last.
const nearestDeadline = sql`LEAST(${deals.deliverableDueDate}, ${deals.paymentDueDate})`;

export async function listDeals(
  userId: string,
  filters: DealFilters = {},
): Promise<DealWithSponsor[]> {
  const db = getDb();
  const conditions = [eq(deals.userId, userId)];
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
    .where(and(eq(deals.id, dealId), eq(deals.userId, userId)))
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
    .where(and(eq(deals.id, dealId), eq(deals.userId, userId)))
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
    .where(and(eq(deals.id, dealId), eq(deals.userId, userId)))
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
      pipelineCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${deals.status} <> 'paid'), 0)`,
      awaitingPaymentCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${deals.status} = 'delivered'), 0)`,
      paidCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${deals.status} = 'paid'), 0)`,
      dueSoonCount: sql<string>`count(*) filter (where ${deals.status} <> 'paid' and ${nearestDeadline} between current_date and current_date + 7)`,
    })
    .from(deals)
    .where(eq(deals.userId, userId));

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
    .delete(deals)
    .where(and(eq(deals.id, dealId), eq(deals.userId, userId)))
    .returning({ id: deals.id });
  return deleted.length > 0;
}

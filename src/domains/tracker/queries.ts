import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { DealStatus, PaymentStatus } from "@/core/config/deals";
import { getDb } from "@/core/db/client";
import {
  deals,
  deliverables,
  sponsors,
  type Deal,
  type Deliverable,
  type Sponsor,
} from "@/domains/tracker/schema";
import type {
  DealInput,
  DeliverableInput,
  SponsorInput,
} from "@/domains/tracker/validation";

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

// Stage moves sync payment status forward (never back): landing on the
// `invoiced` stage marks an un-invoiced deal invoiced, landing on `paid`
// marks it paid. Direct payment-status edits happen in the deal form.
// Expressed in SQL so the sync and the status write are one atomic
// statement — no read-then-write window between concurrent moves.
function paymentSyncFor(status: DealStatus) {
  if (status === "paid") return "paid" as const;
  if (status === "invoiced") {
    return sql<PaymentStatus>`case when ${deals.paymentStatus} = 'not_invoiced' then 'invoiced' else ${deals.paymentStatus} end`;
  }
  return undefined;
}

export async function updateDealStatus(
  userId: string,
  dealId: string,
  status: DealStatus,
): Promise<Deal | null> {
  const db = getDb();
  const paymentStatus = paymentSyncFor(status);
  const [deal] = await db
    .update(deals)
    .set({
      status,
      ...(paymentStatus ? { paymentStatus } : {}),
      updatedAt: new Date(),
    })
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

// The dashboard strip (spec §2/§6): active deals, $ in flight, overdue
// payments, next deliverable. "Overdue" mirrors payments.isPaymentOverdue in
// SQL; "next deliverable" is the nearest upcoming date across active deals'
// deliverable dates and open checklist items.
export type DealStats = {
  activeCount: number;
  inFlightCents: number;
  overdueCount: number;
  overdueCents: number;
  nextDeliverableDate: string | null;
};

const activeDeal = sql`${deals.status} not in ('paid', 'dead')`;

// `today` is computed in the user's timezone (core/time getToday()), not the
// server's — SQL current_date is UTC on Vercel and flips a day early/late.
export async function getDealStats(
  userId: string,
  today: string,
): Promise<DealStats> {
  const db = getDb();
  const overduePayment = sql`${deals.paymentStatus} <> 'paid' and ${deals.status} <> 'dead' and ${deals.paymentDueDate} < ${today}::date`;
  const [row] = await db
    .select({
      activeCount: sql<string>`count(*) filter (where ${activeDeal})`,
      inFlightCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${activeDeal}), 0)`,
      overdueCount: sql<string>`count(*) filter (where ${overduePayment})`,
      overdueCents: sql<string>`coalesce(sum(${deals.amountCents}) filter (where ${overduePayment}), 0)`,
    })
    .from(deals)
    .where(and(eq(deals.userId, userId), isNull(deals.deletedAt)));

  // Raw table names with explicit aliases: drizzle renders interpolated
  // column refs unqualified inside sql``, which is ambiguous once the
  // deliverables subquery joins deals.
  const [next] = await db
    .select({
      nextDeliverableDate: sql<string | null>`least(
        (select min(d.deliverable_due_date) from tracker_deals d
          where d.user_id = ${userId} and d.deleted_at is null
            and d.status not in ('paid', 'dead')
            and d.deliverable_due_date >= ${today}::date),
        (select min(dv.due_date) from tracker_deliverables dv
          inner join tracker_deals dd on dv.deal_id = dd.id
          where dv.user_id = ${userId}
            and dv.deleted_at is null
            and dv.completed_at is null
            and dv.due_date >= ${today}::date
            and dd.deleted_at is null
            and dd.status not in ('paid', 'dead'))
      )`,
    })
    .from(sql`(select 1) as one`);

  return {
    activeCount: Number(row.activeCount),
    inFlightCents: Number(row.inFlightCents),
    overdueCount: Number(row.overdueCount),
    overdueCents: Number(row.overdueCents),
    nextDeliverableDate: next.nextDeliverableDate,
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
  // cascade); both stay recoverable. One transaction — a crash between the
  // two statements must not leave a hidden sponsor with visible deals.
  return db.transaction(async (tx) => {
    const deleted = await tx
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
    await tx
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
  });
}

export async function listDeliverables(userId: string): Promise<Deliverable[]> {
  const db = getDb();
  return db
    .select()
    .from(deliverables)
    .where(and(eq(deliverables.userId, userId), isNull(deliverables.deletedAt)))
    .orderBy(
      sql`${deliverables.dueDate} ASC NULLS LAST`,
      asc(deliverables.createdAt),
    );
}

export async function createDeliverable(
  userId: string,
  input: DeliverableInput,
): Promise<Deliverable> {
  const db = getDb();
  const [deliverable] = await db
    .insert(deliverables)
    .values({ ...input, userId })
    .returning();
  return deliverable;
}

export async function setDeliverableCompleted(
  userId: string,
  deliverableId: string,
  completed: boolean,
): Promise<Deliverable | null> {
  const db = getDb();
  const [deliverable] = await db
    .update(deliverables)
    .set({ completedAt: completed ? new Date() : null, updatedAt: new Date() })
    .where(
      and(
        eq(deliverables.id, deliverableId),
        eq(deliverables.userId, userId),
        isNull(deliverables.deletedAt),
      ),
    )
    .returning();
  return deliverable ?? null;
}

export async function deleteDeliverable(
  userId: string,
  deliverableId: string,
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .update(deliverables)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(deliverables.id, deliverableId),
        eq(deliverables.userId, userId),
        isNull(deliverables.deletedAt),
      ),
    )
    .returning({ id: deliverables.id });
  return deleted.length > 0;
}

// ---------------------------------------------------------------------------
// Exported data contract (tracker spec §5). The tracker is the portfolio's
// primary data producer; future domains consume ONLY these functions, never
// the tables. Keep signatures stable.
// ---------------------------------------------------------------------------

export type VerifiedSponsor = {
  id: string;
  name: string;
  completedDealCount: number;
};

// Sponsors backed by at least one deal that reached content_delivered or
// later — "brands this creator has actually worked with".
// Consumed by: media kit (verified sponsor logos/names).
export async function getVerifiedSponsors(
  userId: string,
): Promise<VerifiedSponsor[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: sponsors.id,
      name: sponsors.name,
      completedDealCount: sql<string>`count(*)`,
    })
    .from(sponsors)
    .innerJoin(deals, eq(deals.sponsorId, sponsors.id))
    .where(
      and(
        eq(sponsors.userId, userId),
        isNull(sponsors.deletedAt),
        isNull(deals.deletedAt),
        sql`${deals.status} in ('content_delivered', 'invoiced', 'paid')`,
      ),
    )
    .groupBy(sponsors.id, sponsors.name)
    .orderBy(asc(sponsors.name));
  return rows.map((r) => ({
    ...r,
    completedDealCount: Number(r.completedDealCount),
  }));
}

export type DealHistoryEntry = {
  id: string;
  sponsorName: string;
  amountCents: number;
  contentType: Deal["contentType"];
  status: DealStatus;
  createdAt: Date;
};

// Full (non-deleted) deal history with amounts and dates.
// Consumed by: rate calculator (benchmarking a creator's real deal prices).
export async function getDealHistory(
  userId: string,
): Promise<DealHistoryEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: deals.id,
      sponsorName: sponsors.name,
      amountCents: deals.amountCents,
      contentType: deals.contentType,
      status: deals.status,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .where(and(eq(deals.userId, userId), isNull(deals.deletedAt)))
    .orderBy(desc(deals.createdAt));
  return rows;
}

// Deals at an invoiceable point: content delivered (or invoiced) and money
// still outstanding.
// Consumed by: invoice tool (pre-filling invoices from deal data).
export async function getPayableDeals(
  userId: string,
): Promise<DealWithSponsor[]> {
  const db = getDb();
  const rows = await db
    .select({ deal: deals, sponsorName: sponsors.name })
    .from(deals)
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .where(
      and(
        eq(deals.userId, userId),
        isNull(deals.deletedAt),
        sql`${deals.status} in ('content_delivered', 'invoiced')`,
        sql`${deals.paymentStatus} <> 'paid'`,
      ),
    )
    .orderBy(sql`${deals.paymentDueDate} ASC NULLS LAST`);
  return rows.map((row) => ({ ...row.deal, sponsorName: row.sponsorName }));
}

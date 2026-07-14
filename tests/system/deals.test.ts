import { beforeAll, describe, expect, it } from "vitest";

import { todayIso } from "@/lib/dates";
import {
  createDeal,
  deleteDeal,
  getDealStats,
  listDeals,
  updateDeal,
  updateDealStatus,
} from "@/domains/tracker/queries";
import { createSponsor, deleteSponsor } from "@/domains/tracker/queries";

import { createTestUser } from "./helpers";

function isoDaysFromToday(days: number): string {
  const [year, month, day] = todayIso().split("-").map(Number);
  const d = new Date(year, month - 1, day + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const sponsorInput = {
  name: "Acme",
  contactName: null,
  contactEmail: null,
  notes: null,
};

function dealInput(sponsorId: string, overrides = {}) {
  return {
    sponsorId,
    status: "lead" as const,
    amount: 100000,
    contentType: "video" as const,
    paymentStatus: "not_invoiced" as const,
    deliverableDueDate: null,
    paymentDueDate: null,
    notes: null,
    ...overrides,
  };
}

describe("deal service", () => {
  let userA: string;
  let userB: string;
  let sponsorA: string;

  beforeAll(async () => {
    userA = await createTestUser();
    userB = await createTestUser();
    sponsorA = (await createSponsor(userA, sponsorInput)).id;
  });

  it("creates a deal and returns it with the sponsor name in lists", async () => {
    const deal = await createDeal(userA, dealInput(sponsorA));
    expect(deal.status).toBe("lead");
    expect(deal.amountCents).toBe(100000);

    const listed = await listDeals(userA);
    const found = listed.find((d) => d.id === deal.id);
    expect(found?.sponsorName).toBe("Acme");
  });

  it("updates deal fields", async () => {
    const deal = await createDeal(userA, dealInput(sponsorA));
    const updated = await updateDeal(userA, deal.id, {
      ...dealInput(sponsorA),
      amount: 250000,
      notes: "two spots",
    });
    expect(updated?.amountCents).toBe(250000);
    expect(updated?.notes).toBe("two spots");
  });

  it("moves a deal through the pipeline", async () => {
    const deal = await createDeal(userA, dealInput(sponsorA));
    const moved = await updateDealStatus(userA, deal.id, "contract_signed");
    expect(moved?.status).toBe("contract_signed");
  });

  it("filters by status and sponsor", async () => {
    const user = await createTestUser();
    const s1 = (await createSponsor(user, sponsorInput)).id;
    const s2 = (await createSponsor(user, { ...sponsorInput, name: "Beta" }))
      .id;
    await createDeal(user, dealInput(s1, { status: "contract_signed" }));
    await createDeal(user, dealInput(s2, { status: "paid" }));

    const signed = await listDeals(user, { status: "contract_signed" });
    expect(signed).toHaveLength(1);
    expect(signed[0].sponsorId).toBe(s1);

    const bySponsor = await listDeals(user, { sponsorId: s2 });
    expect(bySponsor).toHaveLength(1);
    expect(bySponsor[0].status).toBe("paid");
  });

  it("orders by nearest deadline, undated deals last", async () => {
    const user = await createTestUser();
    const sponsor = (await createSponsor(user, sponsorInput)).id;
    const far = await createDeal(
      user,
      dealInput(sponsor, { deliverableDueDate: isoDaysFromToday(30) }),
    );
    const near = await createDeal(
      user,
      dealInput(sponsor, { paymentDueDate: isoDaysFromToday(2) }),
    );
    const undated = await createDeal(user, dealInput(sponsor));

    const ids = (await listDeals(user)).map((d) => d.id);
    expect(ids).toEqual([near.id, far.id, undated.id]);
  });

  it("computes dashboard strip stats", async () => {
    const user = await createTestUser();
    const sponsor = (await createSponsor(user, sponsorInput)).id;
    await createDeal(user, dealInput(sponsor, { status: "lead", amount: 100 }));
    await createDeal(
      user,
      dealInput(sponsor, {
        status: "content_delivered",
        amount: 200,
        deliverableDueDate: isoDaysFromToday(5),
        paymentDueDate: isoDaysFromToday(-3), // overdue, not paid
      }),
    );
    await createDeal(user, dealInput(sponsor, { status: "paid", amount: 400 }));

    const stats = await getDealStats(user);
    expect(stats.activeCount).toBe(2); // lead + content_delivered
    expect(stats.inFlightCents).toBe(300);
    expect(stats.overdueCount).toBe(1);
    expect(stats.overdueCents).toBe(200);
    expect(stats.nextDeliverableDate).toBe(isoDaysFromToday(5));
  });

  it("does not flag paid or dead deals as overdue", async () => {
    const user = await createTestUser();
    const sponsor = (await createSponsor(user, sponsorInput)).id;
    await createDeal(
      user,
      dealInput(sponsor, {
        status: "paid",
        paymentStatus: "paid" as const,
        paymentDueDate: isoDaysFromToday(-10),
      }),
    );
    await createDeal(
      user,
      dealInput(sponsor, {
        status: "dead",
        paymentDueDate: isoDaysFromToday(-10),
      }),
    );

    const stats = await getDealStats(user);
    expect(stats.overdueCount).toBe(0);
  });

  it("syncs payment status forward on stage moves, never back", async () => {
    const user = await createTestUser();
    const sponsor = (await createSponsor(user, sponsorInput)).id;
    const deal = await createDeal(user, dealInput(sponsor));

    const invoiced = await updateDealStatus(user, deal.id, "invoiced");
    expect(invoiced?.paymentStatus).toBe("invoiced");

    const paid = await updateDealStatus(user, deal.id, "paid");
    expect(paid?.paymentStatus).toBe("paid");

    // Dragging the deal back does not un-pay it.
    const reopened = await updateDealStatus(user, deal.id, "invoiced");
    expect(reopened?.paymentStatus).toBe("paid");
  });

  it("deletes a deal", async () => {
    const deal = await createDeal(userA, dealInput(sponsorA));
    expect(await deleteDeal(userA, deal.id)).toBe(true);
    const listed = await listDeals(userA);
    expect(listed.find((d) => d.id === deal.id)).toBeUndefined();
  });

  it("cascades sponsor deletion to its deals", async () => {
    const user = await createTestUser();
    const sponsor = (await createSponsor(user, sponsorInput)).id;
    await createDeal(user, dealInput(sponsor));

    await deleteSponsor(user, sponsor);
    expect(await listDeals(user)).toHaveLength(0);
  });

  describe("tenant isolation", () => {
    it("hides other users' deals from lists", async () => {
      const deal = await createDeal(userA, dealInput(sponsorA));
      const bList = await listDeals(userB);
      expect(bList.find((d) => d.id === deal.id)).toBeUndefined();
    });

    it("blocks updating or deleting another user's deal", async () => {
      const deal = await createDeal(userA, dealInput(sponsorA));

      expect(
        await updateDeal(userB, deal.id, dealInput(sponsorA, { amount: 1 })),
      ).toBeNull();
      expect(await updateDealStatus(userB, deal.id, "paid")).toBeNull();
      expect(await deleteDeal(userB, deal.id)).toBe(false);

      const stillThere = await listDeals(userA);
      const unchanged = stillThere.find((d) => d.id === deal.id);
      expect(unchanged?.amountCents).toBe(100000);
      expect(unchanged?.status).toBe("lead");
    });

    it("keeps stats scoped to the acting user", async () => {
      const freshUser = await createTestUser();
      const stats = await getDealStats(freshUser);
      expect(stats).toEqual({
        activeCount: 0,
        inFlightCents: 0,
        overdueCount: 0,
        overdueCents: 0,
        nextDeliverableDate: null,
      });
    });
  });
});

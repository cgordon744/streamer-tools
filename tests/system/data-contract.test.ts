import { beforeAll, describe, expect, it } from "vitest";

import {
  createDeal,
  createSponsor,
  deleteDeal,
  getDealHistory,
  getPayableDeals,
  getVerifiedSponsors,
} from "@/domains/tracker/queries";

import { createTestUser } from "./helpers";

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

// The exported data contract (tracker spec §5) — the interface future
// domains (media kit, rates, invoices) consume. Behavior locked by tests.
describe("exported data contract", () => {
  describe("getVerifiedSponsors", () => {
    let user: string;

    beforeAll(async () => {
      user = await createTestUser();
    });

    it("includes only sponsors with a deal at content_delivered or later", async () => {
      const delivered = await createSponsor(user, {
        ...sponsorInput,
        name: "Delivered Co",
      });
      const paid = await createSponsor(user, {
        ...sponsorInput,
        name: "Paid Co",
      });
      const negotiating = await createSponsor(user, {
        ...sponsorInput,
        name: "Negotiating Co",
      });
      await createDeal(
        user,
        dealInput(delivered.id, { status: "content_delivered" }),
      );
      await createDeal(user, dealInput(paid.id, { status: "paid" }));
      await createDeal(
        user,
        dealInput(negotiating.id, { status: "negotiating" }),
      );

      const names = (await getVerifiedSponsors(user)).map((s) => s.name);
      expect(names).toContain("Delivered Co");
      expect(names).toContain("Paid Co");
      expect(names).not.toContain("Negotiating Co");
    });

    it("counts completed deals per sponsor", async () => {
      const sponsor = await createSponsor(user, {
        ...sponsorInput,
        name: "Repeat Co",
      });
      await createDeal(user, dealInput(sponsor.id, { status: "paid" }));
      await createDeal(user, dealInput(sponsor.id, { status: "invoiced" }));
      await createDeal(user, dealInput(sponsor.id, { status: "lead" }));

      const repeat = (await getVerifiedSponsors(user)).find(
        (s) => s.name === "Repeat Co",
      );
      expect(repeat?.completedDealCount).toBe(2);
    });
  });

  describe("getDealHistory", () => {
    it("returns all live deals with sponsor names, newest first, excluding soft-deleted", async () => {
      const user = await createTestUser();
      const sponsor = await createSponsor(user, sponsorInput);
      await createDeal(user, dealInput(sponsor.id, { amount: 100 }));
      await createDeal(user, dealInput(sponsor.id, { amount: 200 }));
      const gone = await createDeal(
        user,
        dealInput(sponsor.id, { amount: 300 }),
      );
      await deleteDeal(user, gone.id);

      const history = await getDealHistory(user);
      expect(history).toHaveLength(2);
      expect(history[0].sponsorName).toBe("Acme");
      expect(history.map((h) => h.amountCents)).not.toContain(300);
      // Newest first.
      const times = history.map((h) => h.createdAt.getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
    });
  });

  describe("getPayableDeals", () => {
    it("returns unpaid deals at invoiceable stages, nearest payment due first", async () => {
      const user = await createTestUser();
      const sponsor = await createSponsor(user, sponsorInput);
      await createDeal(
        user,
        dealInput(sponsor.id, {
          status: "content_delivered",
          amount: 100,
          paymentDueDate: "2026-09-01",
        }),
      );
      await createDeal(
        user,
        dealInput(sponsor.id, {
          status: "invoiced",
          paymentStatus: "invoiced" as const,
          amount: 200,
          paymentDueDate: "2026-08-01",
        }),
      );
      // Not payable: too early, already paid, or dead.
      await createDeal(user, dealInput(sponsor.id, { status: "negotiating" }));
      await createDeal(
        user,
        dealInput(sponsor.id, {
          status: "paid",
          paymentStatus: "paid" as const,
        }),
      );
      await createDeal(user, dealInput(sponsor.id, { status: "dead" }));
      // Invoiced stage but already paid off — not payable.
      await createDeal(
        user,
        dealInput(sponsor.id, {
          status: "invoiced",
          paymentStatus: "paid" as const,
        }),
      );

      const payable = await getPayableDeals(user);
      expect(payable.map((d) => d.amountCents)).toEqual([200, 100]);
    });

    it("is scoped to the acting user", async () => {
      const user = await createTestUser();
      expect(await getPayableDeals(user)).toEqual([]);
    });
  });
});

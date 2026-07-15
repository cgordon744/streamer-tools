import { beforeAll, describe, expect, it } from "vitest";

import { getDb } from "@/core/db/client";
import { deals, deliverables } from "@/domains/tracker/schema";
import { createDeal, createSponsor } from "@/domains/tracker/queries";

import { createTestUser } from "./helpers";

// The action layer checks cross-table ownership on every write; these tests
// pin the DB-level backstop (composite FKs, migration 0005): even a raw
// insert that bypasses the action layer cannot attach a child row to a
// parent owned by someone else.
describe("ownership backstop (composite FKs)", () => {
  let owner: string;
  let intruder: string;
  let ownerSponsor: string;
  let ownerDeal: string;

  beforeAll(async () => {
    owner = await createTestUser();
    intruder = await createTestUser();
    ownerSponsor = (
      await createSponsor(owner, {
        name: "Backstop Acme",
        contactName: null,
        contactEmail: null,
        notes: null,
      })
    ).id;
    ownerDeal = (
      await createDeal(owner, {
        sponsorId: ownerSponsor,
        status: "lead",
        amount: 1000,
        contentType: "video",
        paymentStatus: "not_invoiced",
        deliverableDueDate: null,
        paymentDueDate: null,
        notes: null,
      })
    ).id;
  });

  it("rejects a deal pointing at another user's sponsor", async () => {
    await expect(
      getDb().insert(deals).values({
        userId: intruder,
        sponsorId: ownerSponsor,
        amountCents: 1,
        contentType: "video",
      }),
    ).rejects.toMatchObject({
      // drizzle wraps the pg error; the violated constraint is on the cause.
      cause: expect.objectContaining({
        constraint: "tracker_deals_sponsor_owner_fk",
      }),
    });
  });

  it("rejects a deliverable pointing at another user's deal", async () => {
    await expect(
      getDb().insert(deliverables).values({
        userId: intruder,
        dealId: ownerDeal,
        title: "should never exist",
      }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        constraint: "tracker_deliverables_deal_owner_fk",
      }),
    });
  });

  it("still accepts matching-owner rows", async () => {
    await expect(
      getDb().insert(deliverables).values({
        userId: owner,
        dealId: ownerDeal,
        title: "legit deliverable",
      }),
    ).resolves.toBeDefined();
  });
});

import { beforeAll, describe, expect, it } from "vitest";

import { todayIso } from "@/lib/dates";
import {
  createDeal,
  createDeliverable,
  createSponsor,
  deleteDeliverable,
  deleteSponsor,
  getDealStats,
  listDeliverables,
  setDeliverableCompleted,
} from "@/domains/tracker/queries";

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
    status: "contract_signed" as const,
    amount: 100000,
    contentType: "video" as const,
    paymentStatus: "not_invoiced" as const,
    deliverableDueDate: null,
    paymentDueDate: null,
    notes: null,
    ...overrides,
  };
}

describe("deliverable service", () => {
  let userA: string;
  let userB: string;
  let dealA: string;

  beforeAll(async () => {
    userA = await createTestUser();
    userB = await createTestUser();
    const sponsor = await createSponsor(userA, sponsorInput);
    dealA = (await createDeal(userA, dealInput(sponsor.id))).id;
  });

  it("creates and lists deliverables, due-dated first", async () => {
    const user = await createTestUser();
    const sponsor = await createSponsor(user, sponsorInput);
    const deal = (await createDeal(user, dealInput(sponsor.id))).id;

    await createDeliverable(user, {
      dealId: deal,
      title: "No date",
      dueDate: null,
    });
    await createDeliverable(user, {
      dealId: deal,
      title: "Later",
      dueDate: isoDaysFromToday(10),
    });
    await createDeliverable(user, {
      dealId: deal,
      title: "Sooner",
      dueDate: isoDaysFromToday(3),
    });

    const titles = (await listDeliverables(user)).map((d) => d.title);
    expect(titles).toEqual(["Sooner", "Later", "No date"]);
  });

  it("checks a deliverable off and reopens it", async () => {
    const item = await createDeliverable(userA, {
      dealId: dealA,
      title: "Draft script",
      dueDate: null,
    });
    expect(item.completedAt).toBeNull();

    const done = await setDeliverableCompleted(userA, item.id, true);
    expect(done?.completedAt).toBeInstanceOf(Date);

    const reopened = await setDeliverableCompleted(userA, item.id, false);
    expect(reopened?.completedAt).toBeNull();
  });

  it("soft-deletes: removed items disappear from lists", async () => {
    const item = await createDeliverable(userA, {
      dealId: dealA,
      title: "Throwaway",
      dueDate: null,
    });
    expect(await deleteDeliverable(userA, item.id)).toBe(true);
    const listed = await listDeliverables(userA);
    expect(listed.find((d) => d.id === item.id)).toBeUndefined();
    // Deleting again reports not-found (already gone).
    expect(await deleteDeliverable(userA, item.id)).toBe(false);
  });

  it("feeds nextDeliverableDate in stats from open checklist items only", async () => {
    const user = await createTestUser();
    const sponsor = await createSponsor(user, sponsorInput);
    const deal = (await createDeal(user, dealInput(sponsor.id))).id;

    const item = await createDeliverable(user, {
      dealId: deal,
      title: "Upload video",
      dueDate: isoDaysFromToday(4),
    });
    expect((await getDealStats(user, todayIso())).nextDeliverableDate).toBe(
      isoDaysFromToday(4),
    );

    // Completing it clears the date; nothing else is upcoming.
    await setDeliverableCompleted(user, item.id, true);
    expect(
      (await getDealStats(user, todayIso())).nextDeliverableDate,
    ).toBeNull();
  });

  it("soft-deleting a sponsor keeps its deliverables out of stats", async () => {
    const user = await createTestUser();
    const sponsor = await createSponsor(user, sponsorInput);
    const deal = (await createDeal(user, dealInput(sponsor.id))).id;
    await createDeliverable(user, {
      dealId: deal,
      title: "Orphaned",
      dueDate: isoDaysFromToday(5),
    });

    await deleteSponsor(user, sponsor.id);
    // The deal is soft-deleted with the sponsor; its checklist items must
    // stop surfacing as the next deliverable.
    const stats = await getDealStats(user, todayIso());
    expect(stats.activeCount).toBe(0);
    expect(stats.nextDeliverableDate).toBeNull();
  });

  describe("tenant isolation", () => {
    it("blocks creating for, toggling, or deleting another user's data", async () => {
      const item = await createDeliverable(userA, {
        dealId: dealA,
        title: "Mine",
        dueDate: null,
      });

      expect(await setDeliverableCompleted(userB, item.id, true)).toBeNull();
      expect(await deleteDeliverable(userB, item.id)).toBe(false);

      const bList = await listDeliverables(userB);
      expect(bList.find((d) => d.id === item.id)).toBeUndefined();
    });
  });
});

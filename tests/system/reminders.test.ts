import { beforeAll, describe, expect, it } from "vitest";

import type { EmailMessage, EmailSender } from "@/core/email/sender";
import { todayIso } from "@/lib/dates";
import {
  createDeal,
  createDeliverable,
  createSponsor,
  setDeliverableCompleted,
} from "@/domains/tracker/queries";
import { sendDueReminders } from "@/domains/tracker/reminders";

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
    amount: 150000,
    contentType: "video" as const,
    paymentStatus: "invoiced" as const,
    deliverableDueDate: null,
    paymentDueDate: null,
    notes: null,
    ...overrides,
  };
}

function fakeSender(): EmailSender & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    name: "fake",
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}

// The cron's selection rules are stateless and date-derived (no sent-log):
// deliverables fire at exactly due-in-2-days; overdue payments on day 1
// past due, then weekly (8, 15, …).
describe("sendDueReminders", () => {
  let today: string;

  beforeAll(() => {
    today = todayIso();
  });

  it("reminds about a checklist deliverable due in exactly 2 days", async () => {
    const user = await createTestUser();
    const sponsor = await createSponsor(user, sponsorInput);
    const deal = await createDeal(user, dealInput(sponsor.id));
    await createDeliverable(user, {
      dealId: deal.id,
      title: "Draft script",
      dueDate: isoDaysFromToday(2),
    });
    // Not due in exactly 2 days — no reminder for these.
    await createDeliverable(user, {
      dealId: deal.id,
      title: "Too soon",
      dueDate: isoDaysFromToday(1),
    });
    await createDeliverable(user, {
      dealId: deal.id,
      title: "Too far",
      dueDate: isoDaysFromToday(3),
    });

    const sender = fakeSender();
    const result = await sendDueReminders(today, sender);

    const mine = sender.sent.filter((m) => m.text.includes("Draft script"));
    expect(mine).toHaveLength(1);
    expect(mine[0].text).not.toContain("Too soon");
    expect(mine[0].text).not.toContain("Too far");
    expect(result.deliverables).toBeGreaterThanOrEqual(1);
  });

  it("skips completed deliverables and dead deals", async () => {
    const user = await createTestUser();
    const sponsor = await createSponsor(user, sponsorInput);

    const live = await createDeal(user, dealInput(sponsor.id));
    const done = await createDeliverable(user, {
      dealId: live.id,
      title: "Already done",
      dueDate: isoDaysFromToday(2),
    });
    await setDeliverableCompleted(user, done.id, true);

    const dead = await createDeal(
      user,
      dealInput(sponsor.id, { status: "dead" }),
    );
    await createDeliverable(user, {
      dealId: dead.id,
      title: "Dead deal item",
      dueDate: isoDaysFromToday(2),
    });

    const sender = fakeSender();
    await sendDueReminders(today, sender);
    const texts = sender.sent.map((m) => m.text).join("\n");
    expect(texts).not.toContain("Already done");
    expect(texts).not.toContain("Dead deal item");
  });

  it("reminds about a deal-level deliverable date due in 2 days", async () => {
    const user = await createTestUser();
    const sponsor = await createSponsor(user, {
      ...sponsorInput,
      name: "DealLevel Co",
    });
    await createDeal(
      user,
      dealInput(sponsor.id, { deliverableDueDate: isoDaysFromToday(2) }),
    );

    const sender = fakeSender();
    await sendDueReminders(today, sender);
    const mine = sender.sent.filter((m) => m.text.includes("DealLevel Co"));
    expect(mine).toHaveLength(1);
  });

  it("reminds about overdue payments on day 1 and day 8, but not day 6", async () => {
    const user = await createTestUser();
    // Unique name: the digest scan is cross-user, so filtering must not
    // collide with other tests' sponsors.
    const sponsor = await createSponsor(user, {
      ...sponsorInput,
      name: "OverduePay Co",
    });
    await createDeal(
      user,
      dealInput(sponsor.id, {
        amount: 100,
        paymentDueDate: isoDaysFromToday(-1), // day 1 past due → remind
      }),
    );
    await createDeal(
      user,
      dealInput(sponsor.id, {
        amount: 200,
        paymentDueDate: isoDaysFromToday(-8), // day 8 → weekly re-ping
      }),
    );
    await createDeal(
      user,
      dealInput(sponsor.id, {
        amount: 300,
        paymentDueDate: isoDaysFromToday(-6), // day 6 → quiet
      }),
    );
    await createDeal(
      user,
      dealInput(sponsor.id, {
        amount: 400,
        paymentStatus: "paid" as const, // paid → never
        paymentDueDate: isoDaysFromToday(-1),
      }),
    );

    const sender = fakeSender();
    await sendDueReminders(today, sender);

    const mine = sender.sent.filter((m) => m.text.includes("OverduePay Co"));
    expect(mine).toHaveLength(1); // one digest for the user
    expect(mine[0].text).toContain("$1.00");
    expect(mine[0].text).toContain("$2.00");
    expect(mine[0].text).not.toContain("$3.00");
    expect(mine[0].text).not.toContain("$4.00");
    expect(mine[0].subject).toContain("2 payments overdue");
  });

  it("keeps sending after one user's digest fails, and reports the failure", async () => {
    const victim = await createTestUser();
    const bystander = await createTestUser();
    for (const [user, name] of [
      [victim, "FailFirst Co"],
      [bystander, "StillSends Co"],
    ] as const) {
      const sponsor = await createSponsor(user, { ...sponsorInput, name });
      await createDeal(
        user,
        dealInput(sponsor.id, { paymentDueDate: isoDaysFromToday(-1) }),
      );
    }

    const sender = fakeSender();
    const failingSender: typeof sender = {
      ...sender,
      async send(message) {
        if (message.text.includes("FailFirst Co")) {
          throw new Error("provider rejected recipient");
        }
        return sender.send(message);
      },
    };

    const result = await sendDueReminders(today, failingSender);

    // The bystander's digest still went out despite the earlier failure.
    expect(
      sender.sent.filter((m) => m.text.includes("StillSends Co")),
    ).toHaveLength(1);
    expect(sender.sent.filter((m) => m.text.includes("FailFirst Co"))).toEqual(
      [],
    );
    expect(result.failedSends).toBe(1);
    expect(result.failures[0].error).toBeInstanceOf(Error);
    // Both digests count as attempted.
    expect(result.users).toBeGreaterThanOrEqual(2);
  });

  it("bundles a user's deliverables and overdue payments into one digest", async () => {
    const user = await createTestUser();
    const sponsor = await createSponsor(user, {
      ...sponsorInput,
      name: "Digest Co",
    });
    const deal = await createDeal(
      user,
      dealInput(sponsor.id, { paymentDueDate: isoDaysFromToday(-1) }),
    );
    await createDeliverable(user, {
      dealId: deal.id,
      title: "Digest deliverable",
      dueDate: isoDaysFromToday(2),
    });

    const sender = fakeSender();
    await sendDueReminders(today, sender);
    const mine = sender.sent.filter((m) => m.text.includes("Digest Co"));
    expect(mine).toHaveLength(1);
    expect(mine[0].text).toContain("Digest deliverable");
    expect(mine[0].text).toContain("Payments past due:");
  });
});

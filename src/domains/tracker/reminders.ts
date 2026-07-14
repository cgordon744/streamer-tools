// Reminder logic for the daily cron (spec §6): deliverables due in 48h and
// overdue payments. Stateless by design — what to send is derived entirely
// from the data and today's date, so the cron is idempotent per day and
// needs no sent-log table:
//   - deliverable reminder fires on the day the due date is exactly 2 days out
//   - overdue-payment reminder fires on day 1 past due, then weekly (8, 15, …)

import { and, eq, isNull, sql } from "drizzle-orm";

import { users } from "@/core/auth/schema";
import { getDb } from "@/core/db/client";
import type { EmailMessage, EmailSender } from "@/core/email/sender";
import { formatDueDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { daysPastDue } from "@/domains/tracker/payments";
import { deals, deliverables, sponsors } from "@/domains/tracker/schema";

type DeliverableReminder = {
  userId: string;
  email: string;
  userName: string;
  sponsorName: string;
  title: string;
  dueDate: string;
};

type OverdueReminder = {
  userId: string;
  email: string;
  userName: string;
  sponsorName: string;
  amountCents: number;
  paymentDueDate: string;
};

const activeDeal = sql`${deals.status} not in ('paid', 'dead')`;

// Deliverables (checklist items and deal-level dates) due exactly two days
// from `today`, across all users — the cron acts for everyone.
async function findDeliverablesDueSoon(
  today: string,
): Promise<DeliverableReminder[]> {
  const db = getDb();

  const checklist = await db
    .select({
      userId: deliverables.userId,
      email: users.email,
      userName: users.name,
      sponsorName: sponsors.name,
      title: deliverables.title,
      dueDate: deliverables.dueDate,
    })
    .from(deliverables)
    .innerJoin(deals, eq(deliverables.dealId, deals.id))
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .innerJoin(users, eq(deliverables.userId, users.id))
    .where(
      and(
        isNull(deliverables.deletedAt),
        isNull(deliverables.completedAt),
        isNull(deals.deletedAt),
        activeDeal,
        sql`${deliverables.dueDate} = (${today}::date + 2)`,
      ),
    );

  const dealLevel = await db
    .select({
      userId: deals.userId,
      email: users.email,
      userName: users.name,
      sponsorName: sponsors.name,
      contentType: deals.contentType,
      dueDate: deals.deliverableDueDate,
    })
    .from(deals)
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .innerJoin(users, eq(deals.userId, users.id))
    .where(
      and(
        isNull(deals.deletedAt),
        activeDeal,
        sql`${deals.deliverableDueDate} = (${today}::date + 2)`,
      ),
    );

  return [
    ...checklist.map((r) => ({ ...r, dueDate: r.dueDate! })),
    ...dealLevel.map((r) => ({
      userId: r.userId,
      email: r.email,
      userName: r.userName,
      sponsorName: r.sponsorName,
      title: `${r.contentType} deliverable`,
      dueDate: r.dueDate!,
    })),
  ];
}

// Overdue payments hitting a reminder day: 1 day past due, then weekly.
async function findOverduePaymentsToRemind(
  today: string,
): Promise<OverdueReminder[]> {
  const db = getDb();
  const rows = await db
    .select({
      userId: deals.userId,
      email: users.email,
      userName: users.name,
      sponsorName: sponsors.name,
      amountCents: deals.amountCents,
      paymentDueDate: deals.paymentDueDate,
    })
    .from(deals)
    .innerJoin(sponsors, eq(deals.sponsorId, sponsors.id))
    .innerJoin(users, eq(deals.userId, users.id))
    .where(
      and(
        isNull(deals.deletedAt),
        sql`${deals.paymentStatus} <> 'paid'`,
        sql`${deals.status} <> 'dead'`,
        sql`${deals.paymentDueDate} < ${today}::date`,
      ),
    );

  return rows
    .map((r) => ({ ...r, paymentDueDate: r.paymentDueDate! }))
    .filter((r) => daysPastDue(r.paymentDueDate, today) % 7 === 1);
}

function buildEmail(
  email: string,
  userName: string,
  dueSoon: DeliverableReminder[],
  overdue: OverdueReminder[],
): EmailMessage {
  const parts: string[] = [`Hi ${userName},`];

  if (overdue.length > 0) {
    parts.push(
      "Payments past due:",
      ...overdue.map(
        (o) =>
          `  • ${o.sponsorName} — ${formatCents(o.amountCents)}, due ${formatDueDate(o.paymentDueDate)}`,
      ),
    );
  }
  if (dueSoon.length > 0) {
    parts.push(
      "Deliverables due in the next 48 hours:",
      ...dueSoon.map(
        (d) =>
          `  • ${d.sponsorName} — ${d.title}, due ${formatDueDate(d.dueDate)}`,
      ),
    );
  }
  parts.push("", "— Streamer Tools");

  const subjectBits = [
    overdue.length > 0
      ? `${overdue.length} payment${overdue.length === 1 ? "" : "s"} overdue`
      : null,
    dueSoon.length > 0
      ? `${dueSoon.length} deliverable${dueSoon.length === 1 ? "" : "s"} due soon`
      : null,
  ].filter(Boolean);

  return {
    to: email,
    subject: `Streamer Tools: ${subjectBits.join(", ")}`,
    text: parts.join("\n"),
  };
}

// Entry point for the cron route: gathers everything due, groups per user,
// sends one digest email each. Returns counts for the cron response/logs.
export async function sendDueReminders(
  today: string,
  sender: EmailSender,
): Promise<{ users: number; deliverables: number; overdue: number }> {
  const [dueSoon, overdue] = await Promise.all([
    findDeliverablesDueSoon(today),
    findOverduePaymentsToRemind(today),
  ]);

  const byUser = new Map<
    string,
    {
      email: string;
      userName: string;
      due: DeliverableReminder[];
      over: OverdueReminder[];
    }
  >();
  for (const d of dueSoon) {
    const entry = byUser.get(d.userId) ?? {
      email: d.email,
      userName: d.userName,
      due: [],
      over: [],
    };
    entry.due.push(d);
    byUser.set(d.userId, entry);
  }
  for (const o of overdue) {
    const entry = byUser.get(o.userId) ?? {
      email: o.email,
      userName: o.userName,
      due: [],
      over: [],
    };
    entry.over.push(o);
    byUser.set(o.userId, entry);
  }

  for (const entry of byUser.values()) {
    await sender.send(
      buildEmail(entry.email, entry.userName, entry.due, entry.over),
    );
  }

  return {
    users: byUser.size,
    deliverables: dueSoon.length,
    overdue: overdue.length,
  };
}

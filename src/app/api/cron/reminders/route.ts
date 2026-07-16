import { getEmailSender } from "@/core/email/sender";
import { reportError } from "@/core/errors/report";
import { todayIso } from "@/lib/dates";
import { sendDueReminders } from "@/domains/tracker/reminders";

// Daily reminder cron (vercel.json crons). Vercel calls with
// `Authorization: Bearer ${CRON_SECRET}` when that env var is set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Refuse to run unauthenticated in prod — set CRON_SECRET (NEEDS INPUT).
    return Response.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const sender = getEmailSender();
  const { failures, ...counts } = await sendDueReminders(todayIso(), sender);
  // Failed digests are alerts (Sentry), not a failed run: the other sends
  // succeeded, and a retry would double-send to the users who got theirs.
  for (const failure of failures) {
    reportError(failure.error, {
      cron: "reminders",
      recipient: failure.email,
    });
  }
  return Response.json({ sender: sender.name, ...counts });
}

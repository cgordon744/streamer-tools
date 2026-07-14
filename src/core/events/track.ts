import { and, eq, gt } from "drizzle-orm";

import { getDb } from "@/core/db/client";
import { events } from "@/core/events/schema";

// The event vocabulary. Activation = signup → deal_created; retention =
// weekly presence of `active`. Add names here as new tools land.
export type AppEvent =
  | "signup"
  | "deal_created"
  | "deal_stage_changed"
  | "active";

// Instrumentation must never break a user-facing flow — failures are
// swallowed after logging.
export async function trackEvent(
  userId: string,
  event: AppEvent,
): Promise<void> {
  try {
    await getDb().insert(events).values({ userId, event });
  } catch (error) {
    console.error(`trackEvent(${event}) failed`, error);
  }
}

// Weekly-active heartbeat, throttled to one `active` row per 24h so layout
// renders don't flood the table. Weekly retention = any row in the week.
export async function recordHeartbeat(userId: string): Promise<void> {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recent] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          eq(events.event, "active"),
          gt(events.createdAt, cutoff),
        ),
      )
      .limit(1);
    if (!recent) {
      await db.insert(events).values({ userId, event: "active" });
    }
  } catch (error) {
    console.error("recordHeartbeat failed", error);
  }
}

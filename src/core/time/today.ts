import { cookies } from "next/headers";

import { TIMEZONE_COOKIE } from "@/core/time/timezone-cookie";
import { todayInTimeZone } from "@/lib/dates";

export { TIMEZONE_COOKIE };

// Request-scoped "today" (YYYY-MM-DD) in the user's timezone, as reported by
// the browser through the tz cookie. Falls back to the server clock when the
// cookie is absent (first-ever paint) or invalid.
export async function getToday(): Promise<string> {
  const timeZone = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  return todayInTimeZone(timeZone);
}

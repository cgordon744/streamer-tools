"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TIMEZONE_COOKIE } from "@/core/time/timezone-cookie";

// Reports the browser's IANA timezone to the server via a cookie (same
// pattern as the sidebar's persistence cookies) so getToday() can compute
// dates in the user's zone. Refreshes once when the value changes — on the
// very first visit and whenever the user's timezone actually moves.
export function TimezoneSync({ current }: { current: string | undefined }) {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // IANA names only contain cookie-safe characters — no encoding, so the
    // raw value round-trips and the comparison above can't loop.
    if (timeZone && timeZone !== current) {
      document.cookie = `${TIMEZONE_COOKIE}=${timeZone}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [current, router]);

  return null;
}

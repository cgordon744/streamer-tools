import type { NextRequest } from "next/server";

export const STATE_COOKIE = "yt_oauth_state";

// Derived from the request origin so dev and prod both hit their registered
// redirect URI (NEEDS INPUT #7 lists both) without an env var.
export function oauthCallbackUrl(request: NextRequest): string {
  return `${request.nextUrl.origin}/api/youtube/oauth/callback`;
}

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { flags } from "@/core/config/flags";
import { trackEvent } from "@/core/events/track";
import { completeStubConnection } from "@/core/youtube/demographics";
import { buildAuthUrl, isYouTubeOAuthConfigured } from "@/core/youtube/oauth";

import { STATE_COOKIE, oauthCallbackUrl } from "../shared";

// Entry point for "Connect YouTube": sets the CSRF state cookie and sends the
// browser to Google's consent screen. Session-protected by proxy.ts like
// every non-cron route; re-checked here because the route is its own endpoint.
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!flags.mediaKitEnabled) {
    return new NextResponse(null, { status: 404 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  // No Google credentials in this environment (NEEDS INPUT #7): complete a
  // stub connect so the full flow works in dev/CI — same pattern as the
  // Data API stub client.
  if (!isYouTubeOAuthConfigured()) {
    const { created } = await completeStubConnection(userId);
    if (created) {
      await trackEvent(userId, "youtube_connected");
    }
    return NextResponse.redirect(
      new URL("/media-kit?yt=connected", request.nextUrl.origin),
    );
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(
    buildAuthUrl({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      redirectUri: oauthCallbackUrl(request),
      state,
    }),
  );
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/youtube/oauth",
    maxAge: 60 * 10,
  });
  return response;
}

import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { flags } from "@/core/config/flags";
import { reportError } from "@/core/errors/report";
import { trackEvent } from "@/core/events/track";
import { completeConnection } from "@/core/youtube/demographics";
import { exchangeCode } from "@/core/youtube/oauth";

import { STATE_COOKIE, oauthCallbackUrl } from "../shared";

// Google redirects here after consent. Outcomes surface to the editor via the
// ?yt= query value: connected / denied (user said no) / error.
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!flags.mediaKitEnabled) {
    return new NextResponse(null, { status: 404 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const params = request.nextUrl.searchParams;
  const finish = (outcome: "connected" | "denied" | "error") => {
    const response = NextResponse.redirect(
      new URL(`/media-kit?yt=${outcome}`, request.nextUrl.origin),
    );
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  if (params.get("error")) {
    // access_denied et al. — the user changed their mind at the consent
    // screen; not an application error.
    return finish("denied");
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return finish("error");
  }

  try {
    const grant = await exchangeCode({
      code,
      redirectUri: oauthCallbackUrl(request),
    });
    const { created } = await completeConnection(userId, grant);
    if (created) {
      await trackEvent(userId, "youtube_connected");
    }
    return finish("connected");
  } catch (error) {
    reportError(error, { route: "youtube/oauth/callback" });
    return finish("error");
  }
}

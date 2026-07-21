// Google OAuth for the YouTube Analytics grant (media-kit demographics).
// Deliberately not an Auth.js provider: this is *linking* — an already
// signed-in user grants analytics read access — not sign-in (see BUILD_LOG
// 2026-07-21). Route handlers own the redirects; everything here is plain
// request/URL logic so it stays unit-testable.

// The only scope requested: enough for reports.query on `channel==MINE`,
// and every extra sensitive scope raises consent-screen verification
// friction (NEEDS INPUT #7).
export const ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/yt-analytics.readonly";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export function isYouTubeOAuthConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function buildAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: ANALYTICS_SCOPE,
    // offline + consent guarantees a refresh token on every connect, so
    // reconnecting always heals a lost/revoked grant.
    access_type: "offline",
    prompt: "consent",
    state: options.state,
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export type TokenGrant = {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
};

export async function exchangeCode(options: {
  code: string;
  redirectUri: string;
}): Promise<TokenGrant> {
  const body = await tokenRequest({
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.redirectUri,
  });
  if (!body.ok) {
    throw new Error(`OAuth code exchange failed: ${body.error}`);
  }
  return {
    accessToken: body.json.access_token as string,
    refreshToken: (body.json.refresh_token as string | undefined) ?? null,
    scope: (body.json.scope as string | undefined) ?? ANALYTICS_SCOPE,
  };
}

export type RefreshResult =
  | { ok: true; accessToken: string }
  // "revoked" = the user withdrew the grant in their Google account
  // (invalid_grant) — the connection is dead and must be re-consented.
  | { ok: false; reason: "revoked" | "error" };

export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshResult> {
  const body = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  if (body.ok) {
    return { ok: true, accessToken: body.json.access_token as string };
  }
  return {
    ok: false,
    reason: body.error === "invalid_grant" ? "revoked" : "error",
  };
}

// Disconnect should mean disconnected on Google's side too; failures are
// swallowed — the row deletion is the operation that matters to us.
export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });
  } catch (error) {
    console.error("OAuth token revoke failed", error);
  }
}

type TokenResponse =
  { ok: true; json: Record<string, unknown> } | { ok: false; error: string };

async function tokenRequest(
  params: Record<string, string>,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // Google's error code (e.g. invalid_grant) — never the tokens.
    return { ok: false, error: (json.error as string) ?? `http_${res.status}` };
  }
  return { ok: true, json };
}

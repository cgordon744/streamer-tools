import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_SCOPE,
  buildAuthUrl,
  exchangeCode,
  isYouTubeOAuthConfigured,
  refreshAccessToken,
} from "@/core/youtube/oauth";

function setGoogleEnv() {
  process.env.GOOGLE_CLIENT_ID = "client-id.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("oauth", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    savedEnv.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  afterEach(() => {
    for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) {
      if (savedEnv[key] !== undefined) process.env[key] = savedEnv[key];
      else delete process.env[key];
    }
    vi.unstubAllGlobals();
  });

  it("is unconfigured unless both client id and secret are set", () => {
    expect(isYouTubeOAuthConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_ID = "id";
    expect(isYouTubeOAuthConfigured()).toBe(false);
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    expect(isYouTubeOAuthConfigured()).toBe(true);
  });

  it("builds a consent URL with offline access and the analytics scope only", () => {
    const url = new URL(
      buildAuthUrl({
        clientId: "the-client",
        redirectUri: "http://localhost:3000/api/youtube/oauth/callback",
        state: "the-state",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe("the-client");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/youtube/oauth/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(ANALYTICS_SCOPE);
    // offline + consent is what guarantees a refresh token on reconnect.
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("the-state");
  });

  it("exchanges a code for tokens", async () => {
    setGoogleEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, {
          access_token: "at",
          refresh_token: "rt",
          scope: ANALYTICS_SCOPE,
        }),
      ),
    );
    const grant = await exchangeCode({
      code: "the-code",
      redirectUri: "http://localhost:3000/api/youtube/oauth/callback",
    });
    expect(grant).toEqual({
      accessToken: "at",
      refreshToken: "rt",
      scope: ANALYTICS_SCOPE,
    });
    const body = (vi.mocked(fetch).mock.calls[0][1] as RequestInit)
      .body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("the-code");
    expect(body.get("client_secret")).toBe("client-secret");
  });

  it("throws on a failed code exchange without leaking tokens", async () => {
    setGoogleEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(400, { error: "invalid_request" })),
    );
    await expect(
      exchangeCode({ code: "bad", redirectUri: "http://x/cb" }),
    ).rejects.toThrow("invalid_request");
  });

  it("maps invalid_grant on refresh to a revoked result", async () => {
    setGoogleEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(400, { error: "invalid_grant" })),
    );
    expect(await refreshAccessToken("rt")).toEqual({
      ok: false,
      reason: "revoked",
    });
  });

  it("maps other refresh failures to error, success to a token", async () => {
    setGoogleEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(500, {})),
    );
    expect(await refreshAccessToken("rt")).toEqual({
      ok: false,
      reason: "error",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(200, { access_token: "fresh" })),
    );
    expect(await refreshAccessToken("rt")).toEqual({
      ok: true,
      accessToken: "fresh",
    });
  });
});

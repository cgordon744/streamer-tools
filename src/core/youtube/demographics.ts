// Orchestrates the demographics lifecycle around a user's YouTube connection:
// complete a new connect, refresh on demand, disconnect. Domain actions call
// these; no domain touches tokens or the Analytics API directly.

import { open, seal } from "@/core/crypto/secretbox";
import {
  getAnalyticsClient,
  type AnalyticsClient,
} from "@/core/youtube/analytics";
import {
  isYouTubeOAuthConfigured,
  refreshAccessToken,
  revokeToken,
  type TokenGrant,
} from "@/core/youtube/oauth";
import {
  deleteConnectionForUser,
  getConnectionForUser,
  setConnectionDemographics,
  upsertConnectionForUser,
} from "@/core/youtube/queries";

const STUB_SCOPE = "stub";

// Called by the OAuth callback after a successful code exchange: store the
// sealed grant, then fetch demographics immediately with the access token in
// hand (no refresh round-trip on the happy path).
export async function completeConnection(
  userId: string,
  grant: TokenGrant,
  client: AnalyticsClient = getAnalyticsClient({ stubSeed: userId }),
): Promise<{ created: boolean }> {
  const { created } = await upsertConnectionForUser(userId, {
    refreshTokenEnc: grant.refreshToken ? seal(grant.refreshToken) : null,
    scope: grant.scope,
  });
  const demographics = await client.fetchDemographics(grant.accessToken);
  await setConnectionDemographics(userId, demographics);
  return { created };
}

// The no-credential path (dev/CI/tests, and prod until NEEDS INPUT #7): the
// start route short-circuits here instead of redirecting to Google.
export async function completeStubConnection(
  userId: string,
): Promise<{ created: boolean }> {
  return completeConnection(
    userId,
    { accessToken: "stub", refreshToken: null, scope: STUB_SCOPE },
    getAnalyticsClient({ stubSeed: userId }),
  );
}

export type RefreshDemographicsResult =
  | "refreshed"
  | "no_connection"
  // The grant is gone (revoked at Google, or stub-connected before real
  // credentials landed) — the connection row was deleted; UI offers reconnect.
  | "reconnect_required"
  | "error";

export async function refreshDemographicsForUser(
  userId: string,
  client: AnalyticsClient = getAnalyticsClient({ stubSeed: userId }),
): Promise<RefreshDemographicsResult> {
  const connection = await getConnectionForUser(userId);
  if (!connection) return "no_connection";

  if (!isYouTubeOAuthConfigured()) {
    // Stub mode needs no token at all.
    const demographics = await client.fetchDemographics("stub");
    await setConnectionDemographics(userId, demographics);
    return "refreshed";
  }

  const refreshToken = connection.refreshTokenEnc
    ? open(connection.refreshTokenEnc)
    : null;
  if (!refreshToken) {
    await deleteConnectionForUser(userId);
    return "reconnect_required";
  }

  const refreshed = await refreshAccessToken(refreshToken);
  if (!refreshed.ok) {
    if (refreshed.reason === "revoked") {
      await deleteConnectionForUser(userId);
      return "reconnect_required";
    }
    return "error";
  }

  try {
    const demographics = await client.fetchDemographics(refreshed.accessToken);
    await setConnectionDemographics(userId, demographics);
    return "refreshed";
  } catch (error) {
    console.error("Demographics fetch failed", error);
    return "error";
  }
}

export async function disconnectYouTubeForUser(userId: string): Promise<void> {
  const connection = await deleteConnectionForUser(userId);
  if (!connection?.refreshTokenEnc) return;
  const refreshToken = open(connection.refreshTokenEnc);
  if (refreshToken && isYouTubeOAuthConfigured()) {
    await revokeToken(refreshToken);
  }
}

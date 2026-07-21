import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { seal } from "@/core/crypto/secretbox";
import {
  completeConnection,
  completeStubConnection,
  disconnectYouTubeForUser,
  refreshDemographicsForUser,
} from "@/core/youtube/demographics";
import {
  deleteConnectionForUser,
  getConnectionForUser,
  setConnectionDemographics,
  upsertConnectionForUser,
} from "@/core/youtube/queries";

import { createTestUser } from "./helpers";

const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET"];

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  // Default: unconfigured (stub mode), like CI.
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  process.env.AUTH_SECRET = "system-test-auth-secret";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] !== undefined) process.env[key] = savedEnv[key];
    else delete process.env[key];
  }
  vi.unstubAllGlobals();
});

function configureGoogle() {
  process.env.GOOGLE_CLIENT_ID = "id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
}

describe("connection upsert", () => {
  it("creates on first connect, replaces in place on reconnect", async () => {
    const userId = await createTestUser();

    const first = await upsertConnectionForUser(userId, {
      refreshTokenEnc: seal("token-1"),
      scope: "scope-a",
    });
    expect(first.created).toBe(true);

    const second = await upsertConnectionForUser(userId, {
      refreshTokenEnc: seal("token-2"),
      scope: "scope-b",
    });
    expect(second.created).toBe(false);
    expect(second.connection.id).toBe(first.connection.id);
    expect(second.connection.scope).toBe("scope-b");
  });

  it("scopes connections per user", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await upsertConnectionForUser(a, { refreshTokenEnc: null, scope: "s" });

    expect(await getConnectionForUser(b)).toBeNull();
    await deleteConnectionForUser(b);
    expect(await getConnectionForUser(a)).not.toBeNull();
  });

  it("stores demographics jsonb with a fetch timestamp", async () => {
    const userId = await createTestUser();
    await upsertConnectionForUser(userId, {
      refreshTokenEnc: null,
      scope: "s",
    });
    await setConnectionDemographics(userId, {
      ageGroups: [{ range: "18-24", pct: 50 }],
      genders: [{ group: "male", pct: 60 }],
      topCountries: [{ code: "US", pct: 40 }],
      windowDays: 90,
    });
    const connection = await getConnectionForUser(userId);
    expect(connection!.demographics!.ageGroups).toEqual([
      { range: "18-24", pct: 50 },
    ]);
    expect(connection!.demographicsFetchedAt).not.toBeNull();
  });
});

describe("stub connect (no Google credentials)", () => {
  it("creates a tokenless connection with demographics populated", async () => {
    const userId = await createTestUser();
    const { created } = await completeStubConnection(userId);
    expect(created).toBe(true);

    const connection = await getConnectionForUser(userId);
    expect(connection!.refreshTokenEnc).toBeNull();
    expect(connection!.demographics).not.toBeNull();
    expect(connection!.demographics!.windowDays).toBe(90);
  });

  it("reports created=false when reconnecting", async () => {
    const userId = await createTestUser();
    await completeStubConnection(userId);
    const { created } = await completeStubConnection(userId);
    expect(created).toBe(false);
  });
});

describe("refreshDemographicsForUser", () => {
  it("returns no_connection without a connection", async () => {
    const userId = await createTestUser();
    expect(await refreshDemographicsForUser(userId)).toBe("no_connection");
  });

  it("refreshes in stub mode and bumps the fetch timestamp", async () => {
    const userId = await createTestUser();
    await completeStubConnection(userId);
    const before = (await getConnectionForUser(userId))!;

    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await refreshDemographicsForUser(userId)).toBe("refreshed");
    const after = (await getConnectionForUser(userId))!;
    expect(after.demographicsFetchedAt!.getTime()).toBeGreaterThan(
      before.demographicsFetchedAt!.getTime(),
    );
    // Stub demographics are deterministic per user.
    expect(after.demographics).toEqual(before.demographics);
  });

  it("deletes a tokenless connection once credentials are configured", async () => {
    const userId = await createTestUser();
    await completeStubConnection(userId);

    configureGoogle();
    expect(await refreshDemographicsForUser(userId)).toBe("reconnect_required");
    expect(await getConnectionForUser(userId)).toBeNull();
  });

  it("deletes the connection when Google reports the grant revoked", async () => {
    const userId = await createTestUser();
    await upsertConnectionForUser(userId, {
      refreshTokenEnc: seal("revoked-token"),
      scope: "s",
    });

    configureGoogle();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "invalid_grant" }), {
            status: 400,
          }),
      ),
    );
    expect(await refreshDemographicsForUser(userId)).toBe("reconnect_required");
    expect(await getConnectionForUser(userId)).toBeNull();
  });

  it("keeps the connection on transient failures", async () => {
    const userId = await createTestUser();
    await upsertConnectionForUser(userId, {
      refreshTokenEnc: seal("good-token"),
      scope: "s",
    });

    configureGoogle();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    expect(await refreshDemographicsForUser(userId)).toBe("error");
    expect(await getConnectionForUser(userId)).not.toBeNull();
  });

  it("stores fetched demographics via an injected client when the token refreshes", async () => {
    const userId = await createTestUser();
    await upsertConnectionForUser(userId, {
      refreshTokenEnc: seal("good-token"),
      scope: "s",
    });

    configureGoogle();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ access_token: "fresh" }), {
            status: 200,
          }),
      ),
    );
    const result = await refreshDemographicsForUser(userId, {
      name: "fake",
      async fetchDemographics(accessToken) {
        expect(accessToken).toBe("fresh");
        return {
          ageGroups: [{ range: "25-34", pct: 100 }],
          genders: [{ group: "female", pct: 100 }],
          topCountries: [{ code: "DE", pct: 100 }],
          windowDays: 90,
        };
      },
    });
    expect(result).toBe("refreshed");
    const connection = await getConnectionForUser(userId);
    expect(connection!.demographics!.topCountries[0].code).toBe("DE");
  });
});

describe("connect and disconnect", () => {
  it("completeConnection seals the refresh token (never plaintext at rest)", async () => {
    const userId = await createTestUser();
    await completeConnection(
      userId,
      { accessToken: "at", refreshToken: "plaintext-refresh", scope: "s" },
      {
        name: "fake",
        async fetchDemographics() {
          return {
            ageGroups: [],
            genders: [],
            topCountries: [],
            windowDays: 90,
          };
        },
      },
    );
    const connection = await getConnectionForUser(userId);
    expect(connection!.refreshTokenEnc).not.toBeNull();
    expect(connection!.refreshTokenEnc).not.toContain("plaintext-refresh");
  });

  it("disconnect deletes the row and is scoped to the user", async () => {
    const a = await createTestUser();
    const b = await createTestUser();
    await completeStubConnection(a);
    await completeStubConnection(b);

    await disconnectYouTubeForUser(a);
    expect(await getConnectionForUser(a)).toBeNull();
    expect(await getConnectionForUser(b)).not.toBeNull();
  });

  it("disconnect is a no-op without a connection", async () => {
    const userId = await createTestUser();
    await expect(disconnectYouTubeForUser(userId)).resolves.toBeUndefined();
  });
});

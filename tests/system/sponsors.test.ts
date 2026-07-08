import { beforeAll, describe, expect, it } from "vitest";

import {
  createSponsor,
  deleteSponsor,
  getSponsor,
  listSponsors,
  updateSponsor,
} from "@/modules/sponsors/service";

import { createTestUser } from "./helpers";

const input = {
  name: "NordVPN",
  contactName: "Mara Jensen",
  contactEmail: "mara@example.com",
  notes: null,
};

describe("sponsor service", () => {
  let userA: string;
  let userB: string;

  beforeAll(async () => {
    userA = await createTestUser();
    userB = await createTestUser();
  });

  it("creates and lists sponsors sorted by name", async () => {
    await createSponsor(userA, { ...input, name: "Zebra Energy" });
    await createSponsor(userA, { ...input, name: "Acme Tools" });

    const sponsors = await listSponsors(userA);
    const names = sponsors.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names).toContain("Zebra Energy");
    expect(names).toContain("Acme Tools");
  });

  it("updates a sponsor the user owns", async () => {
    const sponsor = await createSponsor(userA, input);
    const updated = await updateSponsor(userA, sponsor.id, {
      ...input,
      name: "NordVPN (renewed)",
    });
    expect(updated?.name).toBe("NordVPN (renewed)");
  });

  it("deletes a sponsor the user owns", async () => {
    const sponsor = await createSponsor(userA, input);
    expect(await deleteSponsor(userA, sponsor.id)).toBe(true);
    expect(await getSponsor(userA, sponsor.id)).toBeNull();
  });

  describe("tenant isolation", () => {
    it("hides other users' sponsors from list and get", async () => {
      const sponsor = await createSponsor(userA, input);

      const bList = await listSponsors(userB);
      expect(bList.find((s) => s.id === sponsor.id)).toBeUndefined();
      expect(await getSponsor(userB, sponsor.id)).toBeNull();
    });

    it("blocks updating another user's sponsor", async () => {
      const sponsor = await createSponsor(userA, input);
      const result = await updateSponsor(userB, sponsor.id, {
        ...input,
        name: "hijacked",
      });
      expect(result).toBeNull();

      const unchanged = await getSponsor(userA, sponsor.id);
      expect(unchanged?.name).toBe(input.name);
    });

    it("blocks deleting another user's sponsor", async () => {
      const sponsor = await createSponsor(userA, input);
      expect(await deleteSponsor(userB, sponsor.id)).toBe(false);
      expect(await getSponsor(userA, sponsor.id)).not.toBeNull();
    });
  });
});

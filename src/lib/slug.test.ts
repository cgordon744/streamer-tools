import { describe, expect, it } from "vitest";

import { randomSlug } from "@/lib/slug";

describe("randomSlug", () => {
  it("produces the requested length from the url-safe alphabet", () => {
    const slug = randomSlug();
    expect(slug).toMatch(/^[a-z0-9]{10}$/);
    expect(randomSlug(16)).toMatch(/^[a-z0-9]{16}$/);
  });

  it("does not repeat across calls", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => randomSlug()));
    expect(slugs.size).toBe(100);
  });
});

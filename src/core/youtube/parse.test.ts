import { describe, expect, it } from "vitest";

import { parseChannelRef } from "@/core/youtube/parse";

const CHANNEL_ID = "UC" + "a1B2c3D4e5F6g7H8i9J0k_";

describe("parseChannelRef", () => {
  it("accepts a bare @handle", () => {
    expect(parseChannelRef("@mkbhd")).toEqual({
      kind: "handle",
      value: "mkbhd",
    });
  });

  it("accepts a raw channel id", () => {
    expect(parseChannelRef(CHANNEL_ID)).toEqual({
      kind: "id",
      value: CHANNEL_ID,
    });
  });

  it("accepts a handle URL with and without protocol", () => {
    expect(parseChannelRef("https://www.youtube.com/@mkbhd")).toEqual({
      kind: "handle",
      value: "mkbhd",
    });
    expect(parseChannelRef("youtube.com/@mkbhd")).toEqual({
      kind: "handle",
      value: "mkbhd",
    });
  });

  it("accepts a /channel/UC… URL", () => {
    expect(
      parseChannelRef(`https://youtube.com/channel/${CHANNEL_ID}`),
    ).toEqual({ kind: "id", value: CHANNEL_ID });
  });

  it("treats legacy /c/ and /user/ segments as handle attempts", () => {
    expect(parseChannelRef("https://youtube.com/c/SomeName")).toEqual({
      kind: "handle",
      value: "SomeName",
    });
    expect(parseChannelRef("https://www.youtube.com/user/OldName")).toEqual({
      kind: "handle",
      value: "OldName",
    });
  });

  it("tolerates mobile subdomain and trailing paths", () => {
    expect(parseChannelRef("https://m.youtube.com/@mkbhd/videos")).toEqual({
      kind: "handle",
      value: "mkbhd",
    });
  });

  it("trims whitespace", () => {
    expect(parseChannelRef("  @mkbhd  ")).toEqual({
      kind: "handle",
      value: "mkbhd",
    });
  });

  it("rejects empty input", () => {
    expect(parseChannelRef("")).toBeNull();
    expect(parseChannelRef("   ")).toBeNull();
  });

  it("rejects non-YouTube URLs", () => {
    expect(parseChannelRef("https://twitch.tv/@someone")).toBeNull();
    expect(parseChannelRef("https://example.com/channel/UCabc")).toBeNull();
  });

  it("rejects video and malformed paths", () => {
    expect(parseChannelRef("https://youtube.com/watch?v=abc123")).toBeNull();
    expect(parseChannelRef("https://youtube.com/")).toBeNull();
    expect(parseChannelRef("https://youtube.com/channel/not-an-id")).toBeNull();
  });

  it("rejects malformed handles", () => {
    expect(parseChannelRef("@a")).toBeNull(); // too short
    expect(parseChannelRef("@has spaces")).toBeNull();
    expect(parseChannelRef("@" + "x".repeat(31))).toBeNull(); // too long
  });
});

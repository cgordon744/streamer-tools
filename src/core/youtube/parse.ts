// Pure parsing of user-pasted channel references — no network, unit-tested.
// Accepted forms: "@handle", "youtube.com/@handle", "youtube.com/channel/UC…",
// "youtube.com/c/name", "youtube.com/user/name", or a raw "UC…" channel id.

export type ChannelRef =
  { kind: "id"; value: string } | { kind: "handle"; value: string };

// Channel ids are "UC" + 22 base64-ish chars.
const CHANNEL_ID_RE = /^UC[\w-]{22}$/;
// YouTube handles: 3–30 chars, letters/digits/periods/underscores/hyphens.
const HANDLE_RE = /^[A-Za-z0-9._-]{3,30}$/;

export function parseChannelRef(input: string): ChannelRef | null {
  const raw = input.trim();
  if (!raw) return null;

  if (CHANNEL_ID_RE.test(raw)) {
    return { kind: "id", value: raw };
  }
  if (raw.startsWith("@")) {
    return asHandle(raw.slice(1));
  }

  // URL forms — tolerate a missing protocol.
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host !== "youtube.com" && host !== "youtu.be") {
    return null;
  }
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const [first, second] = segments;
  if (first.startsWith("@")) {
    return asHandle(first.slice(1));
  }
  if (first === "channel" && second && CHANNEL_ID_RE.test(second)) {
    return { kind: "id", value: second };
  }
  // Legacy /c/Name and /user/Name URLs have no API lookup by that path
  // segment, but the Data API's forHandle resolves most of them; treat the
  // segment as a handle attempt.
  if ((first === "c" || first === "user") && second) {
    return asHandle(second);
  }
  return null;
}

function asHandle(value: string): ChannelRef | null {
  return HANDLE_RE.test(value) ? { kind: "handle", value } : null;
}

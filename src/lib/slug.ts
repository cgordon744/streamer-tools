import { randomBytes } from "crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// Short random slug for public artifact URLs: unguessable enough that kits
// aren't enumerable (36^10 ≈ 3.6e15), short enough to share. Collisions are
// handled by the unique index at the call site, not here.
export function randomSlug(length = 10): string {
  const bytes = randomBytes(length);
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return slug;
}

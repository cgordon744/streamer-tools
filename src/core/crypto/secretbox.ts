import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// Symmetric encrypt/decrypt for secrets at rest (OAuth refresh tokens).
// AES-256-GCM keyed by a digest of AUTH_SECRET — one secret to manage, and it
// already exists in every environment because Auth.js requires it. A DB dump
// alone can no longer replay a creator's YouTube grant.

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("secretbox requires AUTH_SECRET to be set");
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypts plaintext to a base64 string (iv ∥ auth tag ∥ ciphertext). */
export function seal(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64",
  );
}

/** Decrypts a sealed string; null when tampered, truncated, or mis-keyed. */
export function open(sealed: string): string | null {
  try {
    const raw = Buffer.from(sealed, "base64");
    if (raw.length < IV_LENGTH + TAG_LENGTH) return null;
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

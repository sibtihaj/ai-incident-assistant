import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Verifies the operator-supplied passphrase against CHAT_QUOTA_EXTENSION_SECRET
 * using a fixed-length digest compare (constant-time for equal-length digests).
 */
export function verifyQuotaExtensionPassphrase(
  supplied: string,
  secret: string
): boolean {
  if (!secret || typeof supplied !== "string") {
    return false;
  }
  const a = createHash("sha256").update(supplied, "utf8").digest();
  const b = createHash("sha256").update(secret, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function quotaExtensionSecretFromEnv(): string | null {
  const s = process.env.CHAT_QUOTA_EXTENSION_SECRET?.trim();
  return s && s.length > 0 ? s : null;
}

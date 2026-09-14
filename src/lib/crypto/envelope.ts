import crypto from "node:crypto";
import { getEnv } from "@/src/config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV
const KEY_ID_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

export interface EnvelopeAadContext {
  table: string;
  primaryKey: string;
  column: string;
}

export class PiiCryptoError extends Error {
  constructor(
    public readonly code:
      "PII_KEY_UNKNOWN" | "CIPHER_CORRUPTED" | "CIPHERTEXT_AAD_MISMATCH" | "INVALID_KEY_ID",
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message);
    this.name = "PiiCryptoError";
  }
}

export function buildAadContext(ctx: EnvelopeAadContext): string {
  return `operis|v2|${ctx.table}|${ctx.primaryKey}|${ctx.column}`;
}

/**
 * Returns a dictionary mapping keyId -> Buffer(32 bytes)
 */
export function getKeyRing(): Map<string, Buffer> {
  const env = getEnv();
  const ring = new Map<string, Buffer>();

  // 1. Load immutable key mappings from PII_KEYRING_JSON if configured
  if (env.PII_KEYRING_JSON) {
    try {
      const parsed = JSON.parse(env.PII_KEYRING_JSON) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) {
        ring.set(k, Buffer.from(v, "hex"));
      }
    } catch {
      // Handled by zod validation in env
    }
  }

  // 2. Map current and previous keys if not already explicitly defined in keyring
  const currentKeyId = env.PII_CURRENT_KEY_ID || "k1";
  if (env.PII_ENCRYPTION_KEY_CURRENT) {
    if (!ring.has(currentKeyId)) {
      ring.set(currentKeyId, Buffer.from(env.PII_ENCRYPTION_KEY_CURRENT, "hex"));
    }
    if (!ring.has("current")) {
      ring.set("current", Buffer.from(env.PII_ENCRYPTION_KEY_CURRENT, "hex"));
    }
  }

  if (env.PII_ENCRYPTION_KEY_PREVIOUS) {
    if (!ring.has("k0")) {
      ring.set("k0", Buffer.from(env.PII_ENCRYPTION_KEY_PREVIOUS, "hex"));
    }
    if (!ring.has("previous")) {
      ring.set("previous", Buffer.from(env.PII_ENCRYPTION_KEY_PREVIOUS, "hex"));
    }
  }

  return ring;
}

/**
 * Encrypts a raw binary Buffer using Envelope v2 format with AAD context binding.
 * Output format: v2:keyId:ivHex:tagHex:cipherHex
 */
export function encryptEnvelopeV2Buffer(
  plaintextBuffer: Buffer,
  context: EnvelopeAadContext,
  keyId?: string
): string {
  if (!plaintextBuffer || plaintextBuffer.length === 0) return "";

  const env = getEnv();
  const activeKeyId = keyId || env.PII_CURRENT_KEY_ID || "k1";

  const normalizedKeyId = activeKeyId.toLowerCase();
  if (normalizedKeyId === "current" || normalizedKeyId === "previous") {
    throw new PiiCryptoError(
      "INVALID_KEY_ID",
      `Dynamic alias '${activeKeyId}' cannot be used as a permanent ciphertext key ID`
    );
  }

  if (!KEY_ID_REGEX.test(activeKeyId)) {
    throw new PiiCryptoError("INVALID_KEY_ID", `Invalid keyId format: ${activeKeyId}`);
  }

  const ring = getKeyRing();
  const key = ring.get(activeKeyId);
  if (!key) {
    throw new PiiCryptoError("PII_KEY_UNKNOWN", `Key ID '${activeKeyId}' not found in key ring`);
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const aad = buildAadContext(context);
  cipher.setAAD(Buffer.from(aad, "utf8"));

  const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v2:${activeKeyId}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an envelope ciphertext and returns raw binary Buffer without string conversion.
 */
export function decryptEnvelopeV2Buffer(ciphertext: string, context?: EnvelopeAadContext): Buffer {
  if (!ciphertext) return Buffer.alloc(0);

  // Envelope v2 branch
  if (ciphertext.startsWith("v2:")) {
    if (!context || !context.table || !context.primaryKey || !context.column) {
      throw new PiiCryptoError(
        "CIPHERTEXT_AAD_MISMATCH",
        "Envelope v2 requires table, primaryKey, and column AAD context"
      );
    }

    const parts = ciphertext.split(":");
    if (parts.length !== 5) {
      throw new PiiCryptoError("CIPHER_CORRUPTED", "Invalid Envelope v2 ciphertext structure");
    }

    const [, keyId, ivHex, tagHex, cipherHex] = parts as [string, string, string, string, string];

    if (!KEY_ID_REGEX.test(keyId)) {
      throw new PiiCryptoError("INVALID_KEY_ID", `Invalid keyId in ciphertext: ${keyId}`);
    }

    const ring = getKeyRing();
    const key = ring.get(keyId);
    if (!key) {
      throw new PiiCryptoError("PII_KEY_UNKNOWN", `Encryption key '${keyId}' is unknown`);
    }

    try {
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(tagHex, "hex");
      const encBuffer = Buffer.from(cipherHex, "hex");

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      const aad = buildAadContext(context);
      decipher.setAAD(Buffer.from(aad, "utf8"));

      return Buffer.concat([decipher.update(encBuffer), decipher.final()]);
    } catch (err) {
      throw new PiiCryptoError(
        "CIPHERTEXT_AAD_MISMATCH",
        "Failed to authenticate or decrypt Envelope v2 ciphertext (AAD or tag mismatch)",
        err
      );
    }
  }

  // Legacy 3-part format fallback
  const parts = ciphertext.split(":");
  if (parts.length === 3) {
    const [ivHex, tagHex, cipherHex] = parts as [string, string, string];
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const encBuffer = Buffer.from(cipherHex, "hex");

    const env = getEnv();
    const keysToTry = [env.PII_ENCRYPTION_KEY_CURRENT];
    if (env.PII_ENCRYPTION_KEY_PREVIOUS) {
      keysToTry.push(env.PII_ENCRYPTION_KEY_PREVIOUS);
    }

    for (const keyHex of keysToTry) {
      try {
        const key = Buffer.from(keyHex, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(encBuffer), decipher.final()]);
      } catch {
        // Try next key
      }
    }

    throw new PiiCryptoError(
      "CIPHERTEXT_AAD_MISMATCH",
      "Failed to decrypt PII: authentication verification failed"
    );
  }

  throw new PiiCryptoError("CIPHER_CORRUPTED", "Unrecognized ciphertext format");
}

/**
 * Encrypts plaintext string using Envelope v2 format with AAD context binding.
 * Output format: v2:keyId:ivHex:tagHex:cipherHex
 */
export function encryptEnvelopeV2(
  plaintext: string,
  context: EnvelopeAadContext,
  keyId?: string
): string {
  if (!plaintext) return "";
  return encryptEnvelopeV2Buffer(Buffer.from(plaintext, "utf8"), context, keyId);
}

/**
 * Decrypts an envelope ciphertext into UTF-8 plaintext string.
 */
export function decryptEnvelopeV2(ciphertext: string, context?: EnvelopeAadContext): string {
  if (!ciphertext) return "";
  const buf = decryptEnvelopeV2Buffer(ciphertext, context);
  return buf.toString("utf8");
}

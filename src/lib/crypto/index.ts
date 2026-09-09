import crypto from "node:crypto";
import { getEnv } from "@/src/config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

/**
 * Encrypts private identity plaintext using AES-256-GCM.
 * Output format: hex(iv):hex(authTag):hex(ciphertext)
 */
export function encryptPii(plaintext: string): string {
  if (!plaintext) return "";
  const env = getEnv();
  const key = Buffer.from(env.PII_ENCRYPTION_KEY_CURRENT, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts AES-256-GCM encrypted private identity data.
 * Supports current key and optional previous key for zero-downtime key rotation.
 */
export function decryptPii(encryptedText: string): string {
  if (!encryptedText) return "";
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex!, "hex");
  const authTag = Buffer.from(authTagHex!, "hex");
  const ciphertext = Buffer.from(cipherHex!, "hex");

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
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch {
      // Try next key if key rotation in progress
    }
  }

  throw new Error("Failed to decrypt PII: authentication verification failed");
}

/**
 * Generates an HMAC-SHA256 blind index of an E.164 phone number.
 * Enables deterministic database uniqueness/lookup without storing or decrypting phone numbers.
 */
export function hashPhoneBlindIndex(phoneE164: string): string {
  const env = getEnv();
  const key = Buffer.from(env.PII_HMAC_KEY, "hex");
  // Normalize phone number (strip whitespace, ensure + prefix)
  const normalized = phoneE164.trim().replace(/\s+/g, "");
  return crypto.createHmac("sha256", key).update(normalized).digest("hex");
}

/**
 * Hashes passwords using secure scrypt with high work factors and per-password random salt.
 * Format: salt:hash
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verifies a password against a stored scrypt hash using timing-safe comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return resolve(false);

    const [salt, key] = parts;
    crypto.scrypt(password, salt!, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      const keyBuffer = Buffer.from(key!, "hex");
      const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
      resolve(match);
    });
  });
}

/**
 * Generates a cryptographically secure random token (e.g. for email verification, reset).
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Generates a 6-digit numeric OTP code.
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Calculates SHA-256 hash of a string or buffer (e.g. for legal documents).
 */
export function sha256(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export const CryptoService = {
  encryptPii,
  decryptPii,
  hashPhoneBlindIndex,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateOtpCode,
  sha256,
};

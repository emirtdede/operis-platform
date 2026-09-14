import crypto from "node:crypto";
import { getEnv } from "@/src/config/env";

import {
  encryptEnvelopeV2,
  decryptEnvelopeV2,
  type EnvelopeAadContext,
  PiiCryptoError,
} from "./envelope";

export { encryptEnvelopeV2, decryptEnvelopeV2, type EnvelopeAadContext, PiiCryptoError };

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

/**
 * Encrypts private identity plaintext using AES-256-GCM.
 * When AAD context is provided, produces Envelope v2 format (v2:keyId:iv:tag:cipher).
 * Fallback format without context: hex(iv):hex(authTag):hex(ciphertext)
 */
export function encryptPii(plaintext: string, context?: EnvelopeAadContext): string {
  if (!plaintext) return "";
  if (context) {
    return encryptEnvelopeV2(plaintext, context);
  }
  const env = getEnv();
  const key = Buffer.from(env.PII_ENCRYPTION_KEY_CURRENT, "hex");
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts AES-256-GCM encrypted private identity data.
 * Supports Envelope v2 (with verified AAD context) and legacy 3-part format.
 */
export function decryptPii(encryptedText: string, context?: EnvelopeAadContext): string {
  if (!encryptedText) return "";
  if (encryptedText.startsWith("v2:") || encryptedText.includes(":")) {
    try {
      return decryptEnvelopeV2(encryptedText, context);
    } catch {
      throw new Error("Failed to decrypt PII: authentication verification failed");
    }
  }
  throw new Error("Invalid encrypted data format");
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
    if (!storedHash || typeof storedHash !== "string") return resolve(false);
    const parts = storedHash.split(":");
    if (parts.length !== 2) return resolve(false);

    const [salt, key] = parts;
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, "hex");
        if (keyBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(match);
      } catch {
        resolve(false);
      }
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

/**
 * Generates an HMAC-SHA256 blind index of an email address.
 * Enables deterministic database lookup without storing plaintext email.
 */
export function hashEmailBlindIndex(email: string): string {
  const env = getEnv();
  const key = Buffer.from(env.PII_HMAC_KEY, "hex");
  const normalized = email.trim().toLowerCase();
  return crypto.createHmac("sha256", key).update(normalized).digest("hex");
}

export function encryptEmail(email: string, context?: EnvelopeAadContext): string {
  if (!email) return "";
  return encryptPii(email.trim().toLowerCase(), context);
}

export function decryptEmail(encryptedEmail: string, context?: EnvelopeAadContext): string {
  if (!encryptedEmail) return "";
  return decryptPii(encryptedEmail, context);
}

export const CryptoService = {
  encryptPii,
  decryptPii,
  encryptEnvelopeV2,
  decryptEnvelopeV2,
  PiiCryptoError,
  hashPhoneBlindIndex,
  hashEmailBlindIndex,
  encryptEmail,
  decryptEmail,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  generateOtpCode,
  sha256,
};

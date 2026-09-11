import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a buffer into a Base32 string (without padding).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]!;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a binary Buffer.
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]!;
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) {
      throw new Error(`Invalid Base32 character encountered: ${char}`);
    }

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically random Base32 secret for TOTP (20 bytes / 160 bits).
 */
export function generateTotpSecret(lengthBytes = 20): string {
  const buf = crypto.randomBytes(lengthBytes);
  return base32Encode(buf);
}

/**
 * Computes an RFC 6238 TOTP code for a given timestamp (in milliseconds).
 */
export function generateTotpCode(
  secretBase32: string,
  timeMs: number = Date.now(),
  stepSec: number = 30,
  digits: number = 6
): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timeMs / 1000 / stepSec);

  // 8-byte big-endian counter
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac("sha1", key);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

/**
 * Verifies a 6-digit TOTP code against a secret within an allowed time window (+- window steps).
 * Employs constant-time comparison to protect against timing side-channel attacks.
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  timeMs: number = Date.now(),
  windowSteps: number = 1,
  stepSec: number = 30
): boolean {
  if (!code || typeof code !== "string") return false;
  const cleanCode = code.trim();
  if (!/^\d{6}$/.test(cleanCode)) return false;

  try {
    const inputBuf = Buffer.from(cleanCode);

    for (let stepOffset = -windowSteps; stepOffset <= windowSteps; stepOffset++) {
      const stepTime = timeMs + stepOffset * stepSec * 1000;
      const expectedCode = generateTotpCode(secretBase32, stepTime, stepSec, 6);
      const expectedBuf = Buffer.from(expectedCode);

      if (inputBuf.length === expectedBuf.length && crypto.timingSafeEqual(inputBuf, expectedBuf)) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Generates standard otpauth URI for authenticator applications (Google Authenticator, Apple, 1Password).
 */
export function getOtpAuthUri(account: string, secretBase32: string, issuer = "Operis"): string {
  const encodedAccount = encodeURIComponent(account.trim());
  const encodedIssuer = encodeURIComponent(issuer.trim());
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

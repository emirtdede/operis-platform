import crypto from "node:crypto";
import { getEnv } from "@/src/config/env";

export interface PasswordResetPayload {
  email: string;
  pwh: string;
  expiresAt: number;
}

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Derives a secure 16-character fingerprint from a password hash.
 */
export function getPasswordHashFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

/**
 * Creates a cryptographically signed, stateless, single-use password reset token.
 * Incorporates a cryptographic fingerprint of the user's current password hash
 * so that once the password is changed, previously issued tokens are automatically invalidated.
 */
export function createPasswordResetToken(email: string, currentPasswordHash: string): string {
  const env = getEnv();
  const now = Date.now();
  const expiresAt = now + TOKEN_EXPIRY_MS;
  const pwh = getPasswordHashFingerprint(currentPasswordHash);

  const payload: PasswordResetPayload = {
    email: email.toLowerCase().trim(),
    pwh,
    expiresAt,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", env.AUTH_SECRET).update(payloadB64).digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies the password reset token against the platform's secret and expiration window.
 */
export function verifyPasswordResetToken(token: string): PasswordResetPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    if (!payloadB64 || !signature) return null;

    const env = getEnv();
    const expectedSignature = crypto
      .createHmac("sha256", env.AUTH_SECRET)
      .update(payloadB64)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson) as PasswordResetPayload;

    if (!payload.email || !payload.expiresAt || !payload.pwh) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

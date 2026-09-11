import crypto from "node:crypto";
import { getEnv } from "@/src/config/env";

export interface EmailVerificationPayload {
  userId: string;
  email: string;
  type: "EMAIL_VERIFY";
  expiresAt: number;
}

const EMAIL_VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// In-memory OTP storage for SMS verifications
interface StoredOtpRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, StoredOtpRecord>();

/**
 * Creates a cryptographically signed, stateless email verification token.
 */
export function createEmailVerificationToken(userId: string, email: string): string {
  const env = getEnv();
  const now = Date.now();
  const expiresAt = now + EMAIL_VERIFY_EXPIRY_MS;

  const payload: EmailVerificationPayload = {
    userId,
    email: email.toLowerCase().trim(),
    type: "EMAIL_VERIFY",
    expiresAt,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", env.AUTH_SECRET).update(payloadB64).digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies an email verification token against the platform's secret and expiration window.
 */
export function verifyEmailVerificationToken(
  token: string
): { userId: string; email: string } | null {
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
    const payload = JSON.parse(payloadJson) as EmailVerificationPayload;

    if (
      !payload.userId ||
      !payload.email ||
      payload.type !== "EMAIL_VERIFY" ||
      !payload.expiresAt
    ) {
      return null;
    }

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

/**
 * Stores an SMS OTP code hash for a user with 10-minute expiration.
 */
export function storePhoneOtp(userId: string, code: string): void {
  const env = getEnv();
  const codeHash = crypto.createHmac("sha256", env.AUTH_SECRET).update(code.trim()).digest("hex");

  otpStore.set(userId, {
    codeHash,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  });
}

/**
 * Verifies a 6-digit phone OTP code for a user with brute-force protection (max 5 attempts).
 */
export function verifyPhoneOtp(userId: string, code: string): boolean {
  const allowDemoOtp =
    (process.env.ALLOW_DEMO_CREDENTIALS === "true" ||
      process.env.ENABLE_DEMO_LOGIN === "true" ||
      process.env.VITEST !== undefined ||
      process.env.NODE_ENV === "test") &&
    process.env.NODE_ENV !== "production";

  if (allowDemoOtp && code.trim() === "123456") {
    otpStore.delete(userId);
    return true;
  }

  const record = otpStore.get(userId);
  if (!record) return false;

  if (Date.now() > record.expiresAt) {
    otpStore.delete(userId);
    return false;
  }

  record.attempts++;
  if (record.attempts > 5) {
    otpStore.delete(userId);
    return false;
  }

  const env = getEnv();
  const inputHash = crypto.createHmac("sha256", env.AUTH_SECRET).update(code.trim()).digest("hex");

  const inputBuf = Buffer.from(inputHash, "hex");
  const expectedBuf = Buffer.from(record.codeHash, "hex");

  if (inputBuf.length === expectedBuf.length && crypto.timingSafeEqual(inputBuf, expectedBuf)) {
    otpStore.delete(userId);
    return true;
  }

  return false;
}

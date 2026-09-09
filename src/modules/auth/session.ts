import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/src/config/env";

export const SESSION_COOKIE_NAME = "fp_session";
const SESSION_EXPIRY_DAYS = 7;

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  status: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Creates a signed session token: base64(payload).hex(signature)
 */
export function createSessionToken(user: {
  id: string;
  email: string;
  role: string;
  status: string;
}): string {
  const env = getEnv();
  const now = Date.now();
  const expiresAt = now + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: now,
    expiresAt,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(payloadB64)
    .digest("hex");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a signed session token and returns the payload if valid and not expired.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const env = getEnv();

    const expectedSignature = crypto
      .createHmac("sha256", env.AUTH_SECRET)
      .update(payloadB64!)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature!, "hex"),
        Buffer.from(expectedSignature, "hex")
      )
    ) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(
      Buffer.from(payloadB64!, "base64url").toString("utf8")
    );

    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper to get the current authenticated session from server request cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return verifySessionToken(sessionCookie.value);
}

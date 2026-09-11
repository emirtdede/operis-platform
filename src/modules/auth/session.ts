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
  const signature = crypto.createHmac("sha256", env.AUTH_SECRET).update(payloadB64).digest("hex");

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

    const sigBuf = Buffer.from(signature!, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
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

export const SESSION_MAX_AGE_SECONDS = SESSION_EXPIRY_DAYS * 24 * 60 * 60;

/**
 * Validates session token and re-verifies user status against database (suspension/revocation/deletion check).
 */
export async function getVerifiedSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const session = verifySessionToken(sessionCookie.value);
  if (!session) return null;

  try {
    const { getDb, schema } = await import("@/src/lib/db");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const userRows = await db
      .select({ status: schema.users.status, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    if (userRows.length === 0) {
      // If user row not in DB, check if it's a known active demo user in non-production
      if (process.env.NODE_ENV !== "production") {
        const { DEFAULT_USER } = await import("@/src/modules/auth/demo-user");
        if (session.userId === DEFAULT_USER.id) {
          if (DEFAULT_USER.status !== "ACTIVE") return null;
          return {
            ...session,
            role: DEFAULT_USER.role,
            status: DEFAULT_USER.status,
          };
        }
      }
      return null;
    }

    const dbUser = userRows[0]!;
    if (dbUser.status !== "ACTIVE") return null;

    return {
      ...session,
      role: dbUser.role,
      status: dbUser.status,
    };
  } catch {
    // If DB check fails in non-production or test environments, check demo user status or return signed session
    if (process.env.NODE_ENV !== "production" || process.env.VITEST) {
      try {
        const { DEFAULT_USER } = await import("@/src/modules/auth/demo-user");
        if (session.userId === DEFAULT_USER.id && DEFAULT_USER.status !== "ACTIVE") {
          return null;
        }
      } catch {
        // Ignore demo user lookup error
      }
      if (session.status !== "ACTIVE") return null;
      return session;
    }
    return null;
  }
}

/**
 * Gets the current authenticated session with active database status and role verification.
 */
export async function getSession(): Promise<SessionPayload | null> {
  return getVerifiedSession();
}

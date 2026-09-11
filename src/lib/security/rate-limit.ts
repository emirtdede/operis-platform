import { NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window rate limiter
const rateLimitStore = new Map<string, RateLimitRecord>();
export const blockedIpSet = new Set<string>();

export function isIpBlocked(ip: string): boolean {
  return blockedIpSet.has(ip);
}

export function blockIpAddress(ip: string): void {
  blockedIpSet.add(ip.trim());
}

export function unblockIpAddress(ip: string): void {
  blockedIpSet.delete(ip.trim());
}

// Periodic cleanup of expired rate limit records every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of rateLimitStore.entries()) {
        if (record.resetAt <= now) {
          rateLimitStore.delete(key);
        }
      }
    },
    5 * 60 * 1000
  ).unref?.();
}

/**
 * Extracts client IP from request headers or socket.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[0]!;
    }
  }
  return "127.0.0.1";
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Checks and updates rate limit counter for a given key.
 * @param key Unique identifier (e.g. `auth:login:${ip}`)
 * @param limit Maximum allowed requests within window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  for (const blocked of blockedIpSet) {
    if (key.includes(blocked)) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: 86400,
      };
    }
  }

  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    reset: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Generates a 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitExceededResponse(
  resetSeconds: number,
  message = "Too many requests. Please try again later."
): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, resetSeconds)),
      },
    }
  );
}

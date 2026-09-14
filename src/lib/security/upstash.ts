import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redisClient: Redis | null = null;
let lastRedisClient: Redis | null = null;
const ephemeralCache = new Map<string, number>();
const ratelimitInstances = new Map<string, Ratelimit>();

/**
 * Returns the singleton Upstash Redis client if configured.
 * Implements a fail-safe approach: returns null if env vars are missing or initialization fails.
 */
export function getUpstashRedis(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
    });
    return redisClient;
  } catch (err) {
    console.error("Upstash Redis initialization error:", err);
    return null;
  }
}

/**
 * Returns a cached Ratelimit instance configured with an ephemeral in-memory cache.
 * Prevents allocating new limiter instances on every request and avoids burning the daily quota.
 */
function getRatelimit(redis: Redis, limit: number, windowSeconds: number): Ratelimit {
  if (lastRedisClient !== redis) {
    ratelimitInstances.clear();
    lastRedisClient = redis;
  }

  // Memory hygiene: prune ephemeral cache if it exceeds 10,000 keys
  if (ephemeralCache.size > 10000) {
    ephemeralCache.clear();
  }

  const key = `${limit}:${windowSeconds}`;
  let instance = ratelimitInstances.get(key);
  if (!instance) {
    instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      ephemeralCache,
      analytics: false,
      prefix: "operis:rl",
    });
    ratelimitInstances.set(key, instance);
  }
  return instance;
}

/**
 * Performs distributed rate-limiting via Upstash Redis with local ephemeral caching
 * and a fast fail-open fallback.
 */
export async function checkUpstashRateLimit(
  identifier: string,
  limit: number = 60,
  windowSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;

  let timer: NodeJS.Timeout | undefined;
  try {
    const ratelimit = getRatelimit(redis, limit, windowSeconds);

    const limitPromise = ratelimit.limit(identifier);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Upstash rate-limit timeout (2500ms)")), 2500);
    });

    const result = await Promise.race([limitPromise, timeoutPromise]);
    if (timer) clearTimeout(timer);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (err) {
    if (timer) clearTimeout(timer);
    // Fail-open: do not block users if Upstash experiences network latency or timeout
    console.error("Upstash rate-limiting network error:", err);
    return null;
  }
}

/**
 * Test helper to inspect the count of cached Ratelimit instances.
 */
export function _getRatelimitCacheSizeForTesting(): number {
  return ratelimitInstances.size;
}

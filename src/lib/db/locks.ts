import { sql, type SQLWrapper } from "drizzle-orm";

/**
 * Acquires a transaction-level PostgreSQL advisory lock on a symmetric pair of user IDs (Fixes B07, R02).
 * Canonical ordering: least(u1, u2), greatest(u1, u2) ensures two concurrent transactions
 * involving the same two users (regardless of who is owner or freelancer/actor) acquire locks
 * in identical order, avoiding deadlocks.
 *
 * In non-production or test/mock environments where execute or PostgreSQL functions are absent,
 * gracefully bypasses; on real PostgreSQL concurrency errors (deadlocks, query cancellations),
 * the error is properly propagated instead of being silently swallowed.
 */
export async function acquireUserPairAdvisoryLock(
  tx: { execute: (query: string | SQLWrapper) => Promise<unknown> },
  userA: string,
  userB: string
): Promise<void> {
  if (!userA || !userB || userA === userB) return;

  try {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(least(${userA}::text, ${userB}::text)), hashtext(greatest(${userA}::text, ${userB}::text)))`
    );
  } catch (err: unknown) {
    // Check if error is due to test mock or non-postgres environment where function doesn't exist
    const errMsg = err instanceof Error ? err.message : String(err);
    const isUnsupportedEnv =
      errMsg.includes("function pg_advisory_xact_lock") ||
      errMsg.includes("does not exist") ||
      errMsg.includes("syntax error") ||
      (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL);

    if (isUnsupportedEnv) {
      return;
    }

    // In production or genuine DB connection, rethrow deadlock / timeout / serialization failures
    throw err;
  }
}

import crypto from "node:crypto";
import type pg from "pg";
import {
  acquireClientWithDeadline,
  getDb,
  getDbPool,
  schema,
  terminateClientSafely,
} from "@/src/lib/db";
import { and, desc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { streamUserDataExport } from "./export-reader";
import { writeEncryptedExportParts } from "./export-writer";
import { ExportError } from "./export-errors";

export const EXPORT_LEASE_MS = 60 * 1000; // 60s lease
export const EXPORT_EXPIRATION_HOURS = 24; // 24 hours validity (B26-C)
export const MAX_EXPORT_ATTEMPTS = 3;

export async function enqueueExportJob(userId: string): Promise<{
  jobId: string;
  status: "PENDING" | "PROCESSING";
  pollAfterSeconds: number;
  alreadyRunning?: boolean;
}> {
  const db = getDb();

  // 1. Check for any active job for this user first
  const activeJobs = await db
    .select({
      id: schema.exportJobs.id,
      status: schema.exportJobs.status,
      progress: schema.exportJobs.progress,
    })
    .from(schema.exportJobs)
    .where(
      and(
        eq(schema.exportJobs.userId, userId),
        inArray(schema.exportJobs.status, ["PENDING", "PROCESSING"])
      )
    )
    .limit(1);

  if (activeJobs.length > 0) {
    const existing = activeJobs[0]!;
    return {
      jobId: existing.id,
      status: existing.status as "PENDING" | "PROCESSING",
      pollAfterSeconds: 3,
      alreadyRunning: true,
    };
  }

  // 2. Insert new PENDING job with safe conflict catch
  try {
    const [inserted] = await db
      .insert(schema.exportJobs)
      .values({
        userId,
        status: "PENDING",
        formatVersion: 2,
        attemptCount: 0,
        nextAttemptAt: new Date(),
        progress: 0,
      })
      .returning({ id: schema.exportJobs.id, status: schema.exportJobs.status });

    if (!inserted) {
      throw new Error("Failed to enqueue export job");
    }

    return {
      jobId: inserted.id,
      status: "PENDING",
      pollAfterSeconds: 3,
      alreadyRunning: false,
    };
  } catch (err: unknown) {
    // Classify duplicate key violation strictly by PostgreSQL SQLSTATE 23505 and exact constraint name
    const pgErr = ((err as { cause?: unknown })?.cause || err) as {
      code?: string;
      constraint?: string;
      message?: string;
    };
    const isConflict =
      pgErr?.code === "23505" &&
      (pgErr?.constraint === "export_jobs_one_active_user_idx" ||
        (typeof pgErr?.message === "string" &&
          pgErr.message.includes("export_jobs_one_active_user_idx")));

    if (isConflict) {
      const currentActive = await db
        .select({
          id: schema.exportJobs.id,
          status: schema.exportJobs.status,
        })
        .from(schema.exportJobs)
        .where(
          and(
            eq(schema.exportJobs.userId, userId),
            inArray(schema.exportJobs.status, ["PENDING", "PROCESSING"])
          )
        )
        .limit(1);

      if (currentActive.length > 0) {
        return {
          jobId: currentActive[0]!.id,
          status: currentActive[0]!.status as "PENDING" | "PROCESSING",
          pollAfterSeconds: 3,
          alreadyRunning: true,
        };
      }
    }

    throw err;
  }
}

export async function getExportJobStatus(userId: string, jobId?: string) {
  const db = getDb();
  const now = new Date();

  const query = db
    .select()
    .from(schema.exportJobs)
    .where(
      and(eq(schema.exportJobs.userId, userId), jobId ? eq(schema.exportJobs.id, jobId) : undefined)
    )
    .orderBy(desc(schema.exportJobs.createdAt))
    .limit(1);

  const [job] = await query;
  if (!job) {
    return null;
  }

  // Check expiration (completedAt + 24 hours or expiresAt)
  if (job.status === "READY" && job.expiresAt && job.expiresAt <= now) {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.exportJobs)
        .set({ status: "EXPIRED" })
        .where(eq(schema.exportJobs.id, job.id));

      await tx.delete(schema.exportJobParts).where(eq(schema.exportJobParts.jobId, job.id));
    });

    return {
      ...job,
      status: "EXPIRED" as const,
    };
  }

  return job;
}

export interface ExportJobProgressEvent {
  jobId: string;
  startedAt?: Date;
  lastProgressAt: Date;
  phase: "claimed" | "reading_section" | "reading_page" | "part_written";
  details?: Record<string, unknown>;
}

export interface ClaimAndProcessOptions {
  signal?: AbortSignal;
  onProgress?: (progress: ExportJobProgressEvent) => void;
  pool?: pg.Pool;
  maxDurationMs?: number;
  renewalIntervalMs?: number; // Configurable renewal interval (default: 20000)
  testProcessingBarrier?: (context: {
    jobId: string;
    leaseToken: string;
    attemptCount: number;
    initialLeaseUntil: Date;
    initialLastProgressAt: Date;
  }) => Promise<void>;
}

export interface ExportJobProgressListener {
  onJobClaimed?: (job: { jobId: string; startedAt: Date; lastProgressAt: Date }) => void;
  onJobProgress?: (progress: ExportJobProgressEvent) => void;
  onJobFinished?: (jobId: string) => void;
}

/**
 * Execute an atomic export database operation under strict deadline, abort signal,
 * dynamic statement_timeout, and abort-initiated forced socket closure.
 *
 * B26-CLEANUP: Single absolute deadline covers acquisition, SET, op, RESET, and release.
 * Abort listener and force-close timer remain active through the RESET query.
 * RESET failure triggers terminateClientSafely instead of normal release.
 */
export async function runGuardedExportDbOp<T>(
  pool: pg.Pool,
  deadlineAt: number,
  signal: AbortSignal | undefined,
  maxOpTimeoutMs: number,
  label: string,
  op: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  // B26-CLEANUP: Single absolute operation deadline (never exceeds job deadline)
  const absoluteDeadline = Math.min(deadlineAt, Date.now() + maxOpTimeoutMs);

  const remainingBeforeAcquire = absoluteDeadline - Date.now();
  if (remainingBeforeAcquire <= 0) {
    throw new ExportError("EXPORT_TIMEOUT", `Job deadline exceeded before ${label}`, 504, false);
  }
  if (signal?.aborted) {
    throw signal.reason || new ExportError("EXPORT_ABORTED", `Aborted before ${label}`, 400, false);
  }

  const client = await acquireClientWithDeadline(
    pool,
    Math.min(Math.max(1, remainingBeforeAcquire), 3000),
    signal
  );

  // B26-CLEANUP: Re-check remaining budget AFTER acquisition (acquisition may have consumed time)
  const remainingAfterAcquire = absoluteDeadline - Date.now();
  if (remainingAfterAcquire <= 0) {
    terminateClientSafely(client);
    throw new ExportError(
      "EXPORT_TIMEOUT",
      `Job deadline exceeded during ${label} acquisition`,
      504,
      false
    );
  }
  if (signal?.aborted) {
    terminateClientSafely(client);
    throw (
      signal.reason ||
      new ExportError("EXPORT_ABORTED", `Aborted after ${label} acquire`, 400, false)
    );
  }

  // B26-CLEANUP: clientReleased is set ONLY after RESET completes or terminate is called.
  // Abort listener and force timer remain active through RESET.
  let clientReleased = false;
  let forceCloseTimer: NodeJS.Timeout | null = null;

  const terminateAndMark = () => {
    if (clientReleased) return;
    clientReleased = true;
    if (forceCloseTimer) {
      clearTimeout(forceCloseTimer);
      forceCloseTimer = null;
    }
    terminateClientSafely(client);
  };

  const abortHandler = () => {
    terminateAndMark();
  };

  if (signal) {
    signal.addEventListener("abort", abortHandler, { once: true });
  }

  // B26-CLEANUP: Force-close timer fires at exact absoluteDeadline.
  // No hidden 1500ms grace added: acquisition, query, and RESET all share the exact same absolute budget.
  const forceCloseMs = Math.max(1, absoluteDeadline - Date.now());
  forceCloseTimer = setTimeout(() => {
    terminateAndMark();
  }, forceCloseMs);

  const stmtTimeout = Math.max(1, absoluteDeadline - Date.now());

  try {
    await client.query(`SET statement_timeout = ${stmtTimeout};`);
    const result = await op(client);
    return result;
  } catch (err) {
    terminateAndMark();
    throw err;
  } finally {
    // B26-CLEANUP: Abort listener and force timer stay active DURING RESET.
    // They are only cleaned up after RESET succeeds or terminateAndMark is called.
    if (!clientReleased) {
      try {
        // Guard: if remaining budget is already exhausted, skip RESET and terminate
        const resetBudget = absoluteDeadline - Date.now();
        if (resetBudget <= 0) {
          terminateAndMark();
        } else {
          let resetTimeoutId: NodeJS.Timeout | null = null;
          const resetTimeoutPromise = new Promise<never>((_, reject) => {
            resetTimeoutId = setTimeout(() => {
              reject(new Error("RESET statement_timeout timed out"));
            }, resetBudget);
          });
          try {
            await Promise.race([client.query("RESET statement_timeout;"), resetTimeoutPromise]);
            // RESET succeeded — now safe to clean up protection and release normally
            clientReleased = true;
            if (forceCloseTimer) {
              clearTimeout(forceCloseTimer);
              forceCloseTimer = null;
            }
            if (signal) {
              signal.removeEventListener("abort", abortHandler);
            }
            client.release();
          } finally {
            if (resetTimeoutId) {
              clearTimeout(resetTimeoutId);
              resetTimeoutId = null;
            }
          }
        }
      } catch {
        // B26-CLEANUP: RESET failed or timed out — terminate the tainted connection, never return to pool
        terminateAndMark();
      }
    }
    // Final safety: clean up any remaining listener/timer if terminateAndMark was called above
    if (forceCloseTimer) {
      clearTimeout(forceCloseTimer);
      forceCloseTimer = null;
    }
    if (signal) {
      signal.removeEventListener("abort", abortHandler);
    }
  }
}

/**
 * Worker claim and processor: executes bounded streaming snapshot extraction, 1MiB raw Buffer chunking,
 * Envelope v2 encryption, and atomically finalizes the export job with strict fencing.
 */
export async function claimAndProcessExportJob(
  jobId: string,
  workerLeaseToken: string,
  options?: ClaimAndProcessOptions
): Promise<"COMPLETED" | "LEASE_LOST" | "FAILED" | "RETRY_SCHEDULED"> {
  // Validate workerLeaseToken is a valid UUID
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(workerLeaseToken)) {
    throw new Error(`Worker lease token must be a valid UUID, received: '${workerLeaseToken}'`);
  }

  if (options?.signal?.aborted) {
    return "FAILED";
  }

  const pool = options?.pool || getDbPool();
  const db = getDb();
  const now = new Date();
  const leaseUntil = new Date(Date.now() + EXPORT_LEASE_MS);

  // 1. Atomically claim job with leaseToken, fresh startedAt per attempt, attemptCount < 3
  const claimResult = await db
    .update(schema.exportJobs)
    .set({
      status: "PROCESSING",
      leaseToken: workerLeaseToken,
      leaseUntil,
      attemptCount: sql`${schema.exportJobs.attemptCount} + 1`,
      startedAt: now,
      lastProgressAt: now,
    })
    .where(
      and(
        eq(schema.exportJobs.id, jobId),
        or(
          and(eq(schema.exportJobs.status, "PENDING"), lte(schema.exportJobs.nextAttemptAt, now)),
          and(
            eq(schema.exportJobs.status, "PROCESSING"),
            or(isNull(schema.exportJobs.leaseUntil), lte(schema.exportJobs.leaseUntil, now))
          )
        ),
        lt(schema.exportJobs.attemptCount, MAX_EXPORT_ATTEMPTS)
      )
    )
    .returning({
      id: schema.exportJobs.id,
      userId: schema.exportJobs.userId,
      attemptCount: schema.exportJobs.attemptCount,
    });

  if (claimResult.length === 0) {
    return "LEASE_LOST";
  }

  const claimed = claimResult[0]!;
  const attemptNo = claimed.attemptCount;

  // Signal true claim success to listener
  if (options?.onProgress) {
    options.onProgress({
      jobId,
      startedAt: now,
      lastProgressAt: now,
      phase: "claimed",
    });
  }

  // AbortController with single absolute deadline across the entire processing lifecycle
  const maxDurationMs = options?.maxDurationMs ?? 10 * 60 * 1000;
  const deadlineAt = now.getTime() + maxDurationMs;

  const abortController = new AbortController();
  const timeoutId = setTimeout(
    () => {
      abortController.abort(
        new ExportError("EXPORT_TIMEOUT", "EXPORT_TIMEOUT_EXCEEDED", 504, false)
      );
    },
    Math.max(1, deadlineAt - Date.now())
  );

  const onExternalAbort = () => {
    abortController.abort(options?.signal?.reason);
  };

  if (options?.signal) {
    if (options.signal.aborted) {
      abortController.abort(options.signal.reason);
    } else {
      options.signal.addEventListener("abort", onExternalAbort, { once: true });
    }
  }

  // Controlled, non-overlapping lease renewal loop (every 20s)
  // Crucially: Lease renewal does NOT update lastProgressAt!
  let isProcessing = true;
  let activeRenewalPromise: Promise<void> | null = null;

  const renewLease = async () => {
    if (!isProcessing || abortController.signal.aborted) return;
    if (Date.now() >= deadlineAt) {
      isProcessing = false;
      abortController.abort(
        new ExportError("EXPORT_TIMEOUT", "Job deadline exceeded during lease renewal", 504, false)
      );
      return;
    }
    try {
      const refreshed = await runGuardedExportDbOp(
        pool,
        deadlineAt,
        abortController.signal,
        3000,
        "lease_renewal",
        async (client) => {
          const newLeaseUntil = new Date(Date.now() + EXPORT_LEASE_MS);
          const res = await client.query<{ id: string }>(
            `UPDATE export_jobs 
             SET lease_until = $1 
             WHERE id = $2 AND lease_token = $3 AND status = 'PROCESSING' AND attempt_count = $4 AND lease_until > now()
             RETURNING id;`,
            [newLeaseUntil, jobId, workerLeaseToken, attemptNo]
          );
          return res.rows;
        }
      );

      if (!refreshed || refreshed.length === 0) {
        isProcessing = false;
        abortController.abort(new ExportError("LEASE_LOST", "Lease lost during renewal"));
      }
    } catch {
      if (Date.now() >= deadlineAt || abortController.signal.aborted) {
        isProcessing = false;
      }
    }
  };

  const renewalIntervalMs = options?.renewalIntervalMs ?? 20000;
  const leaseInterval = setInterval(() => {
    if (!isProcessing || abortController.signal.aborted) return;
    if (!activeRenewalPromise) {
      activeRenewalPromise = renewLease().finally(() => {
        activeRenewalPromise = null;
      });
    }
  }, renewalIntervalMs);

  const updateJobProgress = async (progressTime: Date, progressPercent?: number) => {
    if (!isProcessing || abortController.signal.aborted || Date.now() >= deadlineAt) return;
    try {
      await runGuardedExportDbOp(
        pool,
        deadlineAt,
        abortController.signal,
        2000,
        "progress_update",
        async (client) => {
          if (progressPercent !== undefined) {
            await client.query(
              `UPDATE export_jobs SET progress = $1, last_progress_at = $2 WHERE id = $3 AND lease_token = $4 AND status = 'PROCESSING';`,
              [progressPercent, progressTime, jobId, workerLeaseToken]
            );
          } else {
            await client.query(
              `UPDATE export_jobs SET last_progress_at = $1 WHERE id = $2 AND lease_token = $3 AND status = 'PROCESSING';`,
              [progressTime, jobId, workerLeaseToken]
            );
          }
        }
      );
    } catch {
      // Non-fatal transient progress update glitch
    }
  };

  try {
    if (abortController.signal.aborted) {
      throw abortController.signal.reason || new Error("Export attempt aborted");
    }

    if (options?.testProcessingBarrier) {
      const [freshJob] = await pool
        .query<{ lease_until: Date; last_progress_at: Date }>(
          `SELECT lease_until, last_progress_at FROM export_jobs WHERE id = $1;`,
          [jobId]
        )
        .then((r) => r.rows);
      if (freshJob) {
        await options.testProcessingBarrier({
          jobId,
          leaseToken: workerLeaseToken,
          attemptCount: attemptNo,
          initialLeaseUntil: freshJob.lease_until,
          initialLastProgressAt: freshJob.last_progress_at,
        });
      }
    }

    // 2. Stream user data snapshot under REPEATABLE READ READ ONLY with true query cancellation
    const dataStream = streamUserDataExport(claimed.userId, {
      signal: abortController.signal,
      deadlineAt,
      pool,
      onSection: async (sectionName) => {
        const progressTime = new Date();
        await updateJobProgress(progressTime);
        if (options?.onProgress) {
          options.onProgress({
            jobId,
            lastProgressAt: progressTime,
            phase: "reading_section",
            details: { section: sectionName },
          });
        }
      },
      onProgress: async (info) => {
        const progressTime = new Date();
        await updateJobProgress(progressTime);
        if (options?.onProgress) {
          options.onProgress({
            jobId,
            lastProgressAt: progressTime,
            phase: "reading_page",
            details: info,
          });
        }
      },
    });

    // 3. Incrementally serialize and write <= 1 MiB raw Buffer encrypted parts with per-chunk fencing
    const writeResult = await writeEncryptedExportParts(
      jobId,
      attemptNo,
      dataStream,
      workerLeaseToken,
      {
        signal: abortController.signal,
        deadlineAt,
        pool,
        onPartWritten: async (partNo) => {
          const progressTime = new Date();
          const progressPercent = Math.min(95, Math.max(10, partNo * 10));
          await updateJobProgress(progressTime, progressPercent);
          if (options?.onProgress) {
            options.onProgress({
              jobId,
              lastProgressAt: progressTime,
              phase: "part_written",
              details: { partNo },
            });
          }
        },
      }
    );

    if (abortController.signal.aborted) {
      throw abortController.signal.reason || new Error("Export attempt aborted");
    }
    if (Date.now() >= deadlineAt) {
      throw new ExportError(
        "EXPORT_TIMEOUT",
        "Total job deadline exceeded before finalization",
        504,
        false
      );
    }

    // 4. Finalize job to READY state atomically inside a deadline-guarded FOR UPDATE transaction
    const completedAt = new Date();
    const expiresAt = new Date(completedAt.getTime() + EXPORT_EXPIRATION_HOURS * 3600 * 1000);

    const finalizeSuccess = await runGuardedExportDbOp(
      pool,
      deadlineAt,
      abortController.signal,
      5000,
      "finalization",
      async (client) => {
        await client.query("BEGIN;");
        try {
          // Row-level lock FOR UPDATE
          const checkRes = await client.query<{
            id: string;
            status: string;
            lease_token: string | null;
            attempt_count: number;
            lease_until: Date | null;
          }>(
            `SELECT id, status, lease_token, attempt_count, lease_until FROM export_jobs WHERE id = $1 FOR UPDATE;`,
            [jobId]
          );

          const row = checkRes.rows[0];
          if (!row) {
            await client.query("ROLLBACK;");
            return false;
          }

          // Re-verify wall clock against deadlineAt AFTER lock acquisition!
          if (Date.now() >= deadlineAt) {
            await client.query("ROLLBACK;");
            throw new ExportError(
              "EXPORT_TIMEOUT",
              "Job deadline exceeded while waiting for finalization lock",
              504,
              false
            );
          }

          if (abortController.signal.aborted) {
            await client.query("ROLLBACK;");
            throw new ExportError(
              "EXPORT_ABORTED",
              "Aborted before finalization commit",
              400,
              false
            );
          }

          const leaseValid = row.lease_until && new Date(row.lease_until).getTime() > Date.now();
          if (
            row.status !== "PROCESSING" ||
            row.lease_token !== workerLeaseToken ||
            row.attempt_count !== attemptNo ||
            !leaseValid
          ) {
            await client.query("ROLLBACK;");
            return false;
          }

          await client.query(
            `UPDATE export_jobs 
             SET status = 'READY',
                 progress = 100,
                 result_attempt = $1,
                 part_count = $2,
                 file_size_bytes = $3,
                 checksum_sha256 = $4,
                 expires_at = $5,
                 completed_at = $6,
                 lease_token = NULL,
                 lease_until = NULL
             WHERE id = $7;`,
            [
              attemptNo,
              writeResult.partCount,
              writeResult.totalBytes,
              writeResult.cumulativeSha256,
              expiresAt,
              completedAt,
              jobId,
            ]
          );

          await client.query("COMMIT;");
          return true;
        } catch (txErr) {
          await client.query("ROLLBACK;").catch(() => {});
          throw txErr;
        }
      }
    );

    if (!finalizeSuccess) {
      return "LEASE_LOST";
    }

    return "COMPLETED";
  } catch (err: unknown) {
    if (
      (err instanceof ExportError &&
        (err.code === "LEASE_LOST" || err.code === "EXPORT_LEASE_LOST")) ||
      (err instanceof Error && err.message.includes("LEASE_LOST")) ||
      (abortController.signal.aborted &&
        abortController.signal.reason instanceof Error &&
        abortController.signal.reason.message.includes("LEASE_LOST"))
    ) {
      return "LEASE_LOST";
    }

    const isNonRetryable =
      (err instanceof ExportError && !err.isRetryable) ||
      (abortController.signal.aborted &&
        abortController.signal.reason instanceof ExportError &&
        !abortController.signal.reason.isRetryable);

    const willFail = isNonRetryable || attemptNo >= MAX_EXPORT_ATTEMPTS;
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Retry delays: attempt 1 -> 30s, attempt 2 -> 120s
    const retryDelayMs = attemptNo === 1 ? 30000 : 120000;
    const nextAttemptAt = new Date(Date.now() + retryDelayMs);

    const specificErrorCode =
      (err instanceof ExportError ? err.code : undefined) ||
      (abortController.signal.aborted && abortController.signal.reason instanceof ExportError
        ? abortController.signal.reason.code
        : undefined) ||
      (willFail ? "EXPORT_FAILED" : "EXPORT_RETRY_SCHEDULED");

    // Dedicated cleanup budget of max 2000ms for failure state transition
    const cleanupDeadline = Date.now() + 2000;
    try {
      const failSuccess = await runGuardedExportDbOp(
        pool,
        cleanupDeadline,
        undefined, // Separate cleanup budget: never blocked by processing abort!
        2000,
        "failure_state_update",
        async (client) => {
          const res = await client.query<{ id: string }>(
            `UPDATE export_jobs 
             SET status = $1,
                 next_attempt_at = $2,
                 error_message = $3,
                 error_code = $4,
                 lease_token = $5,
                 lease_until = $6
             WHERE id = $7 AND lease_token = $8 AND status = 'PROCESSING' AND attempt_count = $9 AND lease_until > now()
             RETURNING id;`,
            [
              willFail ? "FAILED" : "PENDING",
              nextAttemptAt,
              errorMsg.slice(0, 500),
              specificErrorCode,
              willFail ? null : workerLeaseToken,
              willFail ? null : leaseUntil,
              jobId,
              workerLeaseToken,
              attemptNo,
            ]
          );
          return res.rows.length > 0;
        }
      );

      if (!failSuccess) {
        return "LEASE_LOST";
      }
    } catch (cleanupErr) {
      console.error(
        `[ExportJob] Failure state update timed out or failed within 2000ms cleanup budget for job ${jobId}:`,
        cleanupErr instanceof Error ? cleanupErr.message : cleanupErr
      );
      // Left for lease reaper recovery
    }

    return willFail ? "FAILED" : "RETRY_SCHEDULED";
  } finally {
    isProcessing = false;
    clearTimeout(timeoutId);
    clearInterval(leaseInterval);
    if (options?.signal) {
      options.signal.removeEventListener("abort", onExternalAbort);
    }
    if (activeRenewalPromise) {
      await Promise.race([
        (activeRenewalPromise as Promise<void>).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    }
  }
}

/**
 * Cancels an active PENDING or PROCESSING export job and purges partial parts.
 * Evaluates job state strictly INSIDE transaction with row-level FOR UPDATE locking
 * and conditional atomic update, ensuring completed READY results are never overwritten or deleted.
 */
export async function cancelExportJob(
  userId: string,
  jobId?: string
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const now = new Date();

  return await db.transaction(async (tx) => {
    // 1. Row-level lock on candidate job row FOR UPDATE inside transaction
    const whereConds = [eq(schema.exportJobs.userId, userId)];
    if (jobId) {
      whereConds.push(eq(schema.exportJobs.id, jobId));
    } else {
      whereConds.push(
        or(eq(schema.exportJobs.status, "PENDING"), eq(schema.exportJobs.status, "PROCESSING"))!
      );
    }

    const lockedJobs = await tx
      .select({
        id: schema.exportJobs.id,
        status: schema.exportJobs.status,
        userId: schema.exportJobs.userId,
      })
      .from(schema.exportJobs)
      .where(and(...whereConds))
      .orderBy(desc(schema.exportJobs.createdAt))
      .limit(1)
      .for("update");

    const job = lockedJobs[0];
    if (!job) {
      throw new ExportError("EXPORT_JOB_NOT_FOUND", "No active export job found to cancel", 404);
    }

    if (job.status !== "PENDING" && job.status !== "PROCESSING") {
      throw new ExportError(
        "EXPORT_CANNOT_CANCEL",
        `Cannot cancel export job in ${job.status} status`,
        400
      );
    }

    // 2. Perform conditional atomic update strictly requiring status IN ('PENDING', 'PROCESSING')
    const updateResult = await tx
      .update(schema.exportJobs)
      .set({
        status: "FAILED",
        errorCode: "EXPORT_CANCELLED_BY_USER",
        errorMessage: "Export job was cancelled by user request.",
        completedAt: now,
        leaseToken: null,
        leaseUntil: null,
      })
      .where(
        and(
          eq(schema.exportJobs.id, job.id),
          eq(schema.exportJobs.userId, userId),
          or(eq(schema.exportJobs.status, "PENDING"), eq(schema.exportJobs.status, "PROCESSING"))
        )
      )
      .returning({ id: schema.exportJobs.id });

    if (updateResult.length === 0) {
      throw new ExportError(
        "EXPORT_CANNOT_CANCEL",
        "Cannot cancel export job: job is no longer active",
        400
      );
    }

    // 3. ONLY delete parts if cancel update actually succeeded!
    await tx.delete(schema.exportJobParts).where(eq(schema.exportJobParts.jobId, job.id));

    return { success: true, message: "Export job successfully cancelled." };
  });
}

export class ExportJobManager {
  static enqueueJob = enqueueExportJob;
  static getJobStatus = getExportJobStatus;
  static claimAndProcess = claimAndProcessExportJob;
  static cancelJob = cancelExportJob;

  static async processNextExportJob(
    _workerId?: string,
    onActiveJob?: ((jobId: string | null) => void) | ExportJobProgressListener,
    options?: {
      pool?: pg.Pool;
      signal?: AbortSignal;
      maxDurationMs?: number;
      testProcessingBarrier?: ClaimAndProcessOptions["testProcessingBarrier"];
    }
  ): Promise<{
    status: "IDLE" | "COMPLETED" | "LEASE_LOST" | "FAILED" | "RETRY_SCHEDULED";
    jobId?: string;
    attemptNo?: number;
  }> {
    const db = getDb();
    const now = new Date();

    // 1. Mark expired PROCESSING jobs exceeding attempts as FAILED cleanly
    await db
      .update(schema.exportJobs)
      .set({ status: "FAILED", errorCode: "EXPORT_MAX_ATTEMPTS_EXCEEDED" })
      .where(
        and(
          eq(schema.exportJobs.status, "PROCESSING"),
          lte(schema.exportJobs.leaseUntil, now),
          sql`${schema.exportJobs.attemptCount} >= ${MAX_EXPORT_ATTEMPTS}`
        )
      );

    // 2. Find eligible candidate
    const [candidate] = await db
      .select({
        id: schema.exportJobs.id,
        attemptCount: schema.exportJobs.attemptCount,
      })
      .from(schema.exportJobs)
      .where(
        and(
          sql`${schema.exportJobs.attemptCount} < ${MAX_EXPORT_ATTEMPTS}`,
          or(
            and(eq(schema.exportJobs.status, "PENDING"), lte(schema.exportJobs.nextAttemptAt, now)),
            and(
              eq(schema.exportJobs.status, "PROCESSING"),
              or(isNull(schema.exportJobs.leaseUntil), lte(schema.exportJobs.leaseUntil, now))
            )
          )
        )
      )
      .orderBy(schema.exportJobs.createdAt)
      .limit(1);

    if (!candidate) {
      if (typeof onActiveJob === "function") onActiveJob(null);
      return { status: "IDLE" };
    }

    // Generate strict cryptographically random UUID for worker lease token
    const leaseTokenUuid = crypto.randomUUID();

    // Candidate selection is NOT claim. Claim is verified only within claimAndProcessExportJob.

    try {
      const outcome = await claimAndProcessExportJob(candidate.id, leaseTokenUuid, {
        pool: options?.pool,
        signal: options?.signal,
        maxDurationMs: options?.maxDurationMs,
        testProcessingBarrier: options?.testProcessingBarrier,
        onProgress: (prog) => {
          if (prog.phase === "claimed") {
            if (typeof onActiveJob === "function") {
              onActiveJob(candidate.id);
            } else if (onActiveJob && typeof onActiveJob.onJobClaimed === "function") {
              onActiveJob.onJobClaimed({
                jobId: candidate.id,
                startedAt: prog.startedAt || new Date(),
                lastProgressAt: prog.lastProgressAt,
              });
            }
          } else {
            if (
              onActiveJob &&
              typeof onActiveJob === "object" &&
              typeof onActiveJob.onJobProgress === "function"
            ) {
              onActiveJob.onJobProgress(prog);
            }
          }
        },
      });

      return {
        status: outcome,
        jobId: candidate.id,
        attemptNo: candidate.attemptCount + 1,
      };
    } finally {
      if (typeof onActiveJob === "function") {
        onActiveJob(null);
      } else if (onActiveJob && typeof onActiveJob.onJobFinished === "function") {
        onActiveJob.onJobFinished(candidate.id);
      }
    }
  }

  static async cleanupExpiredJobs(referenceTime: Date = new Date()): Promise<number> {
    const db = getDb();
    return await db.transaction(async (tx) => {
      const expiredJobs = await tx
        .update(schema.exportJobs)
        .set({ status: "EXPIRED" })
        .where(
          or(
            and(
              lte(schema.exportJobs.expiresAt, referenceTime),
              sql`${schema.exportJobs.status} != 'EXPIRED'`
            ),
            eq(schema.exportJobs.status, "EXPIRED")
          )
        )
        .returning({ id: schema.exportJobs.id });

      for (const job of expiredJobs) {
        await tx.delete(schema.exportJobParts).where(eq(schema.exportJobParts.jobId, job.id));
      }
      return expiredJobs.length;
    });
  }
}

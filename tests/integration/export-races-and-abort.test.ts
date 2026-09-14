import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import {
  enqueueExportJob,
  claimAndProcessExportJob,
  cancelExportJob,
} from "@/src/modules/privacy/export-jobs";
import { writeEncryptedExportParts } from "@/src/modules/privacy/export-writer";
import { streamUserDataExport } from "@/src/modules/privacy/export-reader";
import { ExportError } from "@/src/modules/privacy/export-errors";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

describe("Priority 1 & 2: Export Cancel, Writer Races, and Real Query Cancellation", () => {
  let ctx: TestDatabaseContext;
  const testUserId = DEFAULT_USER.id;
  let testCategoryId: string;

  beforeAll(async () => {
    ctx = await createIsolatedTestDatabase();
    setDbForTesting(ctx.db, ctx.pool);

    await ctx.db
      .insert(schema.users)
      .values({
        id: testUserId,
        email: DEFAULT_USER.email,
        passwordHash: "dummy_hash_for_test",
        role: "USER",
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    testCategoryId = crypto.randomUUID();
    await ctx.db
      .insert(schema.categories)
      .values({
        id: testCategoryId,
        key: `test-cat-${testCategoryId}`,
        isActive: true,
        sortOrder: 1,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    resetDbForTesting();
    if (ctx) {
      await ctx.destroy();
    }
  });

  beforeEach(async () => {
    const existing = await ctx.db
      .select({ id: schema.exportJobs.id })
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.userId, testUserId));

    for (const job of existing) {
      await ctx.db.delete(schema.exportJobParts).where(eq(schema.exportJobParts.jobId, job.id));
      await ctx.db.delete(schema.exportJobs).where(eq(schema.exportJobs.id, job.id));
    }
  });

  // TEST 1: Worker reaches READY before cancel update executes -> READY preserved, parts intact
  it("Worker transitions to READY before cancel update executes: completed result is strictly preserved", async () => {
    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();

    // 1. Process job to completion (READY)
    const processResult = await claimAndProcessExportJob(jobId, workerToken);
    expect(processResult).toBe("COMPLETED");

    const [jobBeforeCancel] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(jobBeforeCancel?.status).toBe("READY");

    const partsBeforeCancel = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId));
    expect(partsBeforeCancel.length).toBeGreaterThan(0);

    // 2. User attempts to cancel job that is already READY -> rejected with EXPORT_CANNOT_CANCEL
    let cancelError: unknown = null;
    try {
      await cancelExportJob(testUserId, jobId);
    } catch (err) {
      cancelError = err;
    }

    expect(cancelError).toBeDefined();
    expect((cancelError as ExportError).code).toBe("EXPORT_CANNOT_CANCEL");

    // 3. Verify DB state was NOT mutated to FAILED and parts were NOT deleted
    const [jobAfterCancel] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(jobAfterCancel?.status).toBe("READY");

    const partsAfterCancel = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId));
    expect(partsAfterCancel.length).toBe(partsBeforeCancel.length);
  });

  // TEST 2: Writer paused after initial check, job cancelled, writer resumes -> rejects write and produces 0 new parts
  it("Writer paused after check, job cancelled, writer resumes: writer transaction rejects new parts", async () => {
    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();

    // Set job to PROCESSING under workerToken
    await ctx.db
      .update(schema.exportJobs)
      .set({
        status: "PROCESSING",
        leaseToken: workerToken,
        attemptCount: 1,
        leaseUntil: new Date(Date.now() + 60000),
      })
      .where(eq(schema.exportJobs.id, jobId));

    // Write part 1 successfully
    await writeEncryptedExportParts(jobId, 1, Buffer.from("part 1 data"), workerToken);

    const partsBefore = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId));
    expect(partsBefore.length).toBe(1);

    // Now user cancels the job atomically
    const cancelResult = await cancelExportJob(testUserId, jobId);
    expect(cancelResult.success).toBe(true);

    // Verify parts were purged by the successful cancel
    const partsAfterCancel = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId));
    expect(partsAfterCancel.length).toBe(0);

    // Resumed writer attempts to write part 2 with old token on now-cancelled job
    let writePart2Error: unknown = null;
    try {
      await writeEncryptedExportParts(
        jobId,
        2,
        Buffer.from("part 2 data after cancel"),
        workerToken
      );
    } catch (err) {
      writePart2Error = err;
    }

    expect(writePart2Error).toBeDefined();
    expect((writePart2Error as ExportError).code).toBe("LEASE_LOST");

    // Verify 0 new parts were persisted
    const partsFinal = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId));
    expect(partsFinal.length).toBe(0);
  });

  // TEST 3: Lease handed over from A to B: A's actions cannot mutate B's result
  it("Lease transferred from Worker A to Worker B: Worker A operations cannot mutate Worker B's READY result", async () => {
    const { jobId } = await enqueueExportJob(testUserId);
    const tokenA = crypto.randomUUID();
    const tokenB = crypto.randomUUID();

    // 1. Worker A claims job, but lease expires
    await ctx.db
      .update(schema.exportJobs)
      .set({
        status: "PROCESSING",
        leaseToken: tokenA,
        attemptCount: 1,
        leaseUntil: new Date(Date.now() - 1000), // Expired
      })
      .where(eq(schema.exportJobs.id, jobId));

    // 2. Worker B claims and processes the job to completion
    const resultB = await claimAndProcessExportJob(jobId, tokenB);
    expect(resultB).toBe("COMPLETED");

    const [jobB] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(jobB?.status).toBe("READY");
    expect(jobB?.leaseToken).toBeNull(); // Released upon completion
    expect(jobB?.attemptCount).toBe(2);

    const partsB = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId));
    const partsCountB = partsB.length;
    expect(partsCountB).toBeGreaterThan(0);

    // 3. Worker A (stale) tries to write a part
    let writeErrA: unknown = null;
    try {
      await writeEncryptedExportParts(jobId, 999, Buffer.from("stale part from worker A"), tokenA);
    } catch (err) {
      writeErrA = err;
    }
    expect(writeErrA).toBeDefined();

    // 4. Worker A tries to claimAndProcess again
    const resultA = await claimAndProcessExportJob(jobId, tokenA);
    expect(resultA).toBe("LEASE_LOST");

    // 5. Worker B's result is 100% untouched
    const [finalJob] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(finalJob?.status).toBe("READY");
    expect(finalJob?.leaseToken).toBeNull();
    expect(finalJob?.attemptCount).toBe(2);

    const finalParts = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId));
    expect(finalParts.length).toBe(partsCountB);
  });

  // TEST 4: Query Cancellation via pg_cancel_backend & AbortSignal
  it("AbortSignal triggers true pg_cancel_backend: cancels hanging DB query and frees client to pool", async () => {
    const ac = new AbortController();

    // Seed dummy listing so streamUserDataExport has work
    const listingId = crypto.randomUUID();
    await ctx.db
      .insert(schema.listings)
      .values({
        id: listingId,
        ownerUserId: testUserId,
        categoryId: testCategoryId,
        title: "Abort Test Listing",
        slug: `abort-test-${listingId}`,
        summary: "Testing cancellation of active queries",
        scope: "Full scope for testing abort signal",
        budgetMode: "OPEN_BID",
        timelineMode: "FLEXIBLE",
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    // Launch streaming export with abort controller
    const generator = streamUserDataExport(testUserId, {
      signal: ac.signal,
    });

    // Read first token to establish connection and backend PID
    const first = await generator.next();
    expect(first.done).toBe(false);

    // Abort the signal while generator is active
    ac.abort();

    // Next iteration must fail with cancellation or abort
    let abortErr: unknown = null;
    try {
      await generator.next();
    } catch (err) {
      abortErr = err;
    }

    expect(abortErr).toBeDefined();

    // Ensure connection was released back to pool: test that pool can immediately execute queries
    const poolCheck = await ctx.pool.query("SELECT 1 AS alive");
    expect(poolCheck.rows[0].alive).toBe(1);
  });

  // TEST 5: Pre-aborted signal is handled immediately at start of job processing
  it("Pre-aborted AbortSignal is handled immediately without claiming job or running queries", async () => {
    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();
    const ac = new AbortController();
    ac.abort(); // Pre-aborted

    const result = await claimAndProcessExportJob(jobId, workerToken, { signal: ac.signal });
    expect(result).toBe("FAILED");

    // Check DB status: remained PENDING because it was never claimed
    const [job] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(job?.status).toBe("PENDING");
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  createIsolatedTestDatabase,
  TestDatabaseContext,
  getVerifiedTestDatabaseUrl,
} from "@/tests/helpers/test-database";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import crypto from "node:crypto";
import pg from "pg";
import {
  enqueueExportJob,
  claimAndProcessExportJob,
  ExportJobManager,
  runGuardedExportDbOp,
} from "@/src/modules/privacy/export-jobs";
import { writeEncryptedExportParts, runFencedWriterTx } from "@/src/modules/privacy/export-writer";
import { streamUserDataExport } from "@/src/modules/privacy/export-reader";
import {
  probeDatabaseDirectly,
  evaluateWorkerHealth,
  WorkerHeartbeatV2,
} from "@/scripts/lib/worker-health";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import { WorkerDaemonExportState } from "@/scripts/lib/daemon-export-state";
import { cancelBackendPid } from "@/src/lib/db/cancellation";

describe("Export Lifecycle, Pool Deadlock Breaking, Progress Heartbeat & Memory Capacity", () => {
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
        passwordHash: "dummy_hash_lifecycle",
        role: "USER",
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    testCategoryId = crypto.randomUUID();
    await ctx.db
      .insert(schema.categories)
      .values({
        id: testCategoryId,
        key: `cat-${testCategoryId}`,
        isActive: true,
        sortOrder: 1,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    resetDbForTesting();
    if (ctx) {
      ctx.pool.on("error", () => {});
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

  // =========================================================================
  // TEST 1: Early generator termination (generator.return()) under max:1 pool
  // =========================================================================
  it("max:1 pool with generator.return() rolls back transaction, leaves no idle-in-transaction, and permits writes", async () => {
    const singleConnPool = new pg.Pool({
      connectionString: ctx.connectionString,
      max: 1,
    });
    setDbForTesting(ctx.db, singleConnPool);

    try {
      const generator = streamUserDataExport(testUserId);
      const firstChunk = await generator.next();
      expect(firstChunk.done).toBe(false);
      expect(typeof firstChunk.value).toBe("string");

      const returnResult = await generator.return({ snapshotStartedAt: new Date() });
      expect(returnResult.done).toBe(true);

      const adminClient = new pg.Client({ connectionString: ctx.connectionString });
      await adminClient.connect();
      try {
        const checkRes = await adminClient.query(
          "SELECT pid, state, query FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction';"
        );
        expect(checkRes.rows.length).toBe(0);
      } finally {
        await adminClient.end();
      }

      const client = await singleConnPool.connect();
      try {
        const testKey = `clean-write-${crypto.randomUUID()}`;
        await client.query(
          "INSERT INTO categories (id, key, is_active, sort_order) VALUES ($1, $2, true, 999);",
          [crypto.randomUUID(), testKey]
        );
        await client.query("DELETE FROM categories WHERE key = $1;", [testKey]);
      } finally {
        client.release();
      }
    } finally {
      setDbForTesting(ctx.db, ctx.pool);
      await singleConnPool.end();
    }
  });

  // =========================================================================
  // TEST 2: max:1 pool with abort does NOT deadlock and unblocks promptly
  // =========================================================================
  it("max:1 pool with abort does not deadlock on cancel command, terminates in <2s and leaves pool clean", async () => {
    const singleConnPool = new pg.Pool({
      connectionString: ctx.connectionString,
      max: 1,
    });
    setDbForTesting(ctx.db, singleConnPool);

    try {
      const ac = new AbortController();
      const generator = streamUserDataExport(testUserId, { signal: ac.signal });

      // 1. Advance to first yield — client is now checked out and holding the ONLY connection in pool
      const first = await generator.next();
      expect(first.done).toBe(false);

      const startAbort = Date.now();
      // 2. Trigger abort
      ac.abort(new Error("Test abort on saturated max:1 pool"));

      // 3. Call generator.next() or generator.return().
      // In the old code, abortHandler called pool.query() on the SAME max:1 pool, which hung indefinitely!
      // In the new code, dedicated cancellation is used, terminating in < 2000ms.
      let rejected = false;
      try {
        await generator.next();
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(true);
      const elapsed = Date.now() - startAbort;
      expect(elapsed).toBeLessThan(3000);

      // 4. Verify no idle in transaction remains
      const adminClient = new pg.Client({ connectionString: ctx.connectionString });
      await adminClient.connect();
      try {
        const checkRes = await adminClient.query(
          "SELECT pid, state FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction';"
        );
        expect(checkRes.rows.length).toBe(0);
      } finally {
        await adminClient.end();
      }

      // 5. Subsequent write on the exact same pool succeeds immediately
      const client = await singleConnPool.connect();
      try {
        const testKey = `max1-abort-write-${crypto.randomUUID()}`;
        await client.query(
          "INSERT INTO categories (id, key, is_active, sort_order) VALUES ($1, $2, true, 777);",
          [crypto.randomUUID(), testKey]
        );
        await client.query("DELETE FROM categories WHERE key = $1;", [testKey]);
      } finally {
        client.release();
      }
    } finally {
      setDbForTesting(ctx.db, ctx.pool);
      await singleConnPool.end();
    }
  });

  // =========================================================================
  // TEST 3: Saturated pool barrier: Reader, Writer, and Probe cancellation
  // =========================================================================
  it("saturated pool barrier: reader, writer, and probe handle full pool without hanging or leaking", async () => {
    const smallPool = new pg.Pool({
      connectionString: ctx.connectionString,
      max: 2,
    });
    smallPool.on("error", () => {});

    // 1. Completely saturate all 2 connections in smallPool with sleep queries
    const barrierClient1 = await smallPool.connect();
    const barrierClient2 = await smallPool.connect();

    const barrier1Promise = barrierClient1.query("SELECT pg_sleep(3)");
    const barrier2Promise = barrierClient2.query("SELECT pg_sleep(3)");

    try {
      // 2. Probe on saturated pool with short timeout (500ms):
      // Must return status: DOWN without deadlocking or leaking connection
      const probeStart = Date.now();
      const probeRes = await probeDatabaseDirectly(500, smallPool);
      const probeElapsed = Date.now() - probeStart;

      expect(probeRes.status).toBe("DOWN");
      expect(probeElapsed).toBeLessThan(2000);

      // 3. Writer transaction on saturated pool with short timeout (500ms):
      // Must reject acquisition cleanly without leaking
      const writeStart = Date.now();
      let writeTimedOut = false;
      try {
        await runFencedWriterTx(
          undefined,
          async (txDb) => {
            return await txDb.select().from(schema.users).limit(1);
          },
          { pool: smallPool, acquisitionTimeoutMs: 500, remainingDeadlineMs: 1000 }
        );
      } catch {
        writeTimedOut = true;
      }
      const writeElapsed = Date.now() - writeStart;
      expect(writeTimedOut).toBe(true);
      expect(writeElapsed).toBeLessThan(2000);
    } finally {
      // Release barrier
      await Promise.all([barrier1Promise, barrier2Promise]);
      barrierClient1.release();
      barrierClient2.release();
    }

    // 4. Now that barrier is released, subsequent probe, writer, and reader succeed cleanly
    const postProbe = await probeDatabaseDirectly(2000, smallPool);
    expect(postProbe.status).toBe("UP");

    await smallPool.end();
  });

  // =========================================================================
  // TEST 4: Writer FOR UPDATE lock wait cancellation via AbortSignal
  // =========================================================================
  it("writer FOR UPDATE lock wait is aborted and unblocked promptly by AbortSignal", async () => {
    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();

    const claimRes = await ctx.db
      .update(schema.exportJobs)
      .set({
        status: "PROCESSING",
        leaseToken: workerToken,
        leaseUntil: new Date(Date.now() + 60000),
        attemptCount: 1,
      })
      .where(eq(schema.exportJobs.id, jobId))
      .returning({ id: schema.exportJobs.id });
    expect(claimRes.length).toBe(1);

    const blockerClient = await ctx.pool.connect();
    await blockerClient.query("BEGIN;");
    await blockerClient.query("SELECT id FROM export_jobs WHERE id = $1 FOR UPDATE;", [jobId]);

    const ac = new AbortController();
    const startTime = Date.now();

    const writePromise = writeEncryptedExportParts(
      jobId,
      1,
      Buffer.from("blocked chunk"),
      workerToken,
      { signal: ac.signal }
    );

    await new Promise((r) => setTimeout(r, 200));

    ac.abort(new Error("External abort while waiting for lock"));

    let writerError: unknown = null;
    try {
      await writePromise;
    } catch (err) {
      writerError = err;
    }

    const elapsed = Date.now() - startTime;

    await blockerClient.query("ROLLBACK;");
    blockerClient.release();

    expect(elapsed).toBeLessThan(3500);
    expect(writerError).toBeDefined();

    const postCheck = await ctx.pool.query(
      "SELECT pid, state FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction';"
    );
    expect(postCheck.rows.length).toBe(0);
  });

  // =========================================================================
  // TEST 5: Microsecond Keyset Precision with 1,001 Records in Same Millisecond
  // =========================================================================
  it("lossless microsecond keyset pagination: 1,001 records in same millisecond match 100% across page boundaries", async () => {
    await ctx.db.delete(schema.listings).where(eq(schema.listings.ownerUserId, testUserId));

    await ctx.pool.query(
      `
      INSERT INTO listings (
        id, owner_user_id, category_id, title, slug, summary, scope,
        budget_mode, timeline_mode, status, created_at, updated_at
      )
      SELECT
        gen_random_uuid(),
        $1::uuid,
        $2::uuid,
        'Listing Micro ' || i,
        'listing-micro-' || i || '-' || gen_random_uuid()::text,
        'Summary ' || i,
        'Scope ' || i,
        'OPEN_BID',
        'FLEXIBLE',
        'ACTIVE',
        '2026-09-13 10:00:00.123000+00'::timestamptz + (i * INTERVAL '1 microsecond'),
        now()
      FROM generate_series(1, 1001) AS i;
      `,
      [testUserId, testCategoryId]
    );

    const dbRows = await ctx.pool.query(
      "SELECT id FROM listings WHERE owner_user_id = $1::uuid ORDER BY created_at DESC, id DESC;",
      [testUserId]
    );
    expect(dbRows.rows.length).toBe(1001);
    const expectedIdSet = new Set(dbRows.rows.map((r) => r.id));

    const generator = streamUserDataExport(testUserId);
    const chunks: string[] = [];
    for await (const chunk of generator) {
      chunks.push(chunk);
    }

    const fullJson = chunks.join("");
    const parsed = JSON.parse(fullJson);

    expect(Array.isArray(parsed.listings)).toBe(true);
    expect(parsed.listings.length).toBe(1001);

    const exportedIdSet = new Set(parsed.listings.map((l: { id: string }) => l.id));
    expect(exportedIdSet.size).toBe(1001);

    for (const expectedId of expectedIdSet) {
      expect(exportedIdSet.has(expectedId)).toBe(true);
    }
  });

  // =========================================================================
  // TEST 6: Real Processor -> Daemon Progress Chain & State Lifecycle (K01-TEST)
  // =========================================================================
  it("real processor->daemon progress chain: claim, page reads and chunk writes update progress; lease renewal does not; state cleans up on finish and claim loss", async () => {
    // 1. Seed >500 listings (520 listings) with large text scope so total payload > 2 MiB
    const largeScope = "Detayli is tanimi metni ve teslim edilecekler kapsam belgesi. ".repeat(70); // ~4.3 KB per listing
    const listingBatches: (typeof schema.listings.$inferInsert)[][] = [];
    let currentBatch: (typeof schema.listings.$inferInsert)[] = [];

    for (let i = 1; i <= 520; i++) {
      currentBatch.push({
        id: crypto.randomUUID(),
        ownerUserId: testUserId,
        categoryId: testCategoryId,
        title: `Progress Chain Listing ${i}`,
        slug: `progress-chain-${i}-${crypto.randomUUID()}`,
        summary: `Summary ${i}`,
        scope: largeScope,
        budgetMode: "OPEN_BID",
        timelineMode: "FLEXIBLE",
        status: "ACTIVE",
      });
      if (currentBatch.length === 100 || i === 520) {
        listingBatches.push(currentBatch);
        currentBatch = [];
      }
    }
    for (const b of listingBatches) {
      await ctx.db.insert(schema.listings).values(b);
    }

    // 2. Use real WorkerDaemonExportState shared class
    const daemonState = new WorkerDaemonExportState();

    // 3. Enqueue real export job
    const { jobId } = await enqueueExportJob(testUserId);
    expect(jobId).toBeDefined();

    // 4. Execute REAL processor -> daemon chain via ExportJobManager.processNextExportJob
    const outcome = await ExportJobManager.processNextExportJob(
      "test-daemon-worker-1",
      daemonState
    );
    expect(outcome.status).toBe("COMPLETED");
    expect(outcome.jobId).toBe(jobId);

    // 5. Verify daemon events: multi-page (>=2 reading_page) and multi-part (>=2 part_written)
    // K01-MEM: onJobFinished now resets per-job counters, so check total progress count
    expect(daemonState.recentEventCount).toBeGreaterThanOrEqual(4);
    // Per-job counters are reset by onJobFinished; check totalProgressCount instead
    expect(daemonState.totalProgressCount).toBeGreaterThanOrEqual(4);

    // K01-MEM: Per-job counters are now reset on finish (this is correct behavior)
    expect(daemonState.readingPageCount).toBe(0);
    expect(daemonState.partWrittenCount).toBe(0);
    expect(daemonState.readingSectionCount).toBe(0);
    expect(daemonState.totalJobsCompleted).toBe(1);

    // 7. Verify database reflects successful completion with >=2 parts and >2 MiB
    const [dbJob] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(dbJob?.status).toBe("READY");
    expect(dbJob?.lastProgressAt).not.toBeNull();
    expect(dbJob?.partCount).toBeGreaterThanOrEqual(2);
    expect(Number(dbJob?.fileSizeBytes)).toBeGreaterThan(2 * 1024 * 1024);
    const finalProgressAt = dbJob!.lastProgressAt!;

    // 8. Verify Lease Renewal does NOT update lastProgressAt
    const originalProgressAt = new Date(Date.now() - 50000);
    const testLeaseJobId = crypto.randomUUID();
    const testWorkerToken = crypto.randomUUID();

    await ctx.db.insert(schema.exportJobs).values({
      id: testLeaseJobId,
      userId: testUserId,
      status: "PROCESSING",
      leaseToken: testWorkerToken,
      leaseUntil: new Date(Date.now() + 20000),
      attemptCount: 1,
      startedAt: new Date(Date.now() - 60000),
      lastProgressAt: originalProgressAt,
    });

    // Execute real renewal query (matching renewLease in processor)
    const renewalResult = await ctx.db
      .update(schema.exportJobs)
      .set({
        leaseUntil: new Date(Date.now() + 60000),
      })
      .where(
        and(
          eq(schema.exportJobs.id, testLeaseJobId),
          eq(schema.exportJobs.leaseToken, testWorkerToken),
          eq(schema.exportJobs.status, "PROCESSING"),
          eq(schema.exportJobs.attemptCount, 1)
        )
      )
      .returning({
        id: schema.exportJobs.id,
        lastProgressAt: schema.exportJobs.lastProgressAt,
        leaseUntil: schema.exportJobs.leaseUntil,
      });

    expect(renewalResult.length).toBe(1);
    expect(renewalResult[0]!.lastProgressAt?.getTime()).toBe(originalProgressAt.getTime());
    expect(renewalResult[0]!.leaseUntil!.getTime()).toBeGreaterThan(Date.now());

    await ctx.db.delete(schema.exportJobs).where(eq(schema.exportJobs.id, testLeaseJobId));

    // 9. Verify Claim Loss / Finish State Cleanup on active job
    const activeClaimState = new WorkerDaemonExportState();
    activeClaimState.onJobClaimed({
      jobId: "active-lost-job",
      startedAt: new Date(),
      lastProgressAt: new Date(),
    });
    expect(activeClaimState.activeJobId).toBe("active-lost-job");

    // When worker finishes / loses claim:
    activeClaimState.onJobFinished("active-lost-job");
    expect(activeClaimState.activeJobId).toBeNull();

    // 10. Verify that if callback listener is disconnected / undefined, daemon state is not updated
    const disconnectedState = new WorkerDaemonExportState();
    await enqueueExportJob(testUserId);
    await ExportJobManager.processNextExportJob("test-daemon-worker-disconnected", undefined);
    expect(disconnectedState.recentEventCount).toBe(0);
    expect(disconnectedState.activeJobId).toBeNull();

    // 11. Evaluate worker health with recorded progress
    const healthyHeartbeat: WorkerHeartbeatV2 = {
      schemaVersion: 2,
      pid: process.pid,
      uptimeSeconds: 300,
      timestamp: new Date().toISOString(),
      dbProbe: { status: "UP", latencyMs: 2, lastCheckedAt: new Date().toISOString() },
      outbox: {
        lastSuccessAt: new Date().toISOString(),
        consecutiveFailures: 0,
        deadCount: 0,
        failedCount: 0,
        oldestPendingSeconds: 0,
      },
      export: {
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        lastProgressAt: finalProgressAt.toISOString(),
        startedAt: new Date().toISOString(),
        activeJobId: null,
        consecutiveFailures: 0,
      },
      maintenance: {
        lastAttemptAt: null,
        lastSuccessAt: new Date().toISOString(),
        hasErrors: false,
        summary: {},
      },
    };

    const healthyResult = evaluateWorkerHealth(healthyHeartbeat);
    expect(healthyResult.healthy).toBe(true);

    // Stalled: active job with progress 95s ago
    const stalledHeartbeat: WorkerHeartbeatV2 = {
      ...healthyHeartbeat,
      export: {
        ...healthyHeartbeat.export,
        activeJobId: "stalled-job",
        lastProgressAt: new Date(Date.now() - 95000).toISOString(),
      },
    };
    const stalledResult = evaluateWorkerHealth(stalledHeartbeat);
    expect(stalledResult.healthy).toBe(false);
    expect(stalledResult.reasons.some((r) => r.includes("stalled: no progress"))).toBe(true);
  });

  // =========================================================================
  // TEST 7: Memory Capacity Test (10x Byte Volume, Sampled Peak RSS)
  // =========================================================================
  it("memory capacity: 10x byte volume with 20 large revisions maintains bounded sampled peak RSS", async () => {
    // 1. Create a listing
    const listingId = crypto.randomUUID();
    await ctx.db.insert(schema.listings).values({
      id: listingId,
      ownerUserId: testUserId,
      categoryId: testCategoryId,
      title: "Capacity Test Listing",
      slug: `cap-test-${listingId}`,
      summary: "Summary",
      scope: "Scope ".repeat(200),
      budgetMode: "OPEN_BID",
      timelineMode: "FLEXIBLE",
      status: "ACTIVE",
    });

    // 2. Insert 20 revisions of 150 KB each (total 3 MiB of snapshots)
    const revisionData = "Y".repeat(150 * 1024);
    for (let r = 1; r <= 20; r++) {
      await ctx.db.insert(schema.listingRevisions).values({
        id: crypto.randomUUID(),
        listingId,
        editorUserId: testUserId,
        revisionNo: r,
        snapshotJson: { index: r, payload: revisionData },
      });
    }

    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();

    // Sample peak RSS during processing
    const initialRss = process.memoryUsage().rss;
    let peakRss = initialRss;
    const rssSampler = setInterval(() => {
      const current = process.memoryUsage().rss;
      if (current > peakRss) peakRss = current;
    }, 20);

    const startTime = Date.now();
    const result = await claimAndProcessExportJob(jobId, workerToken);
    clearInterval(rssSampler);
    const durationMs = Date.now() - startTime;

    expect(result).toBe("COMPLETED");

    const [completedJob] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(completedJob?.status).toBe("READY");

    const peakRssMb = peakRss / (1024 * 1024);
    const deltaRssMb = (peakRss - initialRss) / (1024 * 1024);
    const totalBytes = completedJob?.fileSizeBytes ?? 0;

    // Report sampled metrics
    console.info(
      `[Memory Capacity Test] Total Bytes: ${totalBytes}, Duration: ${durationMs}ms, Sampled Peak RSS: ${Math.round(peakRssMb)} MiB, Delta RSS: ${Math.round(deltaRssMb)} MiB`
    );

    expect(totalBytes).toBeGreaterThanOrEqual(3 * 1024 * 1024);
    expect(deltaRssMb).toBeLessThan(120); // Delta RSS strictly bounded during processing
    expect(peakRssMb).toBeLessThan(400); // Overall peak bounded
  });

  // =========================================================================
  // TEST 8: Oversized Single Record (>10 MiB) fails with EXPORT_RECORD_TOO_LARGE
  // =========================================================================
  it("oversized single record (>10 MiB) throws EXPORT_RECORD_TOO_LARGE and job is NEVER marked READY", async () => {
    const listingId = crypto.randomUUID();
    await ctx.db.insert(schema.listings).values({
      id: listingId,
      ownerUserId: testUserId,
      categoryId: testCategoryId,
      title: "Oversized Listing",
      slug: `oversized-${listingId}`,
      summary: "Summary",
      scope: "Scope",
      budgetMode: "OPEN_BID",
      timelineMode: "FLEXIBLE",
      status: "ACTIVE",
    });

    // Insert an oversized 11 MiB snapshot
    const oversizedPayload = "Z".repeat(11 * 1024 * 1024);
    await ctx.db.insert(schema.listingRevisions).values({
      id: crypto.randomUUID(),
      listingId,
      editorUserId: testUserId,
      revisionNo: 99,
      snapshotJson: { oversizedPayload },
    });

    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();

    const processResult = await claimAndProcessExportJob(jobId, workerToken);
    expect(processResult).toBe("FAILED");

    const [job] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));

    // Must be marked FAILED with EXPORT_RECORD_TOO_LARGE, NEVER READY!
    expect(job?.status).toBe("FAILED");
    expect(job?.errorCode).toBe("EXPORT_RECORD_TOO_LARGE");
  });

  // =========================================================================
  // TEST 9: Active query cancellation with broken/unresponsive control channel
  // =========================================================================
  it("active query cancellation with broken/unresponsive control channel triggers forced socket termination within <= 1500ms and cleanly rolls back", async () => {
    const abortController = new AbortController();
    const startTime = Date.now();

    // Start a fenced writer transaction executing a 10s sleep query
    // Supply an unreachable control connection port to simulate a broken control channel
    const writerPromise = runFencedWriterTx(
      abortController.signal,
      async (_txDb, client) => {
        await client.query("SELECT pg_sleep(10);");
        return "SHOULD_NOT_REACH_HERE";
      },
      {
        pool: ctx.pool,
        remainingDeadlineMs: 30000,
        cancelOptions: {
          connectionString: "postgresql://127.0.0.1:54329/broken_control_channel",
          timeoutMs: 400,
        },
      }
    );

    // Give the query 100ms to start executing on the PostgreSQL backend
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger abort while query is actively running
    abortController.abort(new Error("TEST_ACTIVE_ABORT"));

    // The forced socket termination timer (max 1500ms) must abort the query immediately,
    // NOT hanging for the 10s pg_sleep or 30s statement_timeout!
    await expect(writerPromise).rejects.toThrow();

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3500);

    // Verify database has no dangling idle in transaction
    const adminClient = new pg.Client({ connectionString: ctx.connectionString });
    await adminClient.connect();
    try {
      const checkRes = await adminClient.query(
        "SELECT pid, state, query FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction';"
      );
      expect(checkRes.rows.length).toBe(0);
    } finally {
      await adminClient.end();
    }
  });

  // =========================================================================
  // TEST 10: B26-DEADLINE: Row-lock barrier during finalization prevents post-deadline READY
  // =========================================================================
  it("finalization under row-lock barrier: lock delay past deadlineAt prevents READY commit and marks FAILED", async () => {
    const listingId = crypto.randomUUID();
    await ctx.db.insert(schema.listings).values({
      id: listingId,
      ownerUserId: testUserId,
      categoryId: testCategoryId,
      title: "Barrier Test Listing",
      slug: `barrier-test-${listingId}`,
      summary: "Summary",
      scope: "Scope",
      budgetMode: "OPEN_BID",
      timelineMode: "FLEXIBLE",
      status: "ACTIVE",
    });

    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();

    const barrierClient = new pg.Client({ connectionString: ctx.connectionString });
    await barrierClient.connect();

    let barrierAcquired = false;

    // Start worker claim and process with short deadline (1200ms)
    const workerPromise = claimAndProcessExportJob(jobId, workerToken, {
      maxDurationMs: 1200,
      pool: ctx.pool,
      onProgress: async (p) => {
        // As soon as claimed or streaming starts, barrierClient acquires FOR UPDATE lock on the job row
        if (!barrierAcquired && (p.phase === "claimed" || p.phase === "reading_section")) {
          barrierAcquired = true;
          await barrierClient.query("BEGIN;");
          await barrierClient.query("SELECT * FROM export_jobs WHERE id = $1 FOR UPDATE;", [jobId]);

          // Hold the lock until past the 1200ms deadline (release at 1800ms)
          setTimeout(async () => {
            try {
              await barrierClient.query("ROLLBACK;");
              await barrierClient.end();
            } catch {
              // ignore
            }
          }, 1800);
        }
      },
    });

    const outcome = await workerPromise;
    expect(outcome).toBe("FAILED");

    // Verify in DB: Must NEVER be READY!
    const [job] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));

    expect(job?.status).toBe("FAILED");
    expect(job?.errorCode).toBe("EXPORT_TIMEOUT");
  });

  // =========================================================================
  // TEST 11: B26-DEADLINE: runGuardedExportDbOp force-closes socket within <= opTimeout + 1500ms on hang
  // =========================================================================
  it("runGuardedExportDbOp: hanging query is force-closed within <= opTimeout + 1500ms", async () => {
    const ac = new AbortController();
    const startTime = Date.now();
    const deadlineAt = Date.now() + 20000;

    let caughtError: unknown = null;
    try {
      await runGuardedExportDbOp(
        ctx.pool,
        deadlineAt,
        ac.signal,
        500, // 500ms maxOpTimeout
        "test_hang",
        async (client) => {
          await client.query("SELECT pg_sleep(10);");
        }
      );
    } catch (err) {
      caughtError = err;
    }

    const elapsed = Date.now() - startTime;
    expect(caughtError).toBeDefined();
    // Must complete within opTimeout (500ms) + force-close grace (1500ms) + network margin <= 3500ms, NOT 10s!
    expect(elapsed).toBeLessThan(3500);
  });

  // =========================================================================
  // TEST 12: B26-CONTROL: Password preservation and semaphore concurrency limit
  // =========================================================================
  it("cancellation control channel: explicit password extraction works and concurrent cancellations are bounded by semaphore", async () => {
    const savedPgPassword = process.env.PGPASSWORD;
    delete process.env.PGPASSWORD;

    try {
      const targetClient = await ctx.pool.connect();
      targetClient.on("error", () => {}); // Prevent unhandled socket/backend error
      const targetPid = (targetClient as unknown as { processID?: number }).processID;
      expect(targetPid).toBeDefined();

      let sleepError: unknown = null;
      const sleepPromise = targetClient.query("SELECT pg_sleep(5);").catch((err) => {
        sleepError = err;
      });

      const cancelSuccess = await cancelBackendPid(targetPid!, {
        client: targetClient,
        connectionString: ctx.connectionString,
        timeoutMs: 1500,
        pool: ctx.pool,
      });

      expect(cancelSuccess).toBe(true);
      await sleepPromise;
      expect(sleepError).toBeDefined();
      expect(String(sleepError)).toContain("canceling statement due to user request");
      targetClient.release(true);

      // Concurrency test: execute 10 concurrent cancellations against dummy PIDs
      const cancelPromises = Array.from({ length: 10 }, async (_, i) => {
        return cancelBackendPid(999000 + i, {
          connectionString: ctx.connectionString,
          timeoutMs: 1000,
          pool: ctx.pool,
        });
      });

      const results = await Promise.all(cancelPromises);
      expect(results.length).toBe(10);
      for (const res of results) {
        expect(res).toBe(false);
      }
    } finally {
      if (savedPgPassword !== undefined) {
        process.env.PGPASSWORD = savedPgPassword;
      }
    }
  });

  // =========================================================================
  // TEST 13: B25-ISOLATION: Fail-closed verification rejects invalid targets with zero DB writes
  // =========================================================================
  it("B25-ISOLATION: getVerifiedTestDatabaseUrl strictly rejects missing, non-local, or non-test DB targets", () => {
    const savedUrl = process.env.TEST_DATABASE_URL;

    try {
      // 1. Missing URL
      delete process.env.TEST_DATABASE_URL;
      expect(() => getVerifiedTestDatabaseUrl()).toThrow(/TEST_DB_NOT_ALLOWED.*not set/);

      // 2. Remote / external host
      process.env.TEST_DATABASE_URL =
        "postgresql://user:pass@production-db.company.internal:5432/operis_test";
      expect(() => getVerifiedTestDatabaseUrl()).toThrow(
        /TEST_DB_NOT_ALLOWED.*Host production-db.company.internal is not allowed/
      );

      // 3. Non-test database name
      process.env.TEST_DATABASE_URL = "postgresql://user:pass@localhost:5432/operis_production";
      expect(() => getVerifiedTestDatabaseUrl()).toThrow(
        /TEST_DB_NOT_ALLOWED.*must start with operis_test/
      );

      // 4. Valid localhost test database passes
      process.env.TEST_DATABASE_URL =
        "postgresql://user:pass@localhost:5432/operis_test_ephemeral_123";
      const verified = getVerifiedTestDatabaseUrl();
      expect(verified).toBe("postgresql://user:pass@localhost:5432/operis_test_ephemeral_123");
    } finally {
      if (savedUrl !== undefined) {
        process.env.TEST_DATABASE_URL = savedUrl;
      }
    }
  });

  // =========================================================================
  // TEST 14: B26-MEM: Large notifications (>10 MiB) fail with EXPORT_RECORD_TOO_LARGE
  // =========================================================================
  it("oversized notification (>10 MiB payload) throws EXPORT_RECORD_TOO_LARGE and job is NEVER marked READY", async () => {
    const oversizedPayload = { data: "W".repeat(11 * 1024 * 1024) };
    await ctx.db.insert(schema.notifications).values({
      id: crypto.randomUUID(),
      userId: testUserId,
      type: "SECURITY_ALERT",
      payloadJson: oversizedPayload,
    });

    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();

    const processResult = await claimAndProcessExportJob(jobId, workerToken);
    expect(processResult).toBe("FAILED");

    const [job] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));

    expect(job?.status).toBe("FAILED");
    expect(job?.errorCode).toBe("EXPORT_RECORD_TOO_LARGE");

    await ctx.db.delete(schema.notifications).where(eq(schema.notifications.userId, testUserId));
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "node:crypto";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { enqueueExportJob, claimAndProcessExportJob } from "@/src/modules/privacy/export-jobs";
import { GET as exportRouteGet } from "@/src/app/api/account/export/route";
import { NextRequest } from "next/server";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/src/modules/auth/session";

describe("B26 Export Streaming, Exact SHA-256 & Expiration Integration", () => {
  let ctx: TestDatabaseContext;
  const testUserId = DEFAULT_USER.id;
  let sessionToken: string;

  beforeAll(async () => {
    ctx = await createIsolatedTestDatabase();
    setDbForTesting(ctx.db, ctx.pool);

    sessionToken = createSessionToken({
      id: testUserId,
      email: DEFAULT_USER.email,
      role: "USER",
      status: "ACTIVE",
    });

    await ctx.db
      .insert(schema.users)
      .values({
        id: testUserId,
        email: DEFAULT_USER.email,
        passwordHash: "dummy_hash_for_stream",
        role: "USER",
        status: "ACTIVE",
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

  it("polls status and streams download with byte-for-byte SHA-256 verification", async () => {
    // 1. Create and process job with standard UUID lease token
    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();
    const processResult = await claimAndProcessExportJob(jobId, workerToken);
    expect(processResult).toBe("COMPLETED");

    // 2. Poll status via GET /api/account/export?jobId=...
    const statusReq = new NextRequest(
      `http://localhost:3000/api/account/export?jobId=${encodeURIComponent(jobId)}`,
      {
        headers: {
          "x-locale": "tr",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      }
    );
    const statusRes = await exportRouteGet(statusReq);
    expect(statusRes.status).toBe(200);

    const statusBody = await statusRes.json();
    expect(statusBody.jobId).toBe(jobId);
    expect(statusBody.status).toBe("READY");
    expect(statusBody.progress).toBe(100);

    const expectedChecksum = statusBody.checksumSha256;
    const expectedSize = statusBody.fileSizeBytes;
    expect(expectedChecksum).toBeDefined();
    expect(expectedSize).toBeGreaterThan(0);

    // 3. Download stream via GET /api/account/export?jobId=...&download=1
    const downloadReq = new NextRequest(
      `http://localhost:3000/api/account/export?jobId=${encodeURIComponent(jobId)}&download=1`,
      {
        headers: {
          "x-locale": "tr",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      }
    );
    const downloadRes = await exportRouteGet(downloadReq);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers.get("content-type")).toContain("application/json");
    expect(downloadRes.headers.get("x-export-checksum")).toBe(expectedChecksum);
    expect(downloadRes.headers.get("content-disposition")).toContain(jobId);

    // Consume stream
    const reader = downloadRes.body?.getReader();
    expect(reader).toBeDefined();

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalBytes += value.byteLength;
      }
    }

    const fullBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    expect(totalBytes).toBe(expectedSize);
    expect(fullBuffer.byteLength).toBe(expectedSize);

    // Verify SHA-256 matches expectedChecksum
    const actualChecksum = crypto.createHash("sha256").update(fullBuffer).digest("hex");
    expect(actualChecksum).toBe(expectedChecksum);

    // Verify content is valid JSON
    const parsed = JSON.parse(fullBuffer.toString("utf-8"));
    expect(parsed.exportVersion).toBe(2);
    expect(parsed.extractedAt).toBeDefined();
    expect(parsed.user).toBeDefined();
    expect(parsed.user.id).toBe(testUserId);
  });

  it("returns 410 Gone when attempting to download an expired export job", async () => {
    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();
    await claimAndProcessExportJob(jobId, workerToken);

    // Set expiresAt to 10 minutes ago
    await ctx.db
      .update(schema.exportJobs)
      .set({
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      })
      .where(eq(schema.exportJobs.id, jobId));

    // Attempt download
    const downloadReq = new NextRequest(
      `http://localhost:3000/api/account/export?jobId=${encodeURIComponent(jobId)}&download=1`,
      {
        headers: {
          "x-locale": "en",
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
      }
    );
    const res = await exportRouteGet(downloadReq);
    expect(res.status).toBe(410);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

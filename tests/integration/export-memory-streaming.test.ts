import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { enqueueExportJob, claimAndProcessExportJob } from "@/src/modules/privacy/export-jobs";
import { GET as exportRouteGet } from "@/src/app/api/account/export/route";
import { NextRequest } from "next/server";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/src/modules/auth/session";

describe("Priority 3: Bounded-Memory Export Streaming & Keyset Pagination", () => {
  let ctx: TestDatabaseContext;
  const testUserId = DEFAULT_USER.id;
  let sessionToken: string;
  let testCategoryId: string;

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
        passwordHash: "dummy_hash_for_memory_test",
        role: "USER",
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    testCategoryId = crypto.randomUUID();
    await ctx.db
      .insert(schema.categories)
      .values({
        id: testCategoryId,
        key: `mem-cat-${testCategoryId}`,
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

  it("1,501 listings with identical timestamps, revisions, and unicode boundaries: exact ID set matching and <= 1MiB chunks", async () => {
    const fixedTimestamp = new Date("2026-03-01T12:00:00.000Z");
    const TOTAL_LISTINGS = 1501;
    const TOTAL_OFFERS = 501;

    // Seed 1,501 listings with batch inserts (250 at a time)
    const expectedListingIds: string[] = [];
    const listingBatches: (typeof schema.listings.$inferInsert)[][] = [];
    let currentBatch: (typeof schema.listings.$inferInsert)[] = [];

    const largeUnicodeText =
      "İş birliği ve Proje Detayları — Türkçe Karakterler (çğıöşü ÇĞİÖŞÜ) 🚀 🎯 ".repeat(20);

    for (let i = 0; i < TOTAL_LISTINGS; i++) {
      const lid = crypto.randomUUID();
      expectedListingIds.push(lid);
      currentBatch.push({
        id: lid,
        ownerUserId: testUserId,
        categoryId: testCategoryId,
        title: `Proje İlanı #${i + 1} 🎯`,
        slug: `listing-mem-${i}-${lid}`,
        summary: `Özet bilgi metni #${i + 1} - ${largeUnicodeText.slice(0, 100)}`,
        scope: largeUnicodeText,
        budgetMode: "OPEN_BID",
        timelineMode: "FLEXIBLE",
        status: "ACTIVE",
        createdAt: fixedTimestamp,
        updatedAt: fixedTimestamp,
        lastActivatedAt: fixedTimestamp,
      });

      if (currentBatch.length === 250 || i === TOTAL_LISTINGS - 1) {
        listingBatches.push(currentBatch);
        currentBatch = [];
      }
    }

    for (const batch of listingBatches) {
      await ctx.db.insert(schema.listings).values(batch);
    }

    // Seed revisions for the first 50 listings and the very last 50 listings
    const revisionListings = [...expectedListingIds.slice(0, 50), ...expectedListingIds.slice(-50)];
    const revBatches: (typeof schema.listingRevisions.$inferInsert)[] = [];
    for (const lid of revisionListings) {
      revBatches.push({
        id: crypto.randomUUID(),
        listingId: lid,
        editorUserId: testUserId,
        revisionNo: 1,
        snapshotJson: {
          title: `Revizyon Başlığı 🎯`,
          scope: `Revizyon Kapsam Metni ${largeUnicodeText.slice(0, 80)}`,
        },
        createdAt: fixedTimestamp,
      });
    }
    await ctx.db.insert(schema.listingRevisions).values(revBatches);

    // Seed 501 offers with identical timestamp, each pointing to a distinct listing
    const expectedOfferIds: string[] = [];
    const offerBatches: (typeof schema.offers.$inferInsert)[][] = [];
    let currentOfferBatch: (typeof schema.offers.$inferInsert)[] = [];

    for (let i = 0; i < TOTAL_OFFERS; i++) {
      const oid = crypto.randomUUID();
      expectedOfferIds.push(oid);
      currentOfferBatch.push({
        id: oid,
        listingId: expectedListingIds[i]!,
        offerorUserId: testUserId,
        listingActivationSeq: 0,
        budgetMin: "1500.00",
        budgetMax: "1500.00",
        budgetCurrency: "TRY",
        message: `Teklif Mesajı #${i + 1} 🚀 ${largeUnicodeText.slice(0, 120)}`,
        status: "PENDING",
        createdAt: fixedTimestamp,
        updatedAt: fixedTimestamp,
      });

      if (currentOfferBatch.length === 250 || i === TOTAL_OFFERS - 1) {
        offerBatches.push(currentOfferBatch);
        currentOfferBatch = [];
      }
    }

    for (const batch of offerBatches) {
      await ctx.db.insert(schema.offers).values(batch);
    }

    // Seed offer revisions for first 50 offers
    const offerRevBatches: (typeof schema.offerRevisions.$inferInsert)[] = [];
    for (let i = 0; i < 50; i++) {
      offerRevBatches.push({
        id: crypto.randomUUID(),
        offerId: expectedOfferIds[i]!,
        revisionNo: 1,
        snapshotJson: { message: "Güncellenmiş teklif metni" },
        createdAt: fixedTimestamp,
      });
    }
    await ctx.db.insert(schema.offerRevisions).values(offerRevBatches);

    // Measure baseline RSS before export
    if (typeof global.gc === "function") global.gc();
    const rssBefore = process.memoryUsage().rss;

    // Enqueue and process export job
    const { jobId } = await enqueueExportJob(testUserId);
    const workerToken = crypto.randomUUID();
    const processResult = await claimAndProcessExportJob(jobId, workerToken);
    expect(processResult).toBe("COMPLETED");

    // Measure RSS after processing
    const rssAfter = process.memoryUsage().rss;
    const rssDiffMb = (rssAfter - rssBefore) / (1024 * 1024);

    // Verify DB Job State
    const [job] = await ctx.db
      .select()
      .from(schema.exportJobs)
      .where(eq(schema.exportJobs.id, jobId));
    expect(job?.status).toBe("READY");
    expect(job?.progress).toBe(100);
    expect(job?.partCount).toBeGreaterThan(1); // Multiple chunks generated
    expect(job?.fileSizeBytes).toBeGreaterThan(1024 * 1024); // Exceeds 1 MiB total

    // Verify all parts in DB are <= 1 MiB and strictly sequential
    const parts = await ctx.db
      .select()
      .from(schema.exportJobParts)
      .where(eq(schema.exportJobParts.jobId, jobId))
      .orderBy(schema.exportJobParts.partNo);

    expect(parts.length).toBe(job?.partCount);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]!;
      expect(p.partNo).toBe(i + 1); // Strictly sequential: 1, 2, 3...
      expect(p.byteLength).toBeLessThanOrEqual(1024 * 1024); // <= 1 MiB
      expect(p.payloadEnc.startsWith("v2:")).toBe(true);
    }

    // Download and verify stream via GET endpoint
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

    const fullBlob = await downloadRes.arrayBuffer();
    const fullBuffer = Buffer.from(fullBlob);

    // Verify total size and SHA-256 byte-for-byte
    expect(fullBuffer.length).toBe(job?.fileSizeBytes);
    const downloadedSha256 = crypto.createHash("sha256").update(fullBuffer).digest("hex");
    expect(downloadedSha256).toBe(job?.checksumSha256);

    // Parse JSON and verify exact ID sets
    const exportedJson = JSON.parse(fullBuffer.toString("utf8"));
    expect(exportedJson.exportVersion).toBe(2);
    expect(exportedJson.extractedAt).toBeDefined();

    // Verify listings
    const exportedListings: Array<{ id: string }> = exportedJson.listings || [];
    expect(exportedListings.length).toBe(TOTAL_LISTINGS);

    const downloadedListingIdSet = new Set(exportedListings.map((l) => l.id));
    expect(downloadedListingIdSet.size).toBe(TOTAL_LISTINGS);

    for (const expectedId of expectedListingIds) {
      expect(downloadedListingIdSet.has(expectedId)).toBe(true);
    }

    // Verify offers
    const exportedOffers: Array<{ id: string }> = exportedJson.offers || [];
    expect(exportedOffers.length).toBe(TOTAL_OFFERS);

    const downloadedOfferIdSet = new Set(exportedOffers.map((o) => o.id));
    for (const expectedId of expectedOfferIds) {
      expect(downloadedOfferIdSet.has(expectedId)).toBe(true);
    }

    // Verify revisions
    const exportedListingRevs: Array<{ id: string; listingId: string }> =
      exportedJson.listingRevisions || [];
    expect(exportedListingRevs.length).toBe(revisionListings.length);

    // Bounded memory check: RSS increase during 1,501 records is bounded (< 100 MB)
    expect(rssDiffMb).toBeLessThan(100);
  });
});

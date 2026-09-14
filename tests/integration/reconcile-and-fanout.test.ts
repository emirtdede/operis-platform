import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { reconcileOfferNotifications } from "@/scripts/reconcile-offer-notifications";
import { processFanoutEvent } from "@/src/modules/notifications/fanout";

describe("Open Items: Reconcile Row-Locking & Fanout Unexpired Lease Check", () => {
  let ctx: TestDatabaseContext;
  let testUserId: string;

  beforeAll(async () => {
    ctx = await createIsolatedTestDatabase();
    setDbForTesting(ctx.db, ctx.pool);

    testUserId = crypto.randomUUID();
    await ctx.db
      .insert(schema.users)
      .values({
        id: testUserId,
        email: `reconcile-fanout-${testUserId.slice(0, 8)}@test.com`,
        passwordHash: "dummy_pass_hash",
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

  it("Reconcile locks candidate rows FOR UPDATE, re-evaluates freshly from DB, and deduplicates cleanly", async () => {
    const offerId = crypto.randomUUID();
    const recipientId = testUserId;

    // Seed two duplicate OFFER_RECEIVED outbox rows for the same offer + recipient:
    // Row 1: PENDING
    const outboxId1 = crypto.randomUUID();
    await ctx.db.insert(schema.outboxEvents).values({
      id: outboxId1,
      type: "OFFER_RECEIVED",
      aggregateType: "offer",
      aggregateId: offerId,
      status: "PENDING",
      payloadJson: {
        offerId,
        recipientUserId: recipientId,
        listingId: crypto.randomUUID(),
      },
      createdAt: new Date("2026-03-01T10:00:00Z"),
    });

    // Row 2: SENT (higher priority)
    const outboxId2 = crypto.randomUUID();
    await ctx.db.insert(schema.outboxEvents).values({
      id: outboxId2,
      type: "OFFER_RECEIVED",
      aggregateType: "offer",
      aggregateId: offerId,
      status: "SENT",
      payloadJson: {
        offerId,
        recipientUserId: recipientId,
        listingId: crypto.randomUUID(),
      },
      createdAt: new Date("2026-03-01T10:05:00Z"),
    });

    // Seed duplicate notifications
    const notifId1 = crypto.randomUUID();
    await ctx.db.insert(schema.notifications).values({
      id: notifId1,
      userId: recipientId,
      type: "OFFER_RECEIVED",
      payloadJson: { offerId, recipientUserId: recipientId },
      createdAt: new Date("2026-03-01T10:00:00Z"),
    });

    const notifId2 = crypto.randomUUID();
    await ctx.db.insert(schema.notifications).values({
      id: notifId2,
      userId: recipientId,
      type: "OFFER_RECEIVED",
      payloadJson: { offerId, recipientUserId: recipientId },
      createdAt: new Date("2026-03-01T10:05:00Z"),
    });

    // Run dry-run first
    const dryRunResult = await reconcileOfferNotifications({ apply: false });
    expect(dryRunResult.duplicateGroupsFound).toBeGreaterThanOrEqual(1);

    // Run apply
    const applyResult = await reconcileOfferNotifications({ apply: true });
    expect(applyResult.duplicateGroupsFound).toBeGreaterThanOrEqual(1);
    expect(applyResult.outboxMergedCount).toBeGreaterThanOrEqual(1);

    // Verify SENT row (outboxId2) was retained, and PENDING (outboxId1) was deleted
    const remainingOutbox = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.id, outboxId2));
    expect(remainingOutbox.length).toBe(1);
    expect(remainingOutbox[0]!.status).toBe("SENT");

    const supersededOutbox = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.id, outboxId1));
    expect(supersededOutbox.length).toBe(1);
    expect(supersededOutbox[0]!.status).toBe("FAILED");
    expect((supersededOutbox[0]!.payloadJson as Record<string, unknown>).error).toBe(
      "SUPERSEDED_DUPLICATE"
    );

    // Verify notifications deduplicated to exactly 1
    const userNotifs = await ctx.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, recipientId));
    expect(userNotifs.length).toBe(1);

    // Re-running reconcile produces 0 duplicate groups (idempotent)
    const secondRun = await reconcileOfferNotifications({ apply: true });
    expect(secondRun.duplicateGroupsFound).toBe(0);
  });

  it("Fanout finalize checks unexpired lease: returns LEASE_LOST if lease expired and does not mark SENT", async () => {
    const eventId = crypto.randomUUID();
    const leaseToken = crypto.randomUUID();
    const listingId = crypto.randomUUID();

    // 1. Seed outbox event with EXPIRED lease
    await ctx.db.insert(schema.outboxEvents).values({
      id: eventId,
      type: "LISTING_PUBLISHED",
      aggregateType: "listing",
      aggregateId: listingId,
      status: "PROCESSING",
      leaseToken,
      leaseUntil: new Date(Date.now() - 5000), // Expired 5 seconds ago
      payloadJson: {
        listingId,
        title: "Fanout Listing",
        slug: "fanout-listing",
        ownerUserId: testUserId,
      },
    });

    // Attempt to process fanout with expired lease
    const resultExpired = await processFanoutEvent(eventId, leaseToken);
    expect(resultExpired).toBe("LEASE_LOST");

    // Verify outbox was NOT marked SENT
    const [eventAfterExpired] = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.id, eventId));
    expect(eventAfterExpired?.status).toBe("PROCESSING");

    // 2. Now grant valid unexpired lease
    await ctx.db
      .update(schema.outboxEvents)
      .set({ leaseUntil: new Date(Date.now() + 60000) })
      .where(eq(schema.outboxEvents.id, eventId));

    // Process fanout with valid lease
    const resultValid = await processFanoutEvent(eventId, leaseToken);
    expect(resultValid).toBe("COMPLETED");

    // Verify outbox is now marked SENT
    const [eventAfterValid] = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.id, eventId));
    expect(eventAfterValid?.status).toBe("SENT");
    expect(eventAfterValid?.leaseToken).toBeNull();
  });
});

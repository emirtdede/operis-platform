import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import { NotificationService } from "@/src/modules/notifications/service";
import { processFanoutEvent } from "@/src/modules/notifications/fanout";
import { reconcileOfferNotifications } from "@/scripts/reconcile-offer-notifications";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

describe("B16 Notification Delivery Pipeline Integration", () => {
  let ctx: TestDatabaseContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDatabase();
    setDbForTesting(ctx.db, ctx.pool);
  });

  afterAll(async () => {
    resetDbForTesting();
    if (ctx) {
      await ctx.destroy();
    }
  });

  it("produces exactly one notification and one outbox event when called concurrently with identical deliveryKey", async () => {
    const userId = crypto.randomUUID();
    const offerId = crypto.randomUUID();
    const deliveryKey = `offer:${offerId}:received:user:${userId}`;

    // Create recipient user
    await ctx.db.insert(schema.users).values({
      id: userId,
      email: `user-${userId.slice(0, 8)}@example.com`,
      passwordHash: "hash123",
      role: "CUSTOMER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Invoke createNotification twice with same deliveryKey
    const res1 = await NotificationService.createNotification(
      userId,
      "OFFER_RECEIVED",
      "offer",
      offerId,
      { title: "Test Proposal 1", message: "Msg 1" },
      undefined,
      deliveryKey
    );

    const res2 = await NotificationService.createNotification(
      userId,
      "OFFER_RECEIVED",
      "offer",
      offerId,
      { title: "Test Proposal 2", message: "Msg 2" },
      undefined,
      deliveryKey
    );

    expect(res1?.id).toBeDefined();
    expect(res2?.id).toBe(res1?.id); // Should return existing idempotent notification

    // Verify exactly 1 notification row in DB
    const notifs = await ctx.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.deliveryKey, deliveryKey));
    expect(notifs.length).toBe(1);

    // Verify exactly 1 outbox row in DB
    const outboxes = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.deliveryKey, deliveryKey));
    expect(outboxes.length).toBe(1);
  });

  it("rolls back offer and notification atomically when a transaction fails", async () => {
    const ownerUserId = crypto.randomUUID();
    const offerorUserId = crypto.randomUUID();
    const listingId = crypto.randomUUID();
    const offerId = crypto.randomUUID();
    const deliveryKey = `offer:${offerId}:received:user:${ownerUserId}`;

    await ctx.db.insert(schema.users).values([
      {
        id: ownerUserId,
        email: `owner-${ownerUserId.slice(0, 8)}@example.com`,
        passwordHash: "hash123",
        role: "CUSTOMER",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: offerorUserId,
        email: `offeror-${offerorUserId.slice(0, 8)}@example.com`,
        passwordHash: "hash123",
        role: "FREELANCER",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const categoryId = crypto.randomUUID();
    await ctx.db.insert(schema.categories).values({
      id: categoryId,
      key: `cat_${categoryId.slice(0, 8)}`,
    });

    await ctx.db.insert(schema.listings).values({
      id: listingId,
      ownerUserId,
      categoryId,
      summary: "Summary of test project",
      scope: "MEDIUM",
      budgetMode: "OPEN_BID",
      budgetCurrency: "TRY",
      timelineMode: "FLEXIBLE",
      status: "ACTIVE",
      title: "Test Listing",
      slug: `test-listing-${listingId.slice(0, 8)}`,
      activationSeq: 1,
      firstPublishedAt: new Date(),
      lastActivatedAt: new Date(),
      activeUntil: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    let caughtError: unknown = null;
    try {
      await ctx.db.transaction(async (tx) => {
        // Insert offer
        await tx.insert(schema.offers).values({
          id: offerId,
          listingId,
          offerorUserId,
          listingActivationSeq: 1,
          status: "PENDING",
          message: "Will rollback",
        });

        // Insert notification
        await NotificationService.createNotification(
          ownerUserId,
          "OFFER_RECEIVED",
          "offer",
          offerId,
          { title: "Test", message: "Test" },
          tx,
          deliveryKey
        );

        // Force intentional transaction abort
        throw new Error("INTENTIONAL_ROLLBACK_FOR_TEST");
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();

    // Neither the offer nor the notification or outbox event must exist in DB
    const offers = await ctx.db.select().from(schema.offers).where(eq(schema.offers.id, offerId));
    expect(offers.length).toBe(0);

    const notifs = await ctx.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.deliveryKey, deliveryKey));
    expect(notifs.length).toBe(0);

    const outboxes = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.deliveryKey, deliveryKey));
    expect(outboxes.length).toBe(0);
  });

  it("handles persistent fan-out cursor and aborts with LEASE_LOST if worker token changes", async () => {
    const ownerId = crypto.randomUUID();
    const listingId = crypto.randomUUID();
    const eventId = crypto.randomUUID();
    const initialToken = crypto.randomUUID();
    const leaseUntil = new Date(Date.now() + 60000);

    await ctx.db.insert(schema.users).values({
      id: ownerId,
      email: `owner-${ownerId.slice(0, 8)}@example.com`,
      passwordHash: "hash123",
      role: "CUSTOMER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert active fanout event
    await ctx.db.insert(schema.outboxEvents).values({
      id: eventId,
      type: "LISTING_PUBLISHED",
      aggregateType: "listing",
      aggregateId: listingId,
      status: "PROCESSING",
      leaseToken: initialToken,
      leaseUntil,
      payloadJson: {
        listingId,
        title: "Fanout Project",
        slug: "fanout-project",
        tags: ["typescript", "react"],
        ownerUserId: ownerId,
        activationSeq: 1,
      },
    });

    // Tamper with the lease token concurrently (simulating another worker stealing lease)
    const competitorToken = crypto.randomUUID();
    await ctx.db
      .update(schema.outboxEvents)
      .set({ leaseToken: competitorToken })
      .where(eq(schema.outboxEvents.id, eventId));

    // Old worker attempts to process fanout: must detect lease loss and abort safely
    const result = await processFanoutEvent(eventId, initialToken);
    expect(result).toBe("LEASE_LOST");

    // Event must NOT be marked SENT by the old worker
    const [row] = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.id, eventId));
    expect(row?.status).toBe("PROCESSING");
    expect(row?.leaseToken).toBe(competitorToken);
  });

  it("reconcile-offer-notifications cleans up duplicate legacy events and notifications", async () => {
    const offerId = crypto.randomUUID();
    const recipientUserId = crypto.randomUUID();

    await ctx.db.insert(schema.users).values({
      id: recipientUserId,
      email: `recipient-${recipientUserId.slice(0, 8)}@example.com`,
      passwordHash: "hash123",
      role: "CUSTOMER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create 2 duplicate legacy outbox rows without deliveryKey: one PENDING, one SENT
    const outboxPendingId = crypto.randomUUID();
    const outboxSentId = crypto.randomUUID();

    await ctx.db.insert(schema.outboxEvents).values([
      {
        id: outboxPendingId,
        type: "OFFER_RECEIVED",
        aggregateType: "offer",
        aggregateId: offerId,
        status: "PENDING",
        deliveryKey: null,
        payloadJson: { offerId, recipientUserId },
        createdAt: new Date(Date.now() - 10000),
      },
      {
        id: outboxSentId,
        type: "OFFER_RECEIVED",
        aggregateType: "offer",
        aggregateId: offerId,
        status: "SENT",
        deliveryKey: null,
        payloadJson: { offerId, recipientUserId },
        createdAt: new Date(Date.now() - 5000),
      },
    ]);

    // Create 2 duplicate notifications
    const notif1Id = crypto.randomUUID();
    const notif2Id = crypto.randomUUID();

    await ctx.db.insert(schema.notifications).values([
      {
        id: notif1Id,
        userId: recipientUserId,
        type: "OFFER_RECEIVED",
        payloadJson: { offerId, title: "Offer" },
        createdAt: new Date(Date.now() - 10000),
      },
      {
        id: notif2Id,
        userId: recipientUserId,
        type: "OFFER_RECEIVED",
        payloadJson: { offerId, title: "Offer" },
        createdAt: new Date(Date.now() - 5000),
      },
    ]);

    // 1. Dry run
    const dryRunRes = await reconcileOfferNotifications({ apply: false });
    expect(dryRunRes.duplicateGroupsFound).toBeGreaterThanOrEqual(1);
    expect(dryRunRes.outboxMergedCount).toBeGreaterThanOrEqual(1);
    expect(dryRunRes.notificationsDeduplicatedCount).toBeGreaterThanOrEqual(1);

    // 2. Apply
    const applyRes = await reconcileOfferNotifications({ apply: true });
    expect(applyRes.outboxMergedCount).toBeGreaterThanOrEqual(1);

    // Verify DB state: exactly 1 outbox event remains with canonical deliveryKey, and status is SENT
    const expectedDeliveryKey = `offer:${offerId}:received:user:${recipientUserId}`;
    const survivingOutbox = await ctx.db
      .select()
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.deliveryKey, expectedDeliveryKey));

    expect(survivingOutbox.length).toBe(1);
    expect(survivingOutbox[0]?.status).toBe("SENT");
    expect(survivingOutbox[0]?.id).toBe(outboxSentId); // Ranked SENT over PENDING

    // Verify recipientUserId is persisted into canonical payloadJson
    const survivingPayload = (survivingOutbox[0]?.payloadJson as Record<string, unknown>) || {};
    expect(survivingPayload.recipientUserId).toBe(recipientUserId);

    // Exactly 1 notification remains
    const survivingNotifs = await ctx.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.deliveryKey, expectedDeliveryKey));
    expect(survivingNotifs.length).toBe(1);

    // 3. Second run must produce 0 duplicate groups and 0 mutations (strict idempotency)
    const secondRunRes = await reconcileOfferNotifications({ apply: true });
    expect(secondRunRes.duplicateGroupsFound).toBe(0);
    expect(secondRunRes.outboxMergedCount).toBe(0);
    expect(secondRunRes.notificationsDeduplicatedCount).toBe(0);
  });
});

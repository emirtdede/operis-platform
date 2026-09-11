import { and, desc, eq, isNull, lte, or } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { EmailAdapter } from "@/src/lib/email";

import { inMemoryFallbackNotifications } from "./in-memory";

export type NotificationType =
  | "EMAIL_VERIFIED"
  | "PHONE_VERIFIED"
  | "OFFER_RECEIVED"
  | "OFFER_UPDATED"
  | "OFFER_REJECTED"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED_OTHER_SELECTED"
  | "OFFER_EXPIRED_LISTING"
  | "LISTING_EXPIRING_SOON"
  | "LISTING_EXPIRED"
  | "LISTING_REACTIVATED"
  | "COMPLETION_REQUESTED"
  | "COMPLETION_CONFIRMED"
  | "COMPLETION_DISPUTED"
  | "MATCH_MUTUALLY_CANCELLED"
  | "SECURITY_EVENT"
  | "MODERATION_ACTION"
  | "RADAR_MATCH"
  | "ENDORSEMENT_RECEIVED"
  | "OFFER_WITHDRAWN";

export class NotificationService {
  /**
   * Creates an in-app notification and queues an idempotent outbox event for delivery.
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, unknown>
  ) {
    try {
      const db = getDb();

      return await db.transaction(async (tx) => {
        const [notification] = await tx
          .insert(schema.notifications)
          .values({
            userId,
            type,
            payloadJson: payload,
          })
          .returning();

        if (!notification) {
          throw new Error("Failed to create notification");
        }

        await tx.insert(schema.outboxEvents).values({
          type,
          aggregateType,
          aggregateId,
          payloadJson: {
            ...payload,
            recipientUserId: userId,
            notificationId: notification.id,
          },
          status: "PENDING",
          attemptCount: 0,
          nextAttemptAt: new Date(),
        });

        return notification;
      });
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      const newNotif = {
        id: `notif-dyn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId,
        type,
        payloadJson: payload,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      inMemoryFallbackNotifications.unshift(newNotif);
      return {
        id: newNotif.id,
        userId,
        type,
        payloadJson: payload,
        readAt: null,
        createdAt: new Date(newNotif.createdAt),
      };
    }
  }

  /**
   * Retrieves notifications for a user with unread filter and pagination.
   */
  static async getUserNotifications(userId: string, unreadOnly = false, limit = 20) {
    try {
      const db = getDb();

      const conditions = [eq(schema.notifications.userId, userId)];
      if (unreadOnly) {
        conditions.push(isNull(schema.notifications.readAt));
      }

      const rows = await db
        .select()
        .from(schema.notifications)
        .where(and(...conditions))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit);

      return rows;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      let list = inMemoryFallbackNotifications;
      if (unreadOnly) {
        list = list.filter((n) => !n.readAt);
      }
      return list.slice(0, limit).map((n) => ({
        id: n.id,
        userId,
        type: n.type,
        payloadJson: n.payloadJson,
        readAt: n.readAt ? new Date(n.readAt) : null,
        createdAt: new Date(n.createdAt),
      }));
    }
  }

  /**
   * Marks a notification as read.
   */
  static async markAsRead(userId: string, notificationId: string) {
    try {
      const db = getDb();

      const [updated] = await db
        .update(schema.notifications)
        .set({ readAt: new Date() })
        .where(
          and(eq(schema.notifications.id, notificationId), eq(schema.notifications.userId, userId))
        )
        .returning();

      return updated ?? null;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      const item = inMemoryFallbackNotifications.find((n) => n.id === notificationId);
      if (item) {
        item.readAt = new Date().toISOString();
        return {
          id: item.id,
          userId,
          type: item.type,
          payloadJson: item.payloadJson,
          readAt: new Date(item.readAt),
          createdAt: new Date(item.createdAt),
        };
      }
      return null;
    }
  }

  /**
   * Marks all unread notifications as read for a user.
   */
  static async markAllAsRead(userId: string) {
    try {
      const db = getDb();

      await db
        .update(schema.notifications)
        .set({ readAt: new Date() })
        .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));

      return true;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      const nowIso = new Date().toISOString();
      for (const n of inMemoryFallbackNotifications) {
        if (!n.readAt) {
          n.readAt = nowIso;
        }
      }
      return true;
    }
  }

  /**
   * Worker job to process outbox events using exponential backoff.
   * Dispatches transactional emails via EmailAdapter with zero PII leakage.
   */
  static async processOutboxBatch(batchSize = 25) {
    try {
      const db = getDb();
      const now = new Date();
      const leaseThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5-minute lease timeout

      const pendingEvents = await db
        .select()
        .from(schema.outboxEvents)
        .where(
          or(
            and(
              eq(schema.outboxEvents.status, "PENDING"),
              lte(schema.outboxEvents.nextAttemptAt, now)
            ),
            and(
              eq(schema.outboxEvents.status, "PROCESSING"),
              lte(schema.outboxEvents.nextAttemptAt, leaseThreshold)
            )
          )
        )
        .limit(batchSize);

      let processedCount = 0;

      for (const event of pendingEvents) {
        // Atomically claim the event by transitioning PENDING/stuck PROCESSING -> PROCESSING
        const claimResult = await db
          .update(schema.outboxEvents)
          .set({
            status: "PROCESSING",
            nextAttemptAt: now, // Heartbeat lease timestamp
          })
          .where(
            and(
              eq(schema.outboxEvents.id, event.id),
              or(
                eq(schema.outboxEvents.status, "PENDING"),
                and(
                  eq(schema.outboxEvents.status, "PROCESSING"),
                  lte(schema.outboxEvents.nextAttemptAt, leaseThreshold)
                )
              )
            )
          )
          .returning({ id: schema.outboxEvents.id });

        if (claimResult.length === 0) {
          // Another worker claimed this event concurrently, skip it
          continue;
        }

        try {
          const payload = event.payloadJson as Record<string, unknown>;
          const recipientUserId = payload.recipientUserId as string | undefined;

          if (recipientUserId) {
            // Fetch recipient email and locale
            const userRows = await db
              .select({
                email: schema.users.email,
                locale: schema.profiles.locale,
              })
              .from(schema.users)
              .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
              .where(eq(schema.users.id, recipientUserId))
              .limit(1);

            const user = userRows[0];
            if (user) {
              const locale = user.locale === "en" ? "en" : "tr";
              const customTitle = typeof payload.title === "string" ? payload.title : null;
              const customMessage = typeof payload.message === "string" ? payload.message : null;

              const subject =
                customTitle ||
                (locale === "tr"
                  ? `Platform Bildirimi: ${event.type}`
                  : `Platform Notification: ${event.type}`);

              const body = customMessage
                ? locale === "tr"
                  ? `Merhaba,\n\n${customMessage}\n\nDetayları Operis platformu üzerinden görüntüleyebilirsiniz.`
                  : `Hello,\n\n${customMessage}\n\nYou can view full details on the Operis platform.`
                : locale === "tr"
                  ? `Merhaba,\n\nHesabınızda yeni bir işlem gerçekleşti: ${event.type}.\nDetayları platform üzerinden görüntüleyebilirsiniz.`
                  : `Hello,\n\nA new activity occurred on your account: ${event.type}.\nYou can view details on the platform.`;

              const sentOk = await EmailAdapter.sendTransactionalEmail({
                to: user.email,
                subject,
                body,
                template: event.type.toLowerCase(),
                locale,
                idempotencyKey: `outbox_${event.id}`,
              });

              if (!sentOk) {
                throw new Error(`Email provider failed for outbox event ${event.id}`);
              }
            }
          }

          // Mark SENT
          await db
            .update(schema.outboxEvents)
            .set({
              status: "SENT",
              attemptCount: event.attemptCount + 1,
            })
            .where(eq(schema.outboxEvents.id, event.id));

          processedCount++;
        } catch {
        const nextAttempts = event.attemptCount + 1;
        const isDead = nextAttempts >= 5;

        // Exponential backoff in seconds: 2^attempt * 30s
        const backoffSeconds = Math.pow(2, nextAttempts) * 30;
        const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000);

        await db
          .update(schema.outboxEvents)
          .set({
            status: isDead ? "DEAD" : "PENDING",
            attemptCount: nextAttempts,
            nextAttemptAt,
          })
          .where(eq(schema.outboxEvents.id, event.id));
      }
    }

    return processedCount;
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
    return 0;
  }
}
}

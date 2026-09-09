import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { EmailAdapter } from "@/src/lib/email";

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
  | "MODERATION_ACTION";

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
  }

  /**
   * Retrieves notifications for a user with unread filter and pagination.
   */
  static async getUserNotifications(
    userId: string,
    unreadOnly = false,
    limit = 20
  ) {
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
  }

  /**
   * Marks a notification as read.
   */
  static async markAsRead(userId: string, notificationId: string) {
    const db = getDb();

    const [updated] = await db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, userId)
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Marks all unread notifications as read for a user.
   */
  static async markAllAsRead(userId: string) {
    const db = getDb();

    await db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.readAt)
        )
      );

    return true;
  }

  /**
   * Worker job to process outbox events using exponential backoff.
   * Dispatches transactional emails via EmailAdapter with zero PII leakage.
   */
  static async processOutboxBatch(batchSize = 25) {
    const db = getDb();
    const now = new Date();

    const pendingEvents = await db
      .select()
      .from(schema.outboxEvents)
      .where(
        and(
          eq(schema.outboxEvents.status, "PENDING"),
          lte(schema.outboxEvents.nextAttemptAt, now)
        )
      )
      .limit(batchSize);

    let processedCount = 0;

    for (const event of pendingEvents) {
      // Mark as PROCESSING
      await db
        .update(schema.outboxEvents)
        .set({ status: "PROCESSING" })
        .where(eq(schema.outboxEvents.id, event.id));

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
            .innerJoin(
              schema.profiles,
              eq(schema.users.id, schema.profiles.userId)
            )
            .where(eq(schema.users.id, recipientUserId))
            .limit(1);

          const user = userRows[0];
          if (user) {
            const locale = user.locale === "en" ? "en" : "tr";
            const subject =
              locale === "tr"
                ? `Platform Bildirimi: ${event.type}`
                : `Platform Notification: ${event.type}`;
            const body =
              locale === "tr"
                ? `Merhaba,\n\nHesabınızda yeni bir işlem gerçekleşti: ${event.type}.\nDetayları platform üzerinden görüntüleyebilirsiniz.`
                : `Hello,\n\nA new activity occurred on your account: ${event.type}.\nYou can view details on the platform.`;

            await EmailAdapter.sendTransactionalEmail({
              to: user.email,
              subject,
              body,
            });
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
  }
}

import { count, desc, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";

export class AdminService {
  /**
   * Retrieves operational metrics without exposing unnecessary PII.
   */
  static async getDashboardMetrics() {
    const db = getDb();
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [activeListingsRow] = await db
      .select({ val: count() })
      .from(schema.listings)
      .where(eq(schema.listings.status, "ACTIVE"));

    const [expired24hRow] = await db
      .select({ val: count() })
      .from(schema.listings)
      .where(
        sql`${schema.listings.status} = 'INACTIVE_EXPIRED' AND ${schema.listings.updatedAt} >= ${past24h}`
      );

    const [offers24hRow] = await db
      .select({ val: count() })
      .from(schema.offers)
      .where(gt(schema.offers.createdAt, past24h));

    const [matches24hRow] = await db
      .select({ val: count() })
      .from(schema.engagements)
      .where(gt(schema.engagements.matchedAt, past24h));

    const [openReportsRow] = await db
      .select({ val: count() })
      .from(schema.reports)
      .where(eq(schema.reports.status, "OPEN"));

    const [suspendedUsersRow] = await db
      .select({ val: count() })
      .from(schema.users)
      .where(eq(schema.users.status, "SUSPENDED"));

    const [deadOutboxRow] = await db
      .select({ val: count() })
      .from(schema.outboxEvents)
      .where(eq(schema.outboxEvents.status, "DEAD"));

    return {
      activeListings: activeListingsRow?.val ?? 0,
      expiredListingsLast24h: expired24hRow?.val ?? 0,
      offersLast24h: offers24hRow?.val ?? 0,
      matchesLast24h: matches24hRow?.val ?? 0,
      openReports: openReportsRow?.val ?? 0,
      suspendedUsers: suspendedUsersRow?.val ?? 0,
      deadLetters: deadOutboxRow?.val ?? 0,
    };
  }

  /**
   * Moderates a user account with mandatory audit logging.
   */
  static async moderateUser(
    adminUserId: string,
    targetUserId: string,
    action: "SUSPEND" | "UNSUSPEND" | "WARN",
    reason: string
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new Error("A reason is strictly required for moderation actions");
    }

    const db = getDb();
    const newStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";

    return await db.transaction(async (tx) => {
      const [updatedUser] = await tx
        .update(schema.users)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, targetUserId))
        .returning();

      await tx.insert(schema.adminAuditLog).values({
        adminUserId,
        action: `USER_${action}`,
        targetType: "user",
        targetId: targetUserId,
        reasonCode: "ADMIN_ACTION",
        safeSummary: reason,
      });

      return updatedUser;
    });
  }

  /**
   * Moderates a listing (e.g. HIDE or UNHIDE or DEACTIVATE) with mandatory audit logging.
   */
  static async moderateListing(
    adminUserId: string,
    listingId: string,
    action: "HIDE" | "UNHIDE" | "DEACTIVATE",
    reason: string
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new Error("A reason is strictly required for moderation actions");
    }

    const db = getDb();
    const targetStatus =
      action === "HIDE"
        ? "HIDDEN_MODERATION"
        : action === "DEACTIVATE"
        ? "INACTIVE_OWNER"
        : "ACTIVE";

    return await db.transaction(async (tx) => {
      const [updatedListing] = await tx
        .update(schema.listings)
        .set({
          status: targetStatus,
          updatedAt: new Date(),
        })
        .where(eq(schema.listings.id, listingId))
        .returning();

      await tx.insert(schema.adminAuditLog).values({
        adminUserId,
        action: `LISTING_${action}`,
        targetType: "listing",
        targetId: listingId,
        reasonCode: "ADMIN_ACTION",
        safeSummary: reason,
      });

      return updatedListing;
    });
  }

  /**
   * Retrieves administrative audit logs.
   */
  static async getAuditLogs(limit = 50) {
    const db = getDb();

    return await db
      .select()
      .from(schema.adminAuditLog)
      .orderBy(desc(schema.adminAuditLog.createdAt))
      .limit(limit);
  }
}

import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { inMemoryListings } from "@/src/modules/listings/service";
import { inMemorySentOffers, inMemoryReceivedOffers } from "@/src/modules/offers/service";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

export class PrivacyService {
  /**
   * Deletes and de-identifies a user account according to KVKK/GDPR data minimization
   * and retention baseline (§19, §28).
   * Relational integrity of historical completed engagements is preserved while
   * all direct identifiers and PII are permanently purged.
   */
  static async deleteAccount(userId: string, reason?: string) {
    const now = new Date();

    try {
      const db = getDb();

      return await db.transaction(async (tx) => {
      // 1. Verify user exists and is not already deleted
      const userRows = await tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      const user = userRows[0];
      if (!user) {
        throw new Error("User not found");
      }

      if (user.status === "DELETED") {
        throw new Error("Account is already deleted");
      }

      // 1b. Check for active ongoing engagements
      const activeEngagements = await tx
        .select({ id: schema.engagements.id })
        .from(schema.engagements)
        .where(
          and(
            or(
              eq(schema.engagements.ownerUserId, user.id),
              eq(schema.engagements.freelancerUserId, user.id)
            ),
            inArray(schema.engagements.status, ["MATCHED", "COMPLETION_PENDING", "DISPUTED"])
          )
        )
        .limit(1);

      if (activeEngagements.length > 0) {
        throw new Error(
          "Aktif, uyuşmazlık incelemesinde veya tamamlanması beklenen iş birlikleriniz bulunurken hesabınızı silemezsiniz. Lütfen önce projelerinizi sonuçlandırın."
        );
      }

      // 2. Mark user status as DELETED, scramble email, and purge 2FA credentials
      const anonymizedEmail = `deleted-${user.id.slice(0, 8)}@deleted.internal`;
      await tx
        .update(schema.users)
        .set({
          status: "DELETED",
          email: anonymizedEmail,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          emailVerified: false,
          updatedAt: now,
        })
        .where(eq(schema.users.id, user.id));

      // 3. Purge PII from user_private_identity
      await tx
        .update(schema.userPrivateIdentity)
        .set({
          legalFirstNameEnc: "DELETED",
          legalLastNameEnc: "DELETED",
          phoneE164Enc: "DELETED",
          phoneHmac: `DELETED_${user.id}`,
          dateOfBirthEnc: "DELETED",
          city: "DELETED",
          updatedAt: now,
        })
        .where(eq(schema.userPrivateIdentity.userId, user.id));

      // 4. Anonymize profile to "Former user"
      await tx
        .update(schema.profiles)
        .set({
          displayName: "Former user",
          handle: `deleted-${user.id.slice(0, 8)}`,
          about: null,
          avatarUrl: null,
          trackedSkills: [],
          showLocation: false,
          revealPhoneAfterMatch: false,
          updatedAt: now,
        })
        .where(eq(schema.profiles.userId, user.id));

      // 5. Delete profile links and category follows
      await tx.delete(schema.profileLinks).where(eq(schema.profileLinks.userId, user.id));

      await tx.delete(schema.categoryFollows).where(eq(schema.categoryFollows.userId, user.id));

      // 6. Delete active and draft listings owned by user
      const userListings = await tx
        .select({
          id: schema.listings.id,
          status: schema.listings.status,
          activationSeq: schema.listings.activationSeq,
        })
        .from(schema.listings)
        .where(
          and(
            eq(schema.listings.ownerUserId, user.id),
            inArray(schema.listings.status, [
              "DRAFT",
              "ACTIVE",
              "INACTIVE_EXPIRED",
              "INACTIVE_OWNER",
            ])
          )
        );

      for (const listing of userListings) {
        await tx
          .update(schema.listings)
          .set({
            status: "DELETED",
            deletedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.listings.id, listing.id));

        // Expire any pending offers on this deleted listing
        await tx
          .update(schema.offers)
          .set({
            status: "EXPIRED_LISTING_INACTIVE",
            resolvedAt: now,
            updatedAt: now,
          })
          .where(
            and(eq(schema.offers.listingId, listing.id), eq(schema.offers.status, "PENDING"))
          );

        await tx.insert(schema.listingStatusEvents).values({
          listingId: listing.id,
          fromStatus: listing.status,
          toStatus: "DELETED",
          reason: "ACCOUNT_DELETED",
          actorType: "USER",
          actorId: user.id,
          activationSeq: listing.activationSeq,
        });
      }

      // 7. Withdraw any active pending offers submitted by user
      await tx
        .update(schema.offers)
        .set({
          status: "WITHDRAWN",
          resolvedAt: now,
          updatedAt: now,
        })
        .where(and(eq(schema.offers.offerorUserId, user.id), eq(schema.offers.status, "PENDING")));

      // 8. Purge notifications, templates, and neutralize pending outbox events
      if (schema.notifications && "userId" in schema.notifications) {
        await tx.delete(schema.notifications).where(eq(schema.notifications.userId, user.id));
      }
      if (schema.offerTemplates && "userId" in schema.offerTemplates) {
        await tx.delete(schema.offerTemplates).where(eq(schema.offerTemplates.userId, user.id));
      }

      if (schema.outboxEvents && "status" in schema.outboxEvents) {
        await tx
          .update(schema.outboxEvents)
          .set({
            status: "DEAD",
          })
          .where(
            and(
              eq(schema.outboxEvents.status, "PENDING"),
              sql`${schema.outboxEvents.payloadJson}->>'recipientUserId' = ${user.id}`
            )
          );
      }

      // 9. Record security audit event
      await tx.insert(schema.securityEvents).values({
        userId: user.id,
        eventType: "ACCOUNT_DELETED",
        ipAddress: null,
        userAgent: null,
        riskMetadata: { reason: reason ?? "User requested deletion" },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      // 9. Synchronize in-memory stores
      for (const l of inMemoryListings) {
        if (l.ownerUserId === user.id && l.status !== "MATCHED" && l.status !== "COMPLETED") {
          l.status = "DELETED";
        }
      }
      for (const o of inMemorySentOffers) {
        if (o.offer.offerorUserId === user.id && o.offer.status === "PENDING") {
          o.offer.status = "WITHDRAWN";
          o.offer.resolvedAt = now;
          o.offer.updatedAt = now;
        }
        const ownerId = (o.listing as { ownerUserId?: string })?.ownerUserId;
        if (ownerId === user.id && o.offer.status === "PENDING") {
          o.offer.status = "EXPIRED_LISTING_INACTIVE";
          o.offer.resolvedAt = now;
          o.offer.updatedAt = now;
        }
      }
      for (const r of inMemoryReceivedOffers) {
        if (r.offer.offerorUserId === user.id && r.offer.status === "PENDING") {
          r.offer.status = "WITHDRAWN";
          r.offer.resolvedAt = now;
          r.offer.updatedAt = now;
        }
        if (r.listing.ownerUserId === user.id && r.offer.status === "PENDING") {
          r.offer.status = "EXPIRED_LISTING_INACTIVE";
          r.offer.resolvedAt = now;
          r.offer.updatedAt = now;
        }
      }

        if (user.id === DEFAULT_USER.id) {
          DEFAULT_USER.status = "DELETED";
          DEFAULT_USER.profile.displayName = "Former user";
          DEFAULT_USER.profile.about = "";
          DEFAULT_USER.profile.trackedSkills = [];
        }

        return true;
      });
    } catch (err) {
      if (process.env.NODE_ENV !== "production" && userId === DEFAULT_USER.id) {
        DEFAULT_USER.status = "DELETED";
        DEFAULT_USER.profile.displayName = "Former user";
        DEFAULT_USER.profile.about = "";
        DEFAULT_USER.profile.trackedSkills = [];

        for (const l of inMemoryListings) {
          if (l.ownerUserId === userId && l.status !== "MATCHED" && l.status !== "COMPLETED") {
            l.status = "DELETED";
          }
        }
        for (const o of inMemorySentOffers) {
          if (o.offer.offerorUserId === userId && o.offer.status === "PENDING") {
            o.offer.status = "WITHDRAWN";
            o.offer.resolvedAt = now;
            o.offer.updatedAt = now;
          }
        }
        for (const r of inMemoryReceivedOffers) {
          if (r.listing.ownerUserId === userId && r.offer.status === "PENDING") {
            r.offer.status = "EXPIRED_LISTING_INACTIVE";
            r.offer.resolvedAt = now;
            r.offer.updatedAt = now;
          }
        }
        return true;
      }
      throw err;
    }
  }
}

import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";

export class PrivacyService {
  /**
   * Deletes and de-identifies a user account according to KVKK/GDPR data minimization
   * and retention baseline (§19, §28).
   * Relational integrity of historical completed engagements is preserved while
   * all direct identifiers and PII are permanently purged.
   */
  static async deleteAccount(userId: string, reason?: string) {
    const db = getDb();
    const now = new Date();

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

      // 2. Mark user status as DELETED and scramble email
      const anonymizedEmail = `deleted-${user.id.slice(0, 8)}@deleted.internal`;
      await tx
        .update(schema.users)
        .set({
          status: "DELETED",
          email: anonymizedEmail,
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
          showLocation: false,
          revealPhoneAfterMatch: false,
          updatedAt: now,
        })
        .where(eq(schema.profiles.userId, user.id));

      // 5. Delete profile links and category follows
      await tx
        .delete(schema.profileLinks)
        .where(eq(schema.profileLinks.userId, user.id));

      await tx
        .delete(schema.categoryFollows)
        .where(eq(schema.categoryFollows.userId, user.id));

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
            inArray(schema.listings.status, ["DRAFT", "ACTIVE"])
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
        .where(
          and(
            eq(schema.offers.offerorUserId, user.id),
            eq(schema.offers.status, "PENDING")
          )
        );

      // 8. Record security audit event
      await tx.insert(schema.securityEvents).values({
        userId: user.id,
        eventType: "ACCOUNT_DELETED",
        ipAddress: null,
        userAgent: null,
        riskMetadata: { reason: reason ?? "User requested deletion" },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      return true;
    });
  }
}

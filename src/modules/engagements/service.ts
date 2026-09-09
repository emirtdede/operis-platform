import { and, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { CryptoService } from "@/src/lib/crypto";

export interface CounterpartyContactInfo {
  userId: string;
  handle: string;
  displayName: string;
  email: string;
  phone: string | null;
}

export class EngagementService {
  /**
   * Concurrency-safe acceptance of an offer by the listing owner.
   * Atomically:
   * 1. Verifies listing is ACTIVE and not expired.
   * 2. Marks selected offer ACCEPTED.
   * 3. Transitions listing to MATCHED.
   * 4. Rejects all other pending offers with REJECTED_OTHER_SELECTED.
   * 5. Creates the engagement record with immutable listing title and category snapshots.
   */
  static async acceptOffer(ownerUserId: string, offerId: string) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      // 1. Fetch offer and verify existence and status
      const offerRows = await tx
        .select()
        .from(schema.offers)
        .where(eq(schema.offers.id, offerId))
        .limit(1);

      const offer = offerRows[0];
      if (!offer) {
        throw new Error("Offer not found");
      }

      if (offer.status !== "PENDING") {
        throw new Error("Only pending offers can be accepted");
      }

      // 2. Fetch listing
      const listingRows = await tx
        .select()
        .from(schema.listings)
        .where(eq(schema.listings.id, offer.listingId))
        .limit(1);

      const listing = listingRows[0];
      if (!listing) {
        throw new Error("Listing not found");
      }

      // Authorization check
      if (listing.ownerUserId !== ownerUserId) {
        throw new Error("Unauthorized to accept offers for this listing");
      }

      // Freshness and active status check
      const now = new Date();
      if (
        listing.status !== "ACTIVE" ||
        !listing.activeUntil ||
        listing.activeUntil <= now
      ) {
        throw new Error("LISTING_EXPIRED");
      }

      // Check if already matched
      const existingMatch = await tx
        .select({ id: schema.engagements.id })
        .from(schema.engagements)
        .where(eq(schema.engagements.listingId, listing.id))
        .limit(1);

      if (existingMatch.length > 0) {
        throw new Error("LISTING_ALREADY_MATCHED");
      }

      // Fetch category for snapshot
      const categoryRows = await tx
        .select({ key: schema.categories.key })
        .from(schema.categories)
        .where(eq(schema.categories.id, listing.categoryId))
        .limit(1);

      const categorySlug =
        categoryRows.length > 0 && categoryRows[0]?.key
          ? categoryRows[0].key
          : "technology";

      // 3. Update selected offer to ACCEPTED
      const [acceptedOffer] = await tx
        .update(schema.offers)
        .set({
          status: "ACCEPTED",
          resolvedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.offers.id, offer.id))
        .returning();

      if (!acceptedOffer) {
        throw new Error("Failed to accept offer");
      }

      // 4. Update listing to MATCHED
      await tx
        .update(schema.listings)
        .set({
          status: "MATCHED",
          matchedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.listings.id, listing.id));

      // 5. Reject all other pending offers atomically
      await tx
        .update(schema.offers)
        .set({
          status: "REJECTED_OTHER_SELECTED",
          resolvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.offers.listingId, listing.id),
            ne(schema.offers.id, offer.id),
            eq(schema.offers.status, "PENDING")
          )
        );

      // 6. Record listing status event
      await tx.insert(schema.listingStatusEvents).values({
        listingId: listing.id,
        fromStatus: "ACTIVE",
        toStatus: "MATCHED",
        reason: "OFFER_ACCEPTED",
        actorType: "USER",
        actorId: ownerUserId,
        activationSeq: listing.activationSeq,
      });

      // 7. Create engagement
      const [engagement] = await tx
        .insert(schema.engagements)
        .values({
          listingId: listing.id,
          acceptedOfferId: acceptedOffer.id,
          ownerUserId: listing.ownerUserId,
          freelancerUserId: offer.offerorUserId,
          status: "MATCHED",
          matchedAt: now,
          listingTitleSnapshot: listing.title,
          listingCategorySnapshot: categorySlug,
        })
        .returning();

      return engagement;
    });
  }

  /**
   * Retrieves match details with counterparty contact disclosure.
   * Strictly verifies participant authorization (IDOR protection).
   */
  static async getEngagementDetails(viewerUserId: string, engagementId: string) {
    const db = getDb();

    const rows = await db
      .select({
        engagement: schema.engagements,
        listing: schema.listings,
        acceptedOffer: schema.offers,
      })
      .from(schema.engagements)
      .innerJoin(
        schema.listings,
        eq(schema.engagements.listingId, schema.listings.id)
      )
      .innerJoin(
        schema.offers,
        eq(schema.engagements.acceptedOfferId, schema.offers.id)
      )
      .where(eq(schema.engagements.id, engagementId))
      .limit(1);

    const firstRow = rows[0];
    if (!firstRow) return null;

    const { engagement, listing, acceptedOffer } = firstRow;

    // Authorization check
    if (
      engagement.ownerUserId !== viewerUserId &&
      engagement.freelancerUserId !== viewerUserId
    ) {
      return null;
    }

    const counterpartyUserId =
      viewerUserId === engagement.ownerUserId
        ? engagement.freelancerUserId
        : engagement.ownerUserId;

    // Fetch counterparty details
    const counterpartyUserRows = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        handle: schema.profiles.handle,
        displayName: schema.profiles.displayName,
        revealPhoneAfterMatch: schema.profiles.revealPhoneAfterMatch,
        phoneE164Enc: schema.userPrivateIdentity.phoneE164Enc,
      })
      .from(schema.users)
      .innerJoin(
        schema.profiles,
        eq(schema.users.id, schema.profiles.userId)
      )
      .leftJoin(
        schema.userPrivateIdentity,
        eq(schema.users.id, schema.userPrivateIdentity.userId)
      )
      .where(eq(schema.users.id, counterpartyUserId))
      .limit(1);

    let counterpartyContact: CounterpartyContactInfo | null = null;
    const u = counterpartyUserRows[0];
    if (u) {
      let revealedPhone: string | null = null;

      if (u.revealPhoneAfterMatch && u.phoneE164Enc) {
        try {
          revealedPhone = CryptoService.decryptPii(u.phoneE164Enc);
        } catch {
          revealedPhone = null;
        }
      }

      counterpartyContact = {
        userId: u.id,
        handle: u.handle,
        displayName: u.displayName,
        email: u.email,
        phone: revealedPhone,
      };
    }

    // Fetch completion marks
    const completionMarks = await db
      .select()
      .from(schema.engagementCompletionMarks)
      .where(eq(schema.engagementCompletionMarks.engagementId, engagement.id));

    return {
      engagement,
      listing,
      acceptedOffer,
      counterpartyContact,
      completionMarks,
    };
  }

  /**
   * Bilateral mutual completion flow.
   * Both parties must mark complete for engagement to transition to COMPLETED.
   */
  static async markCompletion(
    userId: string,
    engagementId: string,
    status: "MARKED_COMPLETE" | "DISPUTES_COMPLETION"
  ) {
    const db = getDb();

    return await db.transaction(async (tx) => {
      // 1. Fetch engagement
      const engagementRows = await tx
        .select()
        .from(schema.engagements)
        .where(eq(schema.engagements.id, engagementId))
        .limit(1);

      const engagement = engagementRows[0];
      if (!engagement) {
        throw new Error("Engagement not found");
      }

      if (
        engagement.ownerUserId !== userId &&
        engagement.freelancerUserId !== userId
      ) {
        throw new Error("Unauthorized");
      }

      if (
        engagement.status === "COMPLETED" ||
        engagement.status === "CANCELLED"
      ) {
        throw new Error("Engagement is already finalized");
      }

      // 2. Upsert completion mark for this user
      await tx
        .insert(schema.engagementCompletionMarks)
        .values({
          engagementId: engagement.id,
          userId,
          status,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            schema.engagementCompletionMarks.engagementId,
            schema.engagementCompletionMarks.userId,
          ],
          set: {
            status,
            updatedAt: new Date(),
          },
        });

      // 3. Fetch both marks to check bilateral condition
      const marks = await tx
        .select()
        .from(schema.engagementCompletionMarks)
        .where(
          eq(schema.engagementCompletionMarks.engagementId, engagement.id)
        );

      const ownerMark = marks.find((m) => m.userId === engagement.ownerUserId);
      const freelancerMark = marks.find(
        (m) => m.userId === engagement.freelancerUserId
      );

      const bothComplete =
        ownerMark?.status === "MARKED_COMPLETE" &&
        freelancerMark?.status === "MARKED_COMPLETE";

      const disputed =
        ownerMark?.status === "DISPUTES_COMPLETION" ||
        freelancerMark?.status === "DISPUTES_COMPLETION";

      const now = new Date();

      if (bothComplete) {
        // Transition to COMPLETED
        const [updatedEngagement] = await tx
          .update(schema.engagements)
          .set({
            status: "COMPLETED",
            completedAt: now,
          })
          .where(eq(schema.engagements.id, engagement.id))
          .returning();

        // Update listing
        await tx
          .update(schema.listings)
          .set({
            status: "COMPLETED",
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.listings.id, engagement.listingId));

        return {
          engagement: updatedEngagement ?? engagement,
          completed: true,
          disputed: false,
        };
      }

      if (disputed) {
        return {
          engagement,
          completed: false,
          disputed: true,
        };
      }

      // Otherwise one-sided MARKED_COMPLETE sets status to COMPLETION_PENDING
      if (engagement.status !== "COMPLETION_PENDING") {
        await tx
          .update(schema.engagements)
          .set({
            status: "COMPLETION_PENDING",
          })
          .where(eq(schema.engagements.id, engagement.id));
      }

      return {
        engagement: { ...engagement, status: "COMPLETION_PENDING" },
        completed: false,
        disputed: false,
      };
    });
  }
}

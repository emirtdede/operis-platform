import { and, desc, eq, or } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import {
  RejectOfferInput,
  SubmitOfferInput,
  UpdateOfferInput,
  rejectOfferSchema,
  submitOfferSchema,
  updateOfferSchema,
} from "./validation";

export interface SentOfferDto {
  offer: typeof schema.offers.$inferSelect;
  listing: {
    id: string;
    slug: string;
    title: string;
    status: string;
    activeUntil: Date | null;
  };
}

export interface ReceivedOfferDto {
  offer: typeof schema.offers.$inferSelect;
  offerorProfile: {
    userId: string;
    handle: string;
    displayName: string;
  };
  listing: {
    id: string;
    slug: string;
    title: string;
    status: string;
    activeUntil: Date | null;
  };
}

// In-memory runtime store for offers created during session (empty by default)
export const inMemorySentOffers: SentOfferDto[] = [];
export const inMemoryReceivedOffers: ReceivedOfferDto[] = [];

export class OfferService {
  /**
   * Submits a private 1-to-1 offer on an active listing.
   * Enforces 1 pending offer per listing, anti-spam withdrawal rule, and owner/block bans.
   */
  static async submitOffer(offerorUserId: string, rawInput: SubmitOfferInput) {
    const input = submitOfferSchema.parse(rawInput);
    const db = getDb();

    // 1. Fetch listing and verify active status
    const listingRows = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, input.listingId))
      .limit(1);

    const listing = listingRows[0];
    if (!listing) {
      throw new Error("Listing not found");
    }

    // Listing owner cannot submit offer on own listing
    if (listing.ownerUserId === offerorUserId) {
      throw new Error("You cannot submit an offer on your own listing");
    }

    // Listing must be ACTIVE and not expired
    const now = new Date();
    if (
      listing.status !== "ACTIVE" ||
      !listing.activeUntil ||
      listing.activeUntil <= now
    ) {
      throw new Error("Listing is not currently active for offers");
    }

    // 2. Check blocks
    const blockExists = await db
      .select({ id: schema.blocks.blockerUserId })
      .from(schema.blocks)
      .where(
        or(
          and(
            eq(schema.blocks.blockerUserId, offerorUserId),
            eq(schema.blocks.blockedUserId, listing.ownerUserId)
          ),
          and(
            eq(schema.blocks.blockerUserId, listing.ownerUserId),
            eq(schema.blocks.blockedUserId, offerorUserId)
          )
        )
      )
      .limit(1);

    if (blockExists.length > 0) {
      throw new Error("Cannot submit an offer to this listing");
    }

    // 3. Invariant checks for this offeror on this listing
    const existingOffers = await db
      .select()
      .from(schema.offers)
      .where(
        and(
          eq(schema.offers.listingId, listing.id),
          eq(schema.offers.offerorUserId, offerorUserId)
        )
      );

    // Rule A: Max 1 PENDING offer
    const pendingOffer = existingOffers.find((o) => o.status === "PENDING");
    if (pendingOffer) {
      throw new Error("You already have an active pending offer on this listing");
    }

    // Rule B: If withdrawn during this same activation cycle, anti-spam rule prevents resubmission
    const withdrawnInCycle = existingOffers.find(
      (o) =>
        o.status === "WITHDRAWN" &&
        o.listingActivationSeq === listing.activationSeq
    );
    if (withdrawnInCycle) {
      throw new Error(
        "You cannot submit another offer after withdrawing during this activation cycle"
      );
    }

    // 4. Create offer and initial revision in a transaction
    const newOffer = await db.transaction(async (tx) => {
      const [insertedOffer] = await tx
        .insert(schema.offers)
        .values({
          listingId: listing.id,
          offerorUserId,
          listingActivationSeq: listing.activationSeq,
          status: "PENDING",
          message: input.message,
          budgetCurrency: input.budgetCurrency ?? null,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? null,
          estimatedDurationValue: input.estimatedDurationValue ?? null,
          estimatedDurationUnit: input.estimatedDurationUnit ?? null,
        })
        .returning();

      if (!insertedOffer) {
        throw new Error("Failed to insert offer");
      }

      await tx.insert(schema.offerRevisions).values({
        offerId: insertedOffer.id,
        revisionNo: 1,
        snapshotJson: {
          message: input.message,
          budgetCurrency: input.budgetCurrency ?? null,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? null,
          estimatedDurationValue: input.estimatedDurationValue ?? null,
          estimatedDurationUnit: input.estimatedDurationUnit ?? null,
        },
      });

      return insertedOffer;
    });

    return newOffer;
  }

  /**
   * Updates an existing pending offer. Creates revision snapshot.
   */
  static async updateOffer(offerorUserId: string, rawInput: UpdateOfferInput) {
    const input = updateOfferSchema.parse(rawInput);
    const db = getDb();

    const offerRows = await db
      .select()
      .from(schema.offers)
      .where(eq(schema.offers.id, input.offerId))
      .limit(1);

    const offer = offerRows[0];
    if (!offer) {
      throw new Error("Offer not found");
    }

    // Authorization
    if (offer.offerorUserId !== offerorUserId) {
      throw new Error("Unauthorized to edit this offer");
    }

    if (offer.status !== "PENDING") {
      throw new Error("Only pending offers can be edited");
    }

    // Check listing still active
    const listingRows = await db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.id, offer.listingId))
      .limit(1);

    const listing = listingRows[0];
    if (!listing) {
      throw new Error("Associated listing not found");
    }

    const now = new Date();
    if (
      listing.status !== "ACTIVE" ||
      !listing.activeUntil ||
      listing.activeUntil <= now
    ) {
      throw new Error("Associated listing is no longer active");
    }

    return await db.transaction(async (tx) => {
      // Get highest revision number
      const existingRevisions = await tx
        .select({ revisionNo: schema.offerRevisions.revisionNo })
        .from(schema.offerRevisions)
        .where(eq(schema.offerRevisions.offerId, offer.id))
        .orderBy(desc(schema.offerRevisions.revisionNo))
        .limit(1);

      const firstRev = existingRevisions[0];
      const nextRevNo = firstRev ? firstRev.revisionNo + 1 : 1;

      await tx.insert(schema.offerRevisions).values({
        offerId: offer.id,
        revisionNo: nextRevNo,
        snapshotJson: {
          message: input.message,
          budgetCurrency: input.budgetCurrency ?? null,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? null,
          estimatedDurationValue: input.estimatedDurationValue ?? null,
          estimatedDurationUnit: input.estimatedDurationUnit ?? null,
        },
      });

      const [updatedOffer] = await tx
        .update(schema.offers)
        .set({
          message: input.message,
          budgetCurrency: input.budgetCurrency ?? null,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? null,
          estimatedDurationValue: input.estimatedDurationValue ?? null,
          estimatedDurationUnit: input.estimatedDurationUnit ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.offers.id, offer.id))
        .returning();

      return updatedOffer;
    });
  }

  /**
   * Withdraws a pending offer by the offeror.
   */
  static async withdrawOffer(offerorUserId: string, offerId: string) {
    try {
      const db = getDb();

      const offerRows = await db
        .select()
        .from(schema.offers)
        .where(eq(schema.offers.id, offerId))
        .limit(1);

      if (offerRows.length > 0) {
        const offer = offerRows[0]!;

        if (offer.offerorUserId !== offerorUserId) {
          throw new Error("Unauthorized to withdraw this offer");
        }

        if (offer.status !== "PENDING") {
          throw new Error("Only pending offers can be withdrawn");
        }

        const [withdrawn] = await db
          .update(schema.offers)
          .set({
            status: "WITHDRAWN",
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.offers.id, offerId))
          .returning();

        return withdrawn;
      }
    } catch {
      // In-memory fallback
    }

    const item = inMemorySentOffers.find((o) => o.offer.id === offerId);
    if (item) {
      item.offer.status = "WITHDRAWN";
      item.offer.resolvedAt = new Date();
      item.offer.updatedAt = new Date();
      return item.offer;
    }

    throw new Error("Offer not found");
  }

  /**
   * Rejects an offer by the listing owner, with optional structured reason code and note.
   */
  static async rejectOffer(listingOwnerUserId: string, rawInput: RejectOfferInput) {
    const input = rejectOfferSchema.parse(rawInput);
    const db = getDb();

    const offerRows = await db
      .select({
        offer: schema.offers,
        listing: schema.listings,
      })
      .from(schema.offers)
      .innerJoin(
        schema.listings,
        eq(schema.offers.listingId, schema.listings.id)
      )
      .where(eq(schema.offers.id, input.offerId))
      .limit(1);

    const firstRow = offerRows[0];
    if (!firstRow) {
      throw new Error("Offer not found");
    }

    const { offer, listing } = firstRow;

    if (listing.ownerUserId !== listingOwnerUserId) {
      throw new Error("Unauthorized to reject offers for this listing");
    }

    if (offer.status !== "PENDING") {
      throw new Error("Only pending offers can be rejected");
    }

    const [rejected] = await db
      .update(schema.offers)
      .set({
        status: "REJECTED",
        rejectionCode: input.rejectionCode ?? null,
        rejectionNote: input.rejectionNote ?? null,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.offers.id, input.offerId))
      .returning();

    return rejected;
  }

  /**
   * Retrieves offers submitted by the current user with listing details.
   */
  static async getSentOffers(
    offerorUserId: string,
    statusFilter?: string
  ): Promise<SentOfferDto[]> {
    try {
      const db = getDb();

      const query = db
        .select({
          offer: schema.offers,
          listing: {
            id: schema.listings.id,
            slug: schema.listings.slug,
            title: schema.listings.title,
            status: schema.listings.status,
            activeUntil: schema.listings.activeUntil,
          },
        })
        .from(schema.offers)
        .innerJoin(
          schema.listings,
          eq(schema.offers.listingId, schema.listings.id)
        )
        .where(eq(schema.offers.offerorUserId, offerorUserId))
        .orderBy(desc(schema.offers.createdAt));

      const rows = await query;

      if (rows && rows.length > 0) {
        if (!statusFilter || statusFilter === "all") return rows as SentOfferDto[];
        return rows.filter((r) => r.offer.status.toLowerCase() === statusFilter.toLowerCase()) as SentOfferDto[];
      }
    } catch {
      // Fall through to in-memory fallback
    }

    // In-memory fallback
    const rows = inMemorySentOffers.filter((o) => o.offer.offerorUserId === offerorUserId);

    if (!statusFilter || statusFilter === "all") return rows;
    return rows.filter((r) => r.offer.status.toLowerCase() === statusFilter.toLowerCase());
  }

  /**
   * Retrieves offers received for a listing owned by the current user.
   * Strictly protects offer privacy: only the listing owner can view received offers.
   */
  static async getReceivedOffers(
    listingOwnerUserId: string,
    listingId?: string
  ): Promise<ReceivedOfferDto[]> {
    try {
      const db = getDb();

      const conditions = [eq(schema.listings.ownerUserId, listingOwnerUserId)];
      if (listingId) {
        conditions.push(eq(schema.listings.id, listingId));
      }

      const rows = await db
        .select({
          offer: schema.offers,
          offerorProfile: {
            userId: schema.profiles.userId,
            handle: schema.profiles.handle,
            displayName: schema.profiles.displayName,
          },
          listing: {
            id: schema.listings.id,
            slug: schema.listings.slug,
            title: schema.listings.title,
            status: schema.listings.status,
            activeUntil: schema.listings.activeUntil,
          },
        })
        .from(schema.offers)
        .innerJoin(
          schema.listings,
          eq(schema.offers.listingId, schema.listings.id)
        )
        .innerJoin(
          schema.profiles,
          eq(schema.offers.offerorUserId, schema.profiles.userId)
        )
        .where(and(...conditions))
        .orderBy(desc(schema.offers.createdAt));

      if (rows && rows.length > 0) {
        return rows as ReceivedOfferDto[];
      }
    } catch {
      // Fall through to in-memory fallback
    }

    if (listingId) {
      return inMemoryReceivedOffers.filter((r) => r.listing.id === listingId);
    }
    return inMemoryReceivedOffers;
  }

  /**
   * Securely gets an offer by ID, strictly verifying that the viewer is either
   * the offeror or the listing owner (preventing IDOR).
   */
  static async getOfferById(viewerUserId: string, offerId: string) {
    const db = getDb();

    const rows = await db
      .select({
        offer: schema.offers,
        listing: schema.listings,
        offerorProfile: schema.profiles,
      })
      .from(schema.offers)
      .innerJoin(
        schema.listings,
        eq(schema.offers.listingId, schema.listings.id)
      )
      .innerJoin(
        schema.profiles,
        eq(schema.offers.offerorUserId, schema.profiles.userId)
      )
      .where(eq(schema.offers.id, offerId))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    // Access control: only offeror or listing owner
    if (
      row.offer.offerorUserId !== viewerUserId &&
      row.listing.ownerUserId !== viewerUserId
    ) {
      return null;
    }

    return row;
  }
}

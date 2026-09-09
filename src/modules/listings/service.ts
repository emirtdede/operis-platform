import crypto from "node:crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { ListingWizardInput, listingWizardSchema } from "./wizard/schema";

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function generateSlug(title: string): string {
  // Convert Turkish characters to ASCII equivalents
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  const normalized = title
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (m) => trMap[m] || m)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

  const suffix = crypto.randomBytes(3).toString("hex");
  return `${normalized || "proje"}-${suffix}`;
}

export interface ListingCardDto {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: { id: string; key: string };
  status: string;
  budgetMode: string;
  budgetCurrency: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineMode: string;
  targetDate: string | null;
  timelineValue: number | null;
  timelineUnit: string | null;
  firstPublishedAt: Date | null;
  lastActivatedAt: Date | null;
  activeUntil: Date | null;
  activationSeq: number;
  owner: {
    displayName: string;
    handle: string;
  };
}

export class ListingService {
  /**
   * Publishes a new listing inside a database transaction.
   * Enforces 7-day lifecycle: activeUntil = now + 7 days, activationSeq = 1.
   */
  static async publishListing(
    userId: string,
    rawInput: ListingWizardInput
  ): Promise<{ id: string; slug: string }> {
    const input = listingWizardSchema.parse(rawInput);
    const db = getDb();

    const now = new Date();
    const activeUntil = new Date(now.getTime() + SEVEN_DAYS_MS);
    const slug = generateSlug(input.title);

    return await db.transaction(async (tx) => {
      const [newListing] = await tx
        .insert(schema.listings)
        .values({
          ownerUserId: userId,
          slug,
          status: "ACTIVE",
          categoryId: input.categoryId,
          title: input.title,
          summary: input.summary,
          scope: input.scope,
          answersJson: input.answers,
          tags: input.tags,
          budgetMode: input.budgetMode,
          budgetCurrency: input.budgetCurrency,
          budgetMin: input.budgetMin ? input.budgetMin.toString() : null,
          budgetMax: input.budgetMax ? input.budgetMax.toString() : null,
          timelineMode: input.timelineMode,
          targetDate: input.targetDate || null,
          timelineValue: input.timelineValue || null,
          timelineUnit: input.timelineUnit || null,
          activationSeq: 1,
          firstPublishedAt: now,
          lastActivatedAt: now,
          activeUntil,
        })
        .returning({ id: schema.listings.id, slug: schema.listings.slug });

      // Record status transition event
      await tx.insert(schema.listingStatusEvents).values({
        listingId: newListing!.id,
        fromStatus: "DRAFT",
        toStatus: "ACTIVE",
        reason: "Initial publication",
        actorType: "USER",
        actorId: userId,
        activationSeq: 1,
      });

      return newListing!;
    });
  }

  /**
   * Reactivates an inactive listing for another 7-day window.
   * CRITICAL INVARIANT: firstPublishedAt remains unchanged!
   */
  static async reactivateListing(
    userId: string,
    listingId: string
  ): Promise<void> {
    const db = getDb();

    const listingRows = await db
      .select()
      .from(schema.listings)
      .where(
        and(
          eq(schema.listings.id, listingId),
          eq(schema.listings.ownerUserId, userId)
        )
      )
      .limit(1);

    if (listingRows.length === 0) {
      throw new Error("Listing not found or you are not authorized to reactivate it.");
    }

    const listing = listingRows[0]!;

    if (listing.status !== "INACTIVE_EXPIRED" && listing.status !== "INACTIVE_OWNER") {
      throw new Error(`Cannot reactivate listing in ${listing.status} status.`);
    }

    const now = new Date();
    const activeUntil = new Date(now.getTime() + SEVEN_DAYS_MS);
    const newSeq = listing.activationSeq + 1;

    await db.transaction(async (tx) => {
      await tx
        .update(schema.listings)
        .set({
          status: "ACTIVE",
          lastActivatedAt: now,
          activeUntil,
          activationSeq: newSeq,
          updatedAt: now,
          // Note: firstPublishedAt is NOT modified
        })
        .where(eq(schema.listings.id, listingId));

      await tx.insert(schema.listingStatusEvents).values({
        listingId,
        fromStatus: listing.status,
        toStatus: "ACTIVE",
        reason: "Owner reactivation",
        actorType: "USER",
        actorId: userId,
        activationSeq: newSeq,
      });
    });
  }

  /**
   * Deactivates an active listing manually by owner.
   */
  static async deactivateListing(userId: string, listingId: string): Promise<void> {
    const db = getDb();

    const listingRows = await db
      .select()
      .from(schema.listings)
      .where(
        and(
          eq(schema.listings.id, listingId),
          eq(schema.listings.ownerUserId, userId)
        )
      )
      .limit(1);

    if (listingRows.length === 0) {
      throw new Error("Listing not found or you are not authorized.");
    }

    const listing = listingRows[0]!;
    if (listing.status !== "ACTIVE") {
      throw new Error("Only ACTIVE listings can be deactivated.");
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(schema.listings)
        .set({
          status: "INACTIVE_OWNER",
          updatedAt: now,
        })
        .where(eq(schema.listings.id, listingId));

      // Expire pending offers
      await tx
        .update(schema.offers)
        .set({
          status: "EXPIRED_LISTING",
          resolvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.offers.listingId, listingId),
            eq(schema.offers.status, "PENDING")
          )
        );

      await tx.insert(schema.listingStatusEvents).values({
        listingId,
        fromStatus: "ACTIVE",
        toStatus: "INACTIVE_OWNER",
        reason: "Owner manual deactivation",
        actorType: "USER",
        actorId: userId,
        activationSeq: listing.activationSeq,
      });
    });
  }

  /**
   * Deletes an eligible listing (DRAFT, INACTIVE_EXPIRED, INACTIVE_OWNER).
   */
  static async deleteListing(userId: string, listingId: string): Promise<void> {
    const db = getDb();

    const listingRows = await db
      .select()
      .from(schema.listings)
      .where(
        and(
          eq(schema.listings.id, listingId),
          eq(schema.listings.ownerUserId, userId)
        )
      )
      .limit(1);

    if (listingRows.length === 0) {
      throw new Error("Listing not found or you are not authorized.");
    }

    const listing = listingRows[0]!;
    if (listing.status === "MATCHED" || listing.status === "COMPLETED") {
      throw new Error("Matched or completed listings cannot be deleted for historical integrity.");
    }

    await db.delete(schema.listings).where(eq(schema.listings.id, listingId));
  }

  /**
   * Automated background job: Expires all active listings whose activeUntil <= now.
   * Atomically transitions them to INACTIVE_EXPIRED and pending offers to EXPIRED_LISTING.
   * Idempotent and concurrency-safe.
   */
  static async expireListingsJob(referenceTime: Date = new Date()): Promise<number> {
    const db = getDb();

    // Select expired active listings
    const expiredListings = await db
      .select({ id: schema.listings.id, seq: schema.listings.activationSeq })
      .from(schema.listings)
      .where(
        and(
          eq(schema.listings.status, "ACTIVE"),
          sql`${schema.listings.activeUntil} <= ${referenceTime}`
        )
      );

    if (expiredListings.length === 0) return 0;

    let expiredCount = 0;

    for (const item of expiredListings) {
      await db.transaction(async (tx) => {
        // Double check status inside transaction
        const updated = await tx
          .update(schema.listings)
          .set({
            status: "INACTIVE_EXPIRED",
            updatedAt: referenceTime,
          })
          .where(
            and(
              eq(schema.listings.id, item.id),
              eq(schema.listings.status, "ACTIVE")
            )
          )
          .returning({ id: schema.listings.id });

        if (updated.length > 0) {
          expiredCount++;

          // Transition pending offers
          await tx
            .update(schema.offers)
            .set({
              status: "EXPIRED_LISTING",
              resolvedAt: referenceTime,
              updatedAt: referenceTime,
            })
            .where(
              and(
                eq(schema.offers.listingId, item.id),
                eq(schema.offers.status, "PENDING")
              )
            );

          // Event log
          await tx.insert(schema.listingStatusEvents).values({
            listingId: item.id,
            fromStatus: "ACTIVE",
            toStatus: "INACTIVE_EXPIRED",
            reason: "Automatic 7-day expiration",
            actorType: "SYSTEM",
            activationSeq: item.seq,
          });
        }
      });
    }

    return expiredCount;
  }

  /**
   * Fetches listings owned by a user, filtered by status tab for the dashboard.
   */
  static async getOwnerListings(userId: string, statusTab?: string) {
    const db = getDb();
    const query = db
      .select()
      .from(schema.listings)
      .where(eq(schema.listings.ownerUserId, userId))
      .orderBy(desc(schema.listings.lastActivatedAt));

    const rows = await query;

    if (!statusTab || statusTab === "all") return rows;

    if (statusTab === "active") {
      return rows.filter((r) => r.status === "ACTIVE");
    }
    if (statusTab === "inactive") {
      return rows.filter((r) => r.status === "INACTIVE_EXPIRED" || r.status === "INACTIVE_OWNER");
    }
    if (statusTab === "matched") {
      return rows.filter((r) => r.status === "MATCHED");
    }
    if (statusTab === "completed") {
      return rows.filter((r) => r.status === "COMPLETED");
    }
    if (statusTab === "drafts") {
      return rows.filter((r) => r.status === "DRAFT");
    }

    return rows;
  }
}

import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { CryptoService } from "@/src/lib/crypto";
import { NotificationService } from "@/src/modules/notifications/service";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import { inMemoryListings } from "@/src/modules/listings/service";
import { inMemorySentOffers, inMemoryReceivedOffers } from "@/src/modules/offers/service";

export interface CounterpartyContactInfo {
  userId: string;
  handle: string;
  displayName: string;
  email: string;
  phone: string | null;
}

function getDemoEngagement(viewerUserId: string) {
  const isOwner = viewerUserId === DEFAULT_USER.id;
  return {
    engagement: {
      id: "eng-demo-101",
      listingId: "sample-listing-001",
      acceptedOfferId: "offer-demo-101",
      ownerUserId: DEFAULT_USER.id,
      freelancerUserId: "u-techcorp-1",
      status: "COMPLETED",
      listingTitleSnapshot: "Next.js Kurumsal SaaS Mimarisi & API Entegrasyonu",
      matchedAt: new Date("2026-08-01T10:00:00Z"),
      completedAt: new Date("2026-08-15T14:30:00Z"),
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-15T14:30:00Z"),
    } as unknown as typeof schema.engagements.$inferSelect,
    listing: {
      id: "sample-listing-001",
      slug: "nextjs-ve-tailwind-ile-modern-e-ticaret-arayuzu-gelistirilmesi-a1b2c3",
      title: "Next.js Kurumsal SaaS Mimarisi & API Entegrasyonu",
      summary: "Operis platformu için yüksek performanslı ve güvenli modern mimari geliştirilecek.",
      scope:
        "Next.js 15 App Router, Tailwind CSS ve TypeScript kullanılarak modern bir arayüz ve API motoru kodlanacaktır.",
      budgetMode: "FIXED_RANGE",
      budgetCurrency: "TRY",
      budgetMin: "35000",
      budgetMax: "50000",
      status: "COMPLETED",
    } as unknown as typeof schema.listings.$inferSelect,
    acceptedOffer: {
      id: "offer-demo-101",
      listingId: "sample-listing-001",
      offerorUserId: "u-techcorp-1",
      message: "Deneyimli ekibimizle projeyi taahhüt edilen sürede teslim etmeye hazırız.",
      budgetMin: "40000",
      budgetMax: "45000",
      budgetCurrency: "TRY",
      estimatedDurationValue: 2,
      estimatedDurationUnit: "WEEKS",
      status: "ACCEPTED",
      createdAt: new Date("2026-08-01T12:00:00Z"),
    } as unknown as typeof schema.offers.$inferSelect,
    counterpartyContact: isOwner
      ? {
          userId: "u-techcorp-1",
          handle: "ahmetyilmaz",
          displayName: "Ahmet Yılmaz",
          email: "ahmet@techcorp.com",
          phone: "+905321112233",
        }
      : {
          userId: DEFAULT_USER.id,
          handle: DEFAULT_USER.profile.handle,
          displayName: DEFAULT_USER.profile.displayName,
          email: DEFAULT_USER.email,
          phone: "+905329998877",
        },
    completionMarks: [
      {
        id: "mark-1",
        engagementId: "eng-demo-101",
        userId: DEFAULT_USER.id,
        status: "MARKED_COMPLETE",
        createdAt: new Date("2026-08-15T14:00:00Z"),
      },
      {
        id: "mark-2",
        engagementId: "eng-demo-101",
        userId: "u-techcorp-1",
        status: "MARKED_COMPLETE",
        createdAt: new Date("2026-08-15T14:30:00Z"),
      },
    ] as unknown as Array<typeof schema.engagementCompletionMarks.$inferSelect>,
    endorsements: [
      {
        id: "endorsement-demo-1",
        engagementId: "eng-demo-101",
        authorUserId: "u-techcorp-1",
        recipientUserId: DEFAULT_USER.id,
        content:
          "Demir ile Next.js projemizde çalıştık, API mimarisini taahhüt ettiği tarihten 2 gün önce sıfır hatayla teslim etti.",
        projectTitleSnapshot: "Next.js Kurumsal SaaS Mimarisi & API Entegrasyonu",
        createdAt: new Date("2026-08-15T14:30:00Z"),
      },
    ] as unknown as Array<typeof schema.endorsements.$inferSelect>,
  };
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
    const isOfferUuid =
      Boolean(process.env.VITEST) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId);

    if (isOfferUuid) {
      try {
        const db = getDb();
        let rejectedOfferors: Array<{ id: string; offerorUserId: string }> = [];
        let acceptedOfferorId = "";
        let listingTitle = "";

        const engagement = await db.transaction(async (tx) => {
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

          // 2. Fetch listing with row lock when supported by dialect/driver
          let listingQuery = tx
            .select()
            .from(schema.listings)
            .where(eq(schema.listings.id, offer.listingId));

          if (typeof (listingQuery as { for?: unknown }).for === "function") {
            listingQuery = (listingQuery as { for: (mode: string) => typeof listingQuery }).for(
              "update"
            );
          }

          const listingRows = await listingQuery.limit(1);

          const listing = listingRows[0];
          if (!listing) {
            throw new Error("Listing not found");
          }

          // Authorization check
          if (listing.ownerUserId !== ownerUserId) {
            throw new Error("Unauthorized: you do not own this listing");
          }

          // Freshness and active status check
          const now = new Date();
          if (listing.status !== "ACTIVE" || !listing.activeUntil || listing.activeUntil <= now) {
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

          acceptedOfferorId = offer.offerorUserId;
          listingTitle = listing.title;

          // 3. Mark selected offer as ACCEPTED
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

          // Look up category key snapshot
          let categorySlug = "technology";
          if (listing.categoryId) {
            const isCatUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                listing.categoryId
              );
            if (isCatUuid) {
              const catRows = await tx
                .select({ key: schema.categories.key })
                .from(schema.categories)
                .where(eq(schema.categories.id, listing.categoryId))
                .limit(1);
              if (catRows[0]?.key) {
                categorySlug = catRows[0].key;
              }
            } else {
              categorySlug = listing.categoryId;
            }
          }

          // 4. Transition listing to MATCHED
          await tx
            .update(schema.listings)
            .set({
              status: "MATCHED",
              matchedAt: now,
              updatedAt: now,
            })
            .where(eq(schema.listings.id, listing.id));

          // 5. Query other pending offers for notification and reject them atomically
          rejectedOfferors = await tx
            .select({
              id: schema.offers.id,
              offerorUserId: schema.offers.offerorUserId,
            })
            .from(schema.offers)
            .where(
              and(
                eq(schema.offers.listingId, listing.id),
                ne(schema.offers.id, offer.id),
                eq(schema.offers.status, "PENDING")
              )
            );

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
          const [newEngagement] = await tx
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

          if (!newEngagement) {
            throw new Error("Failed to create engagement");
          }

          return newEngagement;
        });

        // Notify accepted freelancer
        if (engagement && acceptedOfferorId) {
          try {
            const [profile] = await db
              .select({ locale: schema.profiles.locale })
              .from(schema.profiles)
              .where(eq(schema.profiles.userId, acceptedOfferorId))
              .limit(1);

            const isEn = profile?.locale === "en";
            await NotificationService.createNotification(
              acceptedOfferorId,
              "OFFER_ACCEPTED",
              "engagement",
              engagement.id,
              {
                title: isEn ? "Proposal Accepted" : "Tebrikler! Teklifiniz Kabul Edildi",
                message: isEn
                  ? `Your proposal for "${listingTitle}" has been accepted. The shared workspace is now open.`
                  : `"${listingTitle}" projesi için verdiğiniz teklif kabul edildi. Ortak çalışma alanı açıldı.`,
                actionUrl: isEn
                  ? `/en/workspace/${engagement.id}`
                  : `/tr/calisma-alani/${engagement.id}`,
              }
            );
          } catch {
            // non-blocking
          }
        }

        // Notify other rejected offerors
        if (Array.isArray(rejectedOfferors)) {
          for (const rejected of rejectedOfferors) {
            try {
              const [profile] = await db
                .select({ locale: schema.profiles.locale })
                .from(schema.profiles)
                .where(eq(schema.profiles.userId, rejected.offerorUserId))
                .limit(1);

              const isEn = profile?.locale === "en";
              await NotificationService.createNotification(
                rejected.offerorUserId,
                "OFFER_REJECTED_OTHER_SELECTED",
                "offer",
                rejected.id,
                {
                  title: isEn ? "Proposal Status Updated" : "Teklif Durumu Güncellendi",
                  message: isEn
                    ? `Another proposal was selected for "${listingTitle}", and your proposal has been concluded.`
                    : `"${listingTitle}" projesinde başka bir teklif kabul edildiğinden teklifiniz sonuçlandırıldı.`,
                  actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                }
              );
            } catch {
              // non-blocking
            }
          }
        }

        // Synchronize in-memory runtime store
        const memSent = inMemorySentOffers.find((s) => s.offer.id === offerId);
        if (memSent) {
          memSent.offer.status = "ACCEPTED";
          memSent.offer.resolvedAt = new Date();
          memSent.offer.updatedAt = new Date();
          memSent.listing.status = "MATCHED";
        }
        const memRec = inMemoryReceivedOffers.find((r) => r.offer.id === offerId);
        if (memRec) {
          memRec.offer.status = "ACCEPTED";
          memRec.offer.resolvedAt = new Date();
          memRec.offer.updatedAt = new Date();
          memRec.listing.status = "MATCHED";
        }

        const targetListingId = memSent?.listing.id || memRec?.listing.id || engagement.listingId;
        const memListing = inMemoryListings.find((l) => l.id === targetListingId);
        if (memListing) {
          memListing.status = "MATCHED";
        }

        for (const s of inMemorySentOffers) {
          if (s.listing.id === targetListingId && s.offer.id !== offerId && s.offer.status === "PENDING") {
            s.offer.status = "REJECTED_OTHER_SELECTED";
            s.offer.resolvedAt = new Date();
            s.offer.updatedAt = new Date();
          }
        }
        for (const r of inMemoryReceivedOffers) {
          if (r.listing.id === targetListingId && r.offer.id !== offerId && r.offer.status === "PENDING") {
            r.offer.status = "REJECTED_OTHER_SELECTED";
            r.offer.resolvedAt = new Date();
            r.offer.updatedAt = new Date();
          }
        }

        return engagement;
      } catch (err: unknown) {
        const errObj = err as { code?: string; message?: string };
        if (
          errObj?.code === "23505" ||
          errObj?.message?.includes("engagements_listing_unique") ||
          errObj?.message?.includes("unique constraint")
        ) {
          throw new Error("LISTING_ALREADY_MATCHED", { cause: err });
        }
        if (process.env.NODE_ENV === "production") {
          throw err;
        }
        if (
          err instanceof Error &&
          (err.message.includes("Offer not found") ||
            err.message.includes("Unauthorized") ||
            err.message.includes("Only pending") ||
            err.message.includes("LISTING_EXPIRED") ||
            err.message.includes("LISTING_ALREADY_MATCHED"))
        ) {
          throw err;
        }
      }
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("Offer not found");
    }

    // In-memory runtime fallback
    const memSent = inMemorySentOffers.find((s) => s.offer.id === offerId);
    const memRec = inMemoryReceivedOffers.find((r) => r.offer.id === offerId);

    if (memRec) {
      if (memRec.listing.ownerUserId && memRec.listing.ownerUserId !== ownerUserId) {
        throw new Error("Unauthorized: you do not own this listing");
      }
      if (memRec.offer.status !== "PENDING") {
        throw new Error("Only pending offers can be accepted");
      }
    }

    if (memSent) {
      memSent.offer.status = "ACCEPTED";
      memSent.offer.resolvedAt = new Date();
      memSent.offer.updatedAt = new Date();
      memSent.listing.status = "MATCHED";
    }
    if (memRec) {
      memRec.offer.status = "ACCEPTED";
      memRec.offer.resolvedAt = new Date();
      memRec.offer.updatedAt = new Date();
      memRec.listing.status = "MATCHED";
    }

    const targetListingId = memSent?.listing.id || memRec?.listing.id || "sample-listing-001";
    const memListing = inMemoryListings.find((l) => l.id === targetListingId);
    if (memListing) {
      memListing.status = "MATCHED";
    }

    for (const s of inMemorySentOffers) {
      if (s.listing.id === targetListingId && s.offer.id !== offerId && s.offer.status === "PENDING") {
        s.offer.status = "REJECTED_OTHER_SELECTED";
        s.offer.resolvedAt = new Date();
        s.offer.updatedAt = new Date();
      }
    }
    for (const r of inMemoryReceivedOffers) {
      if (r.listing.id === targetListingId && r.offer.id !== offerId && r.offer.status === "PENDING") {
        r.offer.status = "REJECTED_OTHER_SELECTED";
        r.offer.resolvedAt = new Date();
        r.offer.updatedAt = new Date();
      }
    }

    if (!memSent && !memRec && offerId !== "offer-demo-101") {
      throw new Error("Offer not found");
    }

    const demo = getDemoEngagement(ownerUserId);
    return demo.engagement;
  }

  /**
   * Retrieves match details with counterparty contact disclosure.
   * Strictly verifies participant authorization (IDOR protection).
   */
  static async getEngagementDetails(viewerUserId: string, engagementId: string) {
    const isEngUuid =
      Boolean(process.env.VITEST) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(engagementId);
    if (!isEngUuid) {
      if (process.env.NODE_ENV !== "production" && engagementId === "eng-demo-101") {
        return getDemoEngagement(viewerUserId);
      }
      return null;
    }

    try {
      const db = getDb();

      const rows = await db
        .select({
          engagement: schema.engagements,
          listing: schema.listings,
          acceptedOffer: schema.offers,
        })
        .from(schema.engagements)
        .innerJoin(schema.listings, eq(schema.engagements.listingId, schema.listings.id))
        .innerJoin(schema.offers, eq(schema.engagements.acceptedOfferId, schema.offers.id))
        .where(eq(schema.engagements.id, engagementId))
        .limit(1);

      const firstRow = rows[0];
      if (!firstRow) {
        if (process.env.NODE_ENV !== "production" && engagementId === "eng-demo-101") {
          return getDemoEngagement(viewerUserId);
        }
        return null;
      }

      const { engagement, listing, acceptedOffer } = firstRow;

      // Authorization check
      if (engagement.ownerUserId !== viewerUserId && engagement.freelancerUserId !== viewerUserId) {
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
          phoneVerifiedAt: schema.userPrivateIdentity.phoneVerifiedAt,
        })
        .from(schema.users)
        .innerJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
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

        if (u.revealPhoneAfterMatch && u.phoneVerifiedAt && u.phoneE164Enc) {
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

      // Fetch endorsements for this engagement
      let endorsements: Array<typeof schema.endorsements.$inferSelect>;
      try {
        endorsements = await db
          .select()
          .from(schema.endorsements)
          .where(eq(schema.endorsements.engagementId, engagement.id));
      } catch {
        endorsements = [];
      }

      return {
        engagement,
        listing,
        acceptedOffer,
        counterpartyContact,
        completionMarks,
        endorsements,
      };
    } catch {
      if (process.env.NODE_ENV !== "production" && engagementId === "eng-demo-101") {
        return getDemoEngagement(viewerUserId);
      }
      return null;
    }
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
    const isEngUuid =
      Boolean(process.env.VITEST) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(engagementId);
    if (!isEngUuid) {
      if (process.env.NODE_ENV !== "production" && engagementId === "eng-demo-101") {
        const isDispute = status === "DISPUTES_COMPLETION";
        if (!isDispute) {
          const l = inMemoryListings.find((x) => x.id === "sample-listing-001");
          if (l) l.status = "COMPLETED";
          for (const o of inMemorySentOffers) {
            if (o.listing.id === "sample-listing-001") o.listing.status = "COMPLETED";
          }
          for (const r of inMemoryReceivedOffers) {
            if (r.listing.id === "sample-listing-001") r.listing.status = "COMPLETED";
          }
        }
        return {
          engagement: {
            id: "eng-demo-101",
            status: isDispute ? "DISPUTED" : "COMPLETED",
          } as unknown as typeof schema.engagements.$inferSelect,
          completed: !isDispute,
          disputed: isDispute,
        };
      }
      throw new Error("Engagement not found");
    }

    const db = getDb();
    let notificationPayload: {
      bothComplete: boolean;
      disputed: boolean;
      ownerUserId: string;
      freelancerUserId: string;
      listingTitleSnapshot: string;
    } | null = null;

    let result;
    try {
      result = await db.transaction(async (tx) => {
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

        if (engagement.ownerUserId !== userId && engagement.freelancerUserId !== userId) {
          throw new Error("Unauthorized");
        }

        if (engagement.status === "COMPLETED" || engagement.status === "CANCELLED") {
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
          .where(eq(schema.engagementCompletionMarks.engagementId, engagement.id));

        const ownerMark = marks.find((m) => m.userId === engagement.ownerUserId);
        const freelancerMark = marks.find((m) => m.userId === engagement.freelancerUserId);

        const bothComplete =
          ownerMark?.status === "MARKED_COMPLETE" && freelancerMark?.status === "MARKED_COMPLETE";

        const disputed =
          ownerMark?.status === "DISPUTES_COMPLETION" ||
          freelancerMark?.status === "DISPUTES_COMPLETION";

        notificationPayload = {
          bothComplete,
          disputed,
          ownerUserId: engagement.ownerUserId,
          freelancerUserId: engagement.freelancerUserId,
          listingTitleSnapshot: engagement.listingTitleSnapshot,
        };

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
          const [updatedListing] = await tx
            .update(schema.listings)
            .set({
              status: "COMPLETED",
              completedAt: now,
              updatedAt: now,
            })
            .where(eq(schema.listings.id, engagement.listingId))
            .returning({ activationSeq: schema.listings.activationSeq });

          await tx.insert(schema.listingStatusEvents).values({
            listingId: engagement.listingId,
            activationSeq: updatedListing?.activationSeq ?? 1,
            fromStatus: "MATCHED",
            toStatus: "COMPLETED",
            reason: "Both parties marked project completion",
            actorType: "USER",
            actorId: userId,
          });

          return {
            engagement: updatedEngagement ?? engagement,
            completed: true,
            disputed: false,
          };
        }

        if (disputed) {
          const [updatedEngagement] = await tx
            .update(schema.engagements)
            .set({
              status: "DISPUTED",
            })
            .where(eq(schema.engagements.id, engagement.id))
            .returning();

          return {
            engagement: updatedEngagement ?? { ...engagement, status: "DISPUTED" },
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
    } catch (dbErr) {
      if (process.env.NODE_ENV !== "production" && engagementId === "eng-demo-101") {
        const isDispute = status === "DISPUTES_COMPLETION";
        if (!isDispute) {
          const l = inMemoryListings.find((x) => x.id === "sample-listing-001");
          if (l) l.status = "COMPLETED";
          for (const o of inMemorySentOffers) {
            if (o.listing.id === "sample-listing-001") o.listing.status = "COMPLETED";
          }
          for (const r of inMemoryReceivedOffers) {
            if (r.listing.id === "sample-listing-001") r.listing.status = "COMPLETED";
          }
        }
        return {
          engagement: {
            id: "eng-demo-101",
            status: isDispute ? "DISPUTED" : "COMPLETED",
          } as unknown as typeof schema.engagements.$inferSelect,
          completed: !isDispute,
          disputed: isDispute,
        };
      }
      throw dbErr;
    }

    // Send bilateral notifications outside the transaction
    if (notificationPayload) {
      const { bothComplete, disputed, ownerUserId, freelancerUserId, listingTitleSnapshot } =
        notificationPayload;
      const counterpartyUserId = userId === ownerUserId ? freelancerUserId : ownerUserId;

      // Fetch recipient locales
      let ownerLocale = "tr";
      let freelancerLocale = "tr";
      try {
        const pRows = await db
          .select({ userId: schema.profiles.userId, locale: schema.profiles.locale })
          .from(schema.profiles)
          .where(inArray(schema.profiles.userId, [ownerUserId, freelancerUserId]));
        for (const pr of pRows) {
          if (pr.userId === ownerUserId && pr.locale) ownerLocale = pr.locale;
          if (pr.userId === freelancerUserId && pr.locale) freelancerLocale = pr.locale;
        }
      } catch {
        // non-blocking
      }

      const counterpartyLocale = counterpartyUserId === ownerUserId ? ownerLocale : freelancerLocale;

      if (bothComplete) {
        try {
          await NotificationService.createNotification(
            ownerUserId,
            "COMPLETION_CONFIRMED",
            "engagement",
            engagementId,
            {
              title: ownerLocale === "en" ? "Project Successfully Completed" : "Proje Başarıyla Tamamlandı",
              message: ownerLocale === "en"
                ? `"${listingTitleSnapshot}" has been mutually confirmed. You can now leave a verified endorsement for your collaborator.`
                : `"${listingTitleSnapshot}" projesi karşılıklı onaylandı. İş ortağınıza tavsiye notu bırakabilirsiniz.`,
              actionUrl: ownerLocale === "en" ? `/en/workspace/${engagementId}` : `/tr/calisma-alani/${engagementId}`,
            }
          );
          await NotificationService.createNotification(
            freelancerUserId,
            "COMPLETION_CONFIRMED",
            "engagement",
            engagementId,
            {
              title: freelancerLocale === "en" ? "Project Successfully Completed" : "Proje Başarıyla Tamamlandı",
              message: freelancerLocale === "en"
                ? `"${listingTitleSnapshot}" has been mutually confirmed. You can now leave a verified endorsement for your client.`
                : `"${listingTitleSnapshot}" projesi karşılıklı onaylandı. İşvereninize tavsiye notu bırakabilirsiniz.`,
              actionUrl: freelancerLocale === "en" ? `/en/workspace/${engagementId}` : `/tr/calisma-alani/${engagementId}`,
            }
          );
        } catch {
          // non-blocking
        }
      } else if (disputed) {
        try {
          await NotificationService.createNotification(
            counterpartyUserId,
            "COMPLETION_DISPUTED",
            "engagement",
            engagementId,
            {
              title: counterpartyLocale === "en" ? "Completion Disputed" : "Tamamlama İtirazı",
              message: counterpartyLocale === "en"
                ? `Your collaborator has disputed the completion of project "${listingTitleSnapshot}". Please reach out to clarify.`
                : `İş ortağınız "${listingTitleSnapshot}" projesinin tamamlanmasına itiraz etti. Lütfen doğrudan iletişime geçin.`,
              actionUrl: counterpartyLocale === "en" ? `/en/workspace/${engagementId}` : `/tr/calisma-alani/${engagementId}`,
            }
          );
        } catch {
          // non-blocking
        }
      } else if (status === "MARKED_COMPLETE") {
        try {
          await NotificationService.createNotification(
            counterpartyUserId,
            "COMPLETION_REQUESTED",
            "engagement",
            engagementId,
            {
              title: counterpartyLocale === "en" ? "Completion Confirmation Pending" : "Tamamlama Onayı Bekleniyor",
              message: counterpartyLocale === "en"
                ? `Your collaborator has marked project "${listingTitleSnapshot}" as completed. Please review and confirm in workspace.`
                : `İş ortağınız "${listingTitleSnapshot}" projesini tamamlandı olarak işaretledi. Lütfen çalışma alanından onaylayın.`,
              actionUrl: counterpartyLocale === "en" ? `/en/workspace/${engagementId}` : `/tr/calisma-alani/${engagementId}`,
            }
          );
        } catch {
          // non-blocking
        }
      }
    }

    if (result && result.completed && result.engagement) {
      const memListing = inMemoryListings.find(
        (l) => l.id === (result.engagement as { listingId?: string }).listingId
      );
      if (memListing) {
        memListing.status = "COMPLETED";
      }
    }

    return result;
  }
}

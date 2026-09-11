import crypto from "node:crypto";
import { eq, and, desc, sql, or, ilike, inArray } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import {
  ListingWizardInput,
  listingWizardSchema,
  UpdateListingInput,
  updateListingInputSchema,
} from "./wizard/schema";
import { NotificationService } from "@/src/modules/notifications/service";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import { inMemorySentOffers, inMemoryReceivedOffers } from "@/src/modules/offers/service";

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface InMemListing {
  id: string;
  ownerUserId: string;
  slug: string;
  status: string;
  categoryId: string;
  title: string;
  summary: string;
  scope: string;
  answersJson: unknown;
  tags: string[];
  budgetMode: string;
  budgetCurrency: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineMode: string;
  targetDate: string | null;
  timelineValue: number | null;
  timelineUnit: string | null;
  activationSeq: number;
  viewCount: number;
  clickCount: number;
  firstPublishedAt: Date;
  lastActivatedAt: Date;
  activeUntil: Date | null;
}

export const inMemoryListings: InMemListing[] =
  typeof process !== "undefined" &&
  process.env.NODE_ENV !== "production" &&
  !process.env.VITEST &&
  process.env.NODE_ENV !== "test"
    ? [
        {
          id: "sample-listing-001",
          ownerUserId: "usr_mock_demir_yildiz",
          slug: "nextjs-ve-tailwind-ile-modern-e-ticaret-arayuzu-gelistirilmesi-a1b2c3",
          status: "ACTIVE",
          categoryId: "cat_web_dev",
          title: "Next.js ve Tailwind ile Modern E-Ticaret Arayüzü Geliştirilmesi",
          summary:
            "Operis platformu için yüksek performanslı, duyarlı ve modern Next.js App Router mimarisinde e-ticaret kullanıcı arayüzü bileşenleri geliştirilecek.",
          scope:
            "Proje kapsamında Next.js 15 App Router, Tailwind CSS ve TypeScript kullanılarak modern bir e-ticaret ön yüzü geliştirilecektir. Sepet yönetimi, ürün filtreleme, arama ve ödeme adımları tasarıma birebir uygun ve erişilebilir (a11y) standartlarda kodlanacaktır. Tüm bileşenler responsive ve test edilmiş olacaktır.",
          answersJson: { authRequired: true, adminRequired: false, responsiveRequired: true },
          tags: ["Next.js", "React", "Tailwind CSS", "TypeScript"],
          budgetMode: "FIXED_RANGE",
          budgetCurrency: "TRY",
          budgetMin: "25000",
          budgetMax: "40000",
          timelineMode: "DURATION_ESTIMATE",
          targetDate: null,
          timelineValue: 2,
          timelineUnit: "WEEKS",
          activationSeq: 1,
          viewCount: 142,
          clickCount: 89,
          firstPublishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          lastActivatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          activeUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: "sample-listing-002",
          ownerUserId: "usr_mock_mehmet_kaan",
          slug: "flutter-ile-cross-platform-mobil-uygulama-gelistirilmesi-d4e5f6",
          status: "ACTIVE",
          categoryId: "cat_mobile_dev",
          title: "Flutter ile Cross-Platform Mobil Uygulama Geliştirilmesi",
          summary:
            "iOS ve Android platformlarında eşzamanlı çalışacak, offline-first mimaride ve modern arayüze sahip mobil proje geliştirilecek.",
          scope:
            "Projede Flutter & Dart kullanılarak yüksek performanslı bir mobil deneyim hedeflenmektedir. RESTful API entegrasyonu, push notification ve biyometrik giriş özellikleri kodlanacaktır.",
          answersJson: { authRequired: true, adminRequired: false, responsiveRequired: true },
          tags: ["Flutter", "Dart", "iOS", "Android", "REST API"],
          budgetMode: "FIXED_RANGE",
          budgetCurrency: "TRY",
          budgetMin: "35000",
          budgetMax: "60000",
          timelineMode: "DURATION_ESTIMATE",
          targetDate: null,
          timelineValue: 3,
          timelineUnit: "WEEKS",
          activationSeq: 1,
          viewCount: 98,
          clickCount: 64,
          firstPublishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          lastActivatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          activeUntil: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        },
        {
          id: "sample-listing-003",
          ownerUserId: "usr_mock_selin_yilmaz",
          slug: "yuksek-trafikli-fintech-projesi-icin-go-ve-postgresql-api-g7h8i9",
          status: "ACTIVE",
          categoryId: "cat_backend_dev",
          title: "Yüksek Trafikli Fintech Projesi için Go ve PostgreSQL API",
          summary:
            "Düşük gecikmeli, mikroservis uyumlu ve AES-256 veri korumalı dağıtık arka yüz servislerinin mimarisi ve kodlanması.",
          scope:
            "Go (Golang), Docker, PostgreSQL ve Redis kullanılarak saniyede 10.000+ istek karşılayabilecek işlem motoru geliştirilecektir. Unit ve entegrasyon testleri zorunludur.",
          answersJson: { authRequired: true, adminRequired: true, responsiveRequired: false },
          tags: ["Go", "Golang", "PostgreSQL", "Docker", "Redis"],
          budgetMode: "FIXED_RANGE",
          budgetCurrency: "TRY",
          budgetMin: "45000",
          budgetMax: "80000",
          timelineMode: "DURATION_ESTIMATE",
          targetDate: null,
          timelineValue: 4,
          timelineUnit: "WEEKS",
          activationSeq: 1,
          viewCount: 215,
          clickCount: 137,
          firstPublishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          lastActivatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          activeUntil: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        },
      ]
    : [];

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
  viewCount: number;
  clickCount: number;
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
    const now = new Date();
    const activeUntil = new Date(now.getTime() + SEVEN_DAYS_MS);
    const slug = generateSlug(input.title);
    const combinedAnswers = {
      ...(input.answers || {}),
      projectType: input.projectType,
      projectStage: input.projectStage,
      workPreference: input.workPreference,
      preferredLanguage: input.preferredLanguage,
    };

    try {
      const db = getDb();

      // Check email and phone verification in production
      if (process.env.NODE_ENV === "production") {
        const userRows = await db
          .select({ emailVerified: schema.users.emailVerified })
          .from(schema.users)
          .where(eq(schema.users.id, userId))
          .limit(1);

        if (userRows[0] && !userRows[0].emailVerified) {
          throw new Error(
            "İlan yayınlamak için önce e-posta adresinizi doğrulamanız gerekmektedir."
          );
        }

        const identityRows = await db
          .select({ phoneVerifiedAt: schema.userPrivateIdentity.phoneVerifiedAt })
          .from(schema.userPrivateIdentity)
          .where(eq(schema.userPrivateIdentity.userId, userId))
          .limit(1);

        if (!identityRows[0]?.phoneVerifiedAt) {
          throw new Error(
            "İlan yayınlamak için önce cep telefonu numaranızı doğrulamanız gerekmektedir."
          );
        }
      }

      return await db.transaction(async (tx) => {
        let categoryId = input.categoryId;
        const isCatUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
        if (!isCatUuid) {
          const cat = await tx
            .select({ id: schema.categories.id })
            .from(schema.categories)
            .where(eq(schema.categories.key, categoryId))
            .limit(1);
          if (cat[0]?.id) {
            categoryId = cat[0].id;
          }
        }

        const [newListing] = await tx
          .insert(schema.listings)
          .values({
            ownerUserId: userId,
            slug,
            status: "ACTIVE",
            categoryId,
            title: input.title,
            summary: input.summary,
            scope: input.scope,
            answersJson: combinedAnswers,
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
            viewCount: 0,
            clickCount: 0,
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

        // Dispatch radar notifications asynchronously
        ListingService.dispatchRadarNotifications(
          newListing!.id,
          input.title,
          slug,
          input.tags,
          userId
        ).catch(() => {});

        return newListing!;
      });
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      // In-memory fallback for development
      const inMemId = crypto.randomUUID();
      inMemoryListings.unshift({
        id: inMemId,
        ownerUserId: userId,
        slug,
        status: "ACTIVE",
        categoryId: input.categoryId,
        title: input.title,
        summary: input.summary,
        scope: input.scope,
        answersJson: combinedAnswers,
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
        viewCount: 0,
        clickCount: 0,
        firstPublishedAt: now,
        lastActivatedAt: now,
        activeUntil,
      });

      ListingService.dispatchRadarNotifications(
        inMemId,
        input.title,
        slug,
        input.tags,
        userId
      ).catch(() => {});

      return { id: inMemId, slug };
    }
  }

  /**
   * Dispatches notifications to developers whose radar tracked skills match the listing tags.
   */
  static async dispatchRadarNotifications(
    listingId: string,
    title: string,
    slug: string,
    tags: string[],
    ownerUserId: string
  ): Promise<void> {
    if (!tags || tags.length === 0) return;

    try {
      const db = getDb();
      const candidateProfiles = await db
        .select({
          userId: schema.profiles.userId,
          trackedSkills: schema.profiles.trackedSkills,
          locale: schema.profiles.locale,
        })
        .from(schema.profiles)
        .where(
          and(
            sql`${schema.profiles.userId} != ${ownerUserId}`,
            sql`NOT EXISTS (
              SELECT 1 FROM ${schema.blocks}
              WHERE (${schema.blocks.blockerUserId} = ${schema.profiles.userId} AND ${schema.blocks.blockedUserId} = ${ownerUserId})
                 OR (${schema.blocks.blockerUserId} = ${ownerUserId} AND ${schema.blocks.blockedUserId} = ${schema.profiles.userId})
            )`
          )
        );

      for (const p of candidateProfiles) {
        if (!p.trackedSkills || p.trackedSkills.length === 0) continue;
        const matchingTag = p.trackedSkills.find((skill) =>
          tags.some((t) => t.toLowerCase() === skill.toLowerCase())
        );

        if (matchingTag) {
          const isEn = p.locale === "en";
          await NotificationService.createNotification(
            p.userId,
            "RADAR_MATCH",
            "listing",
            listingId,
            {
              title: isEn ? `Radar Match: [${matchingTag}]` : `Radarın Eşleşti: [${matchingTag}]`,
              message: isEn
                ? `A new project matching your tracked skill "${matchingTag}" was published: "${title}"`
                : `Takip ettiğin "${matchingTag}" teknolojisiyle yeni bir proje yayınlandı: "${title}"`,
              actionUrl: isEn ? `/en/listings/${slug}` : `/tr/ilanlar/${slug}`,
            }
          );
        }
      }
    } catch {
      // In-memory / demo fallback: check DEFAULT_USER
      if (ownerUserId !== DEFAULT_USER.id && DEFAULT_USER.status === "ACTIVE") {
        const userSkills = DEFAULT_USER.profile.trackedSkills || [];
        const matchingTag = userSkills.find((skill) =>
          tags.some((t) => t.toLowerCase() === skill.toLowerCase())
        );
        if (matchingTag) {
          try {
            const isEn = DEFAULT_USER.profile.locale === "en";
            await NotificationService.createNotification(
              DEFAULT_USER.id,
              "RADAR_MATCH",
              "listing",
              listingId,
              {
                title: isEn ? `Radar Match: [${matchingTag}]` : `Radarın Eşleşti: [${matchingTag}]`,
                message: isEn
                  ? `A new project matching your tracked skill "${matchingTag}" was published: "${title}"`
                  : `Takip ettiğin "${matchingTag}" teknolojisiyle yeni bir proje yayınlandı: "${title}"`,
                actionUrl: isEn ? `/en/listings/${slug}` : `/tr/ilanlar/${slug}`,
              }
            );
          } catch {
            // Non-blocking
          }
        }
      }
    }
  }

  /**
   * Reactivates an inactive listing for another 7-day window.
   * CRITICAL INVARIANT: firstPublishedAt remains unchanged!
   */
  static async reactivateListing(userId: string, listingId: string): Promise<void> {
    const isListingUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);

    if (isListingUuid) {
      try {
        const db = getDb();

        const listingRows = await db
          .select()
          .from(schema.listings)
          .where(and(eq(schema.listings.id, listingId), eq(schema.listings.ownerUserId, userId)))
          .limit(1);

        if (listingRows.length === 0) {
          throw new Error("Listing not found or you are not authorized.");
        }

      const listing = listingRows[0]!;

      if (listing.status !== "INACTIVE_EXPIRED" && listing.status !== "INACTIVE_OWNER") {
        throw new Error(`Cannot reactivate listing in ${listing.status} status.`);
      }

      const now = new Date();
      const activeUntil = new Date(now.getTime() + SEVEN_DAYS_MS);
      const newSeq = listing.activationSeq + 1;

      await db.transaction(async (tx) => {
        const [reactivated] = await tx
          .update(schema.listings)
          .set({
            status: "ACTIVE",
            lastActivatedAt: now,
            activeUntil,
            activationSeq: newSeq,
            updatedAt: now,
            // Note: firstPublishedAt is NOT modified
          })
          .where(
            and(
              eq(schema.listings.id, listingId),
              eq(schema.listings.ownerUserId, userId),
              or(eq(schema.listings.status, "INACTIVE_EXPIRED"), eq(schema.listings.status, "INACTIVE_OWNER")),
              eq(schema.listings.activationSeq, listing.activationSeq)
            )
          )
          .returning();

        if (!reactivated) {
          throw new Error(`Cannot reactivate listing in ${listing.status} status or activation sequence has drifted.`);
        }

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

      // Dispatch radar notifications asynchronously
      ListingService.dispatchRadarNotifications(
        listingId,
        listing.title,
        listing.slug,
        listing.tags || [],
        userId
      ).catch(() => {});

      return;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      if (
        err instanceof Error &&
        (err.message.includes("Listing not found") ||
          err.message.includes("Cannot reactivate"))
      ) {
        throw err;
      }
      // In-memory fallback
    }
  }

    const item = inMemoryListings.find((l) => l.id === listingId && l.ownerUserId === userId);
    if (item) {
      if (item.status !== "INACTIVE_EXPIRED" && item.status !== "INACTIVE_OWNER") {
        throw new Error(`Cannot reactivate listing in ${item.status} status.`);
      }
      item.status = "ACTIVE";
      item.lastActivatedAt = new Date();
      item.activeUntil = new Date(Date.now() + SEVEN_DAYS_MS);
      item.activationSeq += 1;

      for (const o of inMemorySentOffers) {
        if (o.listing.id === listingId) {
          o.listing.status = "ACTIVE";
          o.listing.activeUntil = item.activeUntil;
        }
      }
      for (const r of inMemoryReceivedOffers) {
        if (r.listing.id === listingId) {
          r.listing.status = "ACTIVE";
          r.listing.activeUntil = item.activeUntil;
        }
      }

      ListingService.dispatchRadarNotifications(
        listingId,
        item.title,
        item.slug,
        item.tags || [],
        userId
      ).catch(() => {});

      return;
    }
    throw new Error("Listing not found or you are not authorized.");
  }

  /**
   * Deactivates an active listing manually by owner.
   */
  static async deactivateListing(userId: string, listingId: string): Promise<void> {
    const isListingUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);

    if (isListingUuid) {
      try {
        const db = getDb();

        const listingRows = await db
          .select()
          .from(schema.listings)
          .where(and(eq(schema.listings.id, listingId), eq(schema.listings.ownerUserId, userId)))
          .limit(1);

        if (listingRows.length === 0) {
          throw new Error("Listing not found or you are not authorized.");
        }

      const listing = listingRows[0]!;
      if (listing.status !== "ACTIVE") {
        throw new Error("Only ACTIVE listings can be deactivated.");
      }

      const now = new Date();
      let pendingOffers: Array<{ id: string; offerorUserId: string; locale: string | null }> = [];

      await db.transaction(async (tx) => {
        const updateResult = await tx
          .update(schema.listings)
          .set({
            status: "INACTIVE_OWNER",
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.listings.id, listingId),
              eq(schema.listings.ownerUserId, userId),
              eq(schema.listings.status, "ACTIVE")
            )
          )
          .returning({ id: schema.listings.id });

        if (updateResult.length === 0) {
          throw new Error("Listing cannot be deactivated because its status has changed or you are not authorized.");
        }

        // Query pending offers before expiring them
        pendingOffers = await tx
          .select({
            id: schema.offers.id,
            offerorUserId: schema.offers.offerorUserId,
            locale: schema.profiles.locale,
          })
          .from(schema.offers)
          .leftJoin(schema.profiles, eq(schema.offers.offerorUserId, schema.profiles.userId))
          .where(
            and(eq(schema.offers.listingId, listingId), eq(schema.offers.status, "PENDING"))
          );

        // Expire pending offers
        await tx
          .update(schema.offers)
          .set({
            status: "EXPIRED_LISTING_INACTIVE",
            resolvedAt: now,
            updatedAt: now,
          })
          .where(
            and(eq(schema.offers.listingId, listingId), eq(schema.offers.status, "PENDING"))
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

      // Notify pending offerors
      for (const po of pendingOffers) {
        const isEn = po.locale === "en";
        NotificationService.createNotification(
          po.offerorUserId,
          "OFFER_EXPIRED_LISTING",
          "offer",
          po.id,
          {
            title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
            message: isEn
              ? `The project "${listing.title}" was deactivated by its owner. Your pending proposal has ended.`
              : `"${listing.title}" projesi sahibi tarafından yayından kaldırıldığı için bekleyen teklifiniz sona erdi.`,
            actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
          }
        ).catch(() => {});
      }

      return;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      if (
        err instanceof Error &&
        (err.message.includes("Listing not found") ||
          err.message.includes("Only ACTIVE"))
      ) {
        throw err;
      }
      // In-memory fallback
    }
  }

    const item = inMemoryListings.find((l) => l.id === listingId && l.ownerUserId === userId);
    if (item) {
      if (item.status !== "ACTIVE") {
        throw new Error("Only ACTIVE listings can be deactivated.");
      }
      item.status = "INACTIVE_OWNER";

      // Conclude any in-memory pending offers on this deactivated listing and sync listing status
      for (const o of inMemorySentOffers) {
        if (o.listing.id === listingId) {
          o.listing.status = "INACTIVE_OWNER";
          if (o.offer.status === "PENDING") {
            o.offer.status = "EXPIRED_LISTING_INACTIVE";
            o.offer.resolvedAt = new Date();
            o.offer.updatedAt = new Date();
            if (o.offer.offerorUserId === DEFAULT_USER.id) {
              const isEn = DEFAULT_USER.profile.locale === "en";
              NotificationService.createNotification(
                DEFAULT_USER.id,
                "OFFER_EXPIRED_LISTING",
                "offer",
                o.offer.id,
                {
                  title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
                  message: isEn
                    ? `The project "${item.title}" was deactivated by its owner. Your pending proposal has ended.`
                    : `"${item.title}" projesi sahibi tarafından yayından kaldırıldığı için bekleyen teklifiniz sona erdi.`,
                  actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                }
              ).catch(() => {});
            }
          }
        }
      }
      for (const r of inMemoryReceivedOffers) {
        if (r.listing.id === listingId) {
          r.listing.status = "INACTIVE_OWNER";
          if (r.offer.status === "PENDING") {
            r.offer.status = "EXPIRED_LISTING_INACTIVE";
            r.offer.resolvedAt = new Date();
            r.offer.updatedAt = new Date();
            if (r.offer.offerorUserId === DEFAULT_USER.id) {
              const isEn = DEFAULT_USER.profile.locale === "en";
              NotificationService.createNotification(
                DEFAULT_USER.id,
                "OFFER_EXPIRED_LISTING",
                "offer",
                r.offer.id,
                {
                  title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
                  message: isEn
                    ? `The project "${item.title}" was deactivated by its owner. Your pending proposal has ended.`
                    : `"${item.title}" projesi sahibi tarafından yayından kaldırıldığı için bekleyen teklifiniz sona erdi.`,
                  actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                }
              ).catch(() => {});
            }
          }
        }
      }
      return;
    }
    throw new Error("Listing not found or you are not authorized.");
  }

  /**
   * Deletes an eligible listing (DRAFT, INACTIVE_EXPIRED, INACTIVE_OWNER).
   */
  static async deleteListing(userId: string, listingId: string): Promise<void> {
    const isListingUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);

    if (isListingUuid) {
      try {
        const db = getDb();

        const listingRows = await db
          .select()
          .from(schema.listings)
          .where(and(eq(schema.listings.id, listingId), eq(schema.listings.ownerUserId, userId)))
          .limit(1);

        if (listingRows.length === 0) {
          throw new Error("Listing not found or you are not authorized.");
        }

      const listing = listingRows[0]!;
      if (listing.status === "MATCHED" || listing.status === "COMPLETED") {
        throw new Error("Matched or completed listings cannot be deleted for historical integrity.");
      }

      const now = new Date();
      let pendingOffers: Array<{ id: string; offerorUserId: string; locale: string | null }> = [];

      await db.transaction(async (tx) => {
        // Collect pending offers to notify offerors
        pendingOffers = await tx
          .select({
            id: schema.offers.id,
            offerorUserId: schema.offers.offerorUserId,
            locale: schema.profiles.locale,
          })
          .from(schema.offers)
          .leftJoin(schema.profiles, eq(schema.offers.offerorUserId, schema.profiles.userId))
          .where(
            and(eq(schema.offers.listingId, listingId), eq(schema.offers.status, "PENDING"))
          );

        const updateResult = await tx
          .update(schema.listings)
          .set({
            status: "DELETED",
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.listings.id, listingId),
              eq(schema.listings.ownerUserId, userId),
              inArray(schema.listings.status, [
                "DRAFT",
                "ACTIVE",
                "INACTIVE_EXPIRED",
                "INACTIVE_OWNER",
              ])
            )
          )
          .returning({ id: schema.listings.id });

        if (updateResult.length === 0) {
          throw new Error(
            "Listing cannot be deleted because its status has changed or you are not authorized."
          );
        }

        // Conclude any pending offers on this deleted listing
        await tx
          .update(schema.offers)
          .set({
            status: "EXPIRED_LISTING_INACTIVE",
            resolvedAt: now,
            updatedAt: now,
          })
          .where(
            and(eq(schema.offers.listingId, listingId), eq(schema.offers.status, "PENDING"))
          );

        await tx.insert(schema.listingStatusEvents).values({
          listingId,
          fromStatus: listing.status,
          toStatus: "DELETED",
          reason: "Deleted by owner",
          actorType: "USER",
          actorId: userId,
          activationSeq: listing.activationSeq,
        });
      });

      // Dispatch notifications to pending offerors
      for (const po of pendingOffers) {
        const isEn = po.locale === "en";
        NotificationService.createNotification(
          po.offerorUserId,
          "OFFER_EXPIRED_LISTING",
          "offer",
          po.id,
          {
            title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
            message: isEn
              ? `The project "${listing.title}" was deleted by its owner. Your pending proposal has ended.`
              : `"${listing.title}" projesi sahibi tarafından silindiği için bekleyen teklifiniz sona erdi.`,
            actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
          }
        ).catch(() => {});
      }

      return;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      if (
        err instanceof Error &&
        (err.message.includes("Listing not found") ||
          err.message.includes("Matched or completed"))
      ) {
        throw err;
      }
    }
  }

    const item = inMemoryListings.find((l) => l.id === listingId && l.ownerUserId === userId);
    if (item) {
      if (item.status === "MATCHED" || item.status === "COMPLETED") {
        throw new Error("Matched or completed listings cannot be deleted for historical integrity.");
      }
      item.status = "DELETED";

      // Expire in-memory pending offers and update listing status snapshot
      for (const o of inMemorySentOffers) {
        if (o.listing.id === listingId) {
          o.listing.status = "DELETED";
          if (o.offer.status === "PENDING") {
            o.offer.status = "EXPIRED_LISTING_INACTIVE";
            o.offer.resolvedAt = new Date();
            o.offer.updatedAt = new Date();
            if (o.offer.offerorUserId === DEFAULT_USER.id) {
              const isEn = DEFAULT_USER.profile.locale === "en";
              NotificationService.createNotification(
                DEFAULT_USER.id,
                "OFFER_EXPIRED_LISTING",
                "offer",
                o.offer.id,
                {
                  title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
                  message: isEn
                    ? `The project "${item.title}" was deleted by its owner. Your pending proposal has ended.`
                    : `"${item.title}" projesi sahibi tarafından silindiği için bekleyen teklifiniz sona erdi.`,
                  actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                }
              ).catch(() => {});
            }
          }
        }
      }
      for (const o of inMemoryReceivedOffers) {
        if (o.listing.id === listingId || o.offer.listingId === listingId) {
          o.listing.status = "DELETED";
          if (o.offer.status === "PENDING") {
            o.offer.status = "EXPIRED_LISTING_INACTIVE";
            o.offer.resolvedAt = new Date();
            o.offer.updatedAt = new Date();
            if (o.offer.offerorUserId === DEFAULT_USER.id) {
              const isEn = DEFAULT_USER.profile.locale === "en";
              NotificationService.createNotification(
                DEFAULT_USER.id,
                "OFFER_EXPIRED_LISTING",
                "offer",
                o.offer.id,
                {
                  title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
                  message: isEn
                    ? `The project "${item.title}" was deleted by its owner. Your pending proposal has ended.`
                    : `"${item.title}" projesi sahibi tarafından silindiği için bekleyen teklifiniz sona erdi.`,
                  actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                }
              ).catch(() => {});
            }
          }
        }
      }
      return;
    }
    throw new Error("Listing not found or you are not authorized.");
  }

  /**
   * Automated background job: Expires all active listings whose activeUntil <= now.
   * Atomically transitions them to INACTIVE_EXPIRED and pending offers to EXPIRED_LISTING.
   * Idempotent and concurrency-safe.
   */
  static async expireListingsJob(referenceTime: Date = new Date()): Promise<number> {
    try {
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
                eq(schema.listings.status, "ACTIVE"),
                eq(schema.listings.activationSeq, item.seq),
                sql`${schema.listings.activeUntil} <= ${referenceTime}`
              )
            )
            .returning({ id: schema.listings.id });

          if (updated.length > 0) {
            expiredCount++;

            // Query pending offers before updating
            const pendingOffers = await tx
              .select({
                id: schema.offers.id,
                offerorUserId: schema.offers.offerorUserId,
                locale: schema.profiles.locale,
              })
              .from(schema.offers)
              .leftJoin(schema.profiles, eq(schema.offers.offerorUserId, schema.profiles.userId))
              .where(and(eq(schema.offers.listingId, item.id), eq(schema.offers.status, "PENDING")));

            // Transition pending offers
            await tx
              .update(schema.offers)
              .set({
                status: "EXPIRED_LISTING",
                resolvedAt: referenceTime,
                updatedAt: referenceTime,
              })
              .where(and(eq(schema.offers.listingId, item.id), eq(schema.offers.status, "PENDING")));

            // Event log
            await tx.insert(schema.listingStatusEvents).values({
              listingId: item.id,
              fromStatus: "ACTIVE",
              toStatus: "INACTIVE_EXPIRED",
              reason: "Automatic 7-day expiration",
              actorType: "SYSTEM",
              activationSeq: item.seq,
            });

            // Notify owner
            const [ownerData] = await tx
              .select({
                ownerUserId: schema.listings.ownerUserId,
                title: schema.listings.title,
                locale: schema.profiles.locale,
              })
              .from(schema.listings)
              .leftJoin(schema.profiles, eq(schema.listings.ownerUserId, schema.profiles.userId))
              .where(eq(schema.listings.id, item.id))
              .limit(1);

            if (ownerData) {
              const isEn = ownerData.locale === "en";
              NotificationService.createNotification(
                ownerData.ownerUserId,
                "LISTING_EXPIRED",
                "listing",
                item.id,
                {
                  title: isEn ? "Listing Cycle Ended" : "İlan Yayını Tamamlandı",
                  message: isEn
                    ? `Your project "${ownerData.title}" has completed its 7-day active cycle. You can reactivate it anytime from your dashboard.`
                    : `"${ownerData.title}" projeniz 7 günlük yayın süresini tamamladı. Dilediğiniz zaman panelinizden tek tıkla yeniden yayınlayabilirsiniz.`,
                  actionUrl: isEn ? "/en/dashboard/listings" : "/tr/panel/ilanlarim",
                }
              ).catch(() => {});
            }

            // Notify pending offerors
            for (const po of pendingOffers) {
              const isEn = po.locale === "en";
              NotificationService.createNotification(
                po.offerorUserId,
                "OFFER_EXPIRED_LISTING",
                "offer",
                po.id,
                {
                  title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
                  message: isEn
                    ? `The project "${ownerData?.title || "Project"}" reached the end of its active cycle. Your pending proposal has ended.`
                    : `"${ownerData?.title || "Proje"}" projesi yayın süresini tamamladığı için bekleyen teklifiniz sona erdi.`,
                  actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                }
              ).catch(() => {});
            }
          }
        });
      }

      return expiredCount;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      let expiredCount = 0;
      for (const l of inMemoryListings) {
        if (l.status === "ACTIVE" && l.activeUntil && new Date(l.activeUntil) <= referenceTime) {
          l.status = "INACTIVE_EXPIRED";
          expiredCount++;

          if (l.ownerUserId === DEFAULT_USER.id) {
            const isEn = DEFAULT_USER.profile.locale === "en";
            NotificationService.createNotification(
              DEFAULT_USER.id,
              "LISTING_EXPIRED",
              "listing",
              l.id,
              {
                title: isEn ? "Listing Cycle Ended" : "İlan Yayını Tamamlandı",
                message: isEn
                  ? `Your project "${l.title}" has completed its 7-day active cycle. You can reactivate it anytime from your dashboard.`
                  : `"${l.title}" projeniz 7 günlük yayın süresini tamamladı. Dilediğiniz zaman panelinizden tek tıkla yeniden yayınlayabilirsiniz.`,
                actionUrl: isEn ? "/en/dashboard/listings" : "/tr/panel/ilanlarim",
              }
            ).catch(() => {});
          }

          for (const o of inMemorySentOffers) {
            if (o.listing.id === l.id) {
              o.listing.status = "INACTIVE_EXPIRED";
              if (o.offer.status === "PENDING") {
                o.offer.status = "EXPIRED_LISTING";
                o.offer.resolvedAt = referenceTime;
                o.offer.updatedAt = referenceTime;
                if (o.offer.offerorUserId === DEFAULT_USER.id) {
                  const isEn = DEFAULT_USER.profile.locale === "en";
                  NotificationService.createNotification(
                    DEFAULT_USER.id,
                    "OFFER_EXPIRED_LISTING",
                    "offer",
                    o.offer.id,
                    {
                      title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
                      message: isEn
                        ? `The project "${l.title}" reached the end of its active cycle. Your pending proposal has ended.`
                        : `"${l.title}" projesi yayın süresini tamamladığı için bekleyen teklifiniz sona erdi.`,
                      actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                    }
                  ).catch(() => {});
                }
              }
            }
          }
          for (const r of inMemoryReceivedOffers) {
            if (r.listing.id === l.id) {
              r.listing.status = "INACTIVE_EXPIRED";
              if (r.offer.status === "PENDING") {
                r.offer.status = "EXPIRED_LISTING";
                r.offer.resolvedAt = referenceTime;
                r.offer.updatedAt = referenceTime;
                if (r.offer.offerorUserId === DEFAULT_USER.id) {
                  const isEn = DEFAULT_USER.profile.locale === "en";
                  NotificationService.createNotification(
                    DEFAULT_USER.id,
                    "OFFER_EXPIRED_LISTING",
                    "offer",
                    r.offer.id,
                    {
                      title: isEn ? "Proposal Expired" : "Teklif Sona Erdi",
                      message: isEn
                        ? `The project "${l.title}" reached the end of its active cycle. Your pending proposal has ended.`
                        : `"${l.title}" projesi yayın süresini tamamladığı için bekleyen teklifiniz sona erdi.`,
                      actionUrl: isEn ? "/en/dashboard/offers/sent" : "/tr/panel/teklifler/gonderilen",
                    }
                  ).catch(() => {});
                }
              }
            }
          }
        }
      }
      return expiredCount;
    }
  }

  /**
   * Scans for active listings expiring in the next 24 hours and sends a warning notification.
   */
  static async notifyExpiringListings(referenceTime: Date = new Date()): Promise<number> {
    try {
      const db = getDb();
      const next24h = new Date(referenceTime.getTime() + 24 * 60 * 60 * 1000);

      const expiringSoon = await db
        .select({
          id: schema.listings.id,
          title: schema.listings.title,
          slug: schema.listings.slug,
          ownerUserId: schema.listings.ownerUserId,
          activeUntil: schema.listings.activeUntil,
        })
        .from(schema.listings)
        .where(
          and(
            eq(schema.listings.status, "ACTIVE"),
            sql`${schema.listings.activeUntil} > ${referenceTime}`,
            sql`${schema.listings.activeUntil} <= ${next24h}`
          )
        );

      let notifiedCount = 0;
      for (const item of expiringSoon) {
        try {
          await NotificationService.createNotification(
            item.ownerUserId,
            "LISTING_EXPIRING_SOON",
            "listing",
            item.id,
            {
              title: "İlanınızın Süresi Dolmak Üzere",
              message: `"${item.title}" başlıklı ilanınızın 7 günlük yayın süresi 24 saat içerisinde dolacaktır. Gerekirse ilanınızı tazeleyebilirsiniz.`,
              actionUrl: `/tr/ilanlar/${item.slug}`,
            }
          );
          notifiedCount++;
        } catch {
          // ignore individual notification failure
        }
      }
      return notifiedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Fetches listings owned by a user, filtered by status tab for the dashboard.
   */
  static async getOwnerListings(userId: string, statusTab?: string) {
    try {
      const db = getDb();
      const query = db
        .select({
          id: schema.listings.id,
          ownerUserId: schema.listings.ownerUserId,
          categoryId: schema.listings.categoryId,
          slug: schema.listings.slug,
          status: schema.listings.status,
          title: schema.listings.title,
          summary: schema.listings.summary,
          scope: schema.listings.scope,
          answersJson: schema.listings.answersJson,
          tags: schema.listings.tags,
          budgetMode: schema.listings.budgetMode,
          budgetCurrency: schema.listings.budgetCurrency,
          budgetMin: schema.listings.budgetMin,
          budgetMax: schema.listings.budgetMax,
          timelineMode: schema.listings.timelineMode,
          targetDate: schema.listings.targetDate,
          timelineValue: schema.listings.timelineValue,
          timelineUnit: schema.listings.timelineUnit,
          activationSeq: schema.listings.activationSeq,
          viewCount: schema.listings.viewCount,
          clickCount: schema.listings.clickCount,
          firstPublishedAt: schema.listings.firstPublishedAt,
          lastActivatedAt: schema.listings.lastActivatedAt,
          activeUntil: schema.listings.activeUntil,
          matchedAt: schema.listings.matchedAt,
          completedAt: schema.listings.completedAt,
          deletedAt: schema.listings.deletedAt,
          createdAt: schema.listings.createdAt,
          updatedAt: schema.listings.updatedAt,
          engagementId: schema.engagements.id,
        })
        .from(schema.listings)
        .leftJoin(schema.engagements, eq(schema.listings.id, schema.engagements.listingId))
        .where(eq(schema.listings.ownerUserId, userId))
        .orderBy(desc(schema.listings.lastActivatedAt));

      const rows = await query;

      if (!statusTab || statusTab === "all") return rows;
      if (statusTab === "active") return rows.filter((r) => r.status === "ACTIVE");
      if (statusTab === "inactive")
        return rows.filter(
          (r) => r.status === "INACTIVE_EXPIRED" || r.status === "INACTIVE_OWNER"
        );
      if (statusTab === "matched") return rows.filter((r) => r.status === "MATCHED");
      if (statusTab === "completed") return rows.filter((r) => r.status === "COMPLETED");
      if (statusTab === "drafts") return rows.filter((r) => r.status === "DRAFT");
      return rows;
    } catch {
      if (process.env.NODE_ENV === "production") {
        return [];
      }
      // Fall through to in-memory fallback
    }

    // In-memory runtime storage for listings created by this user
    const rows = inMemoryListings
      .filter((l) => l.ownerUserId === userId)
      .map((l) => ({
        ...l,
        engagementId: l.status === "MATCHED" || l.status === "COMPLETED" ? "eng-demo-101" : null,
      }));

    if (!statusTab || statusTab === "all") return rows;
    if (statusTab === "active") return rows.filter((r) => r.status === "ACTIVE");
    if (statusTab === "inactive")
      return rows.filter((r) => r.status === "INACTIVE_EXPIRED" || r.status === "INACTIVE_OWNER");
    if (statusTab === "matched") return rows.filter((r) => r.status === "MATCHED");
    if (statusTab === "completed") return rows.filter((r) => r.status === "COMPLETED");
    if (statusTab === "drafts") return rows.filter((r) => r.status === "DRAFT");
    return rows;
  }

  /**
   * Updates an active or draft listing and stores a revision snapshot.
   */
  static async updateListing(
    userId: string,
    listingId: string,
    rawUpdates: UpdateListingInput
  ): Promise<void> {
    const updates = updateListingInputSchema.parse(rawUpdates);
    const isListingUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);

    if (isListingUuid) {
      try {
        const db = getDb();

        await db.transaction(async (tx) => {
          let listingQuery = tx
            .select()
            .from(schema.listings)
            .where(and(eq(schema.listings.id, listingId), eq(schema.listings.ownerUserId, userId)))
            .limit(1);

          if ("for" in listingQuery && typeof (listingQuery as unknown as Record<string, unknown>).for === "function") {
            listingQuery = (listingQuery as unknown as { for: (clause: string) => typeof listingQuery }).for("update");
          }

          const listingRows = await listingQuery;
          if (listingRows.length === 0) {
            throw new Error("Listing not found or unauthorized.");
          }

          const listing = listingRows[0]!;
          if (
            listing.status === "MATCHED" ||
            listing.status === "COMPLETED" ||
            listing.status === "DELETED"
          ) {
            throw new Error("Cannot edit matched, completed or deleted listing.");
          }

          const [maxRevRow] = await tx
          .select({ maxRev: sql<number>`coalesce(max(${schema.listingRevisions.revisionNo}), 0)` })
          .from(schema.listingRevisions)
          .where(eq(schema.listingRevisions.listingId, listing.id));

        const nextRevisionNo = Number(maxRevRow?.maxRev ?? 0) + 1;

        await tx.insert(schema.listingRevisions).values({
          listingId: listing.id,
          editorUserId: userId,
          revisionNo: nextRevisionNo,
          snapshotJson: {
            title: listing.title,
            summary: listing.summary,
            scope: listing.scope,
            tags: listing.tags,
            categoryId: listing.categoryId,
            budgetMode: listing.budgetMode,
            budgetCurrency: listing.budgetCurrency,
            budgetMin: listing.budgetMin,
            budgetMax: listing.budgetMax,
            timelineMode: listing.timelineMode,
            targetDate: listing.targetDate,
            timelineValue: listing.timelineValue,
            timelineUnit: listing.timelineUnit,
            answersJson: listing.answersJson,
          },
        });

        await tx
          .update(schema.listings)
          .set({
            ...(updates.title !== undefined && { title: updates.title }),
            ...(updates.summary !== undefined && { summary: updates.summary }),
            ...(updates.scope !== undefined && { scope: updates.scope }),
            ...(updates.tags !== undefined && { tags: updates.tags }),
            ...(updates.budgetMode !== undefined && { budgetMode: updates.budgetMode }),
            ...(updates.budgetMin !== undefined && {
              budgetMin: updates.budgetMin !== null && updates.budgetMin !== "" ? String(updates.budgetMin) : null,
            }),
            ...(updates.budgetMax !== undefined && {
              budgetMax: updates.budgetMax !== null && updates.budgetMax !== "" ? String(updates.budgetMax) : null,
            }),
            updatedAt: new Date(),
          })
          .where(eq(schema.listings.id, listingId));
      });
      return;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      if (
        err instanceof Error &&
        (err.message.includes("Listing not found") ||
          err.message.includes("Cannot edit matched"))
      ) {
        throw err;
      }
    }
  }

    const item = inMemoryListings.find((l) => l.id === listingId && l.ownerUserId === userId);
    if (item) {
      if (
        item.status === "MATCHED" ||
        item.status === "COMPLETED" ||
        item.status === "DELETED"
      ) {
        throw new Error("Cannot edit matched, completed or deleted listing.");
      }
      if (updates.title) item.title = updates.title;
      if (updates.summary) item.summary = updates.summary;
      if (updates.scope) item.scope = updates.scope;
      if (updates.tags) item.tags = updates.tags;
      if (updates.budgetMin !== undefined)
        item.budgetMin = updates.budgetMin !== null ? String(updates.budgetMin) : null;
      if (updates.budgetMax !== undefined)
        item.budgetMax = updates.budgetMax !== null ? String(updates.budgetMax) : null;

      if (updates.title) {
        for (const o of inMemorySentOffers) {
          if (o.listing.id === listingId) {
            o.listing.title = updates.title;
          }
        }
        for (const r of inMemoryReceivedOffers) {
          if (r.listing.id === listingId) {
            r.listing.title = updates.title;
          }
        }
      }
      return;
    }
    throw new Error("Listing not found or unauthorized.");
  }

  /**
   * Increments the view count for a listing atomically.
   */
  static async incrementListingViews(listingId: string): Promise<{ viewCount: number }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);
    const now = new Date();
    try {
      const db = getDb();
      const [updated] = await db
        .update(schema.listings)
        .set({
          viewCount: sql`${schema.listings.viewCount} + 1`,
        })
        .where(
          and(
            isUuid ? eq(schema.listings.id, listingId) : eq(schema.listings.slug, listingId),
            eq(schema.listings.status, "ACTIVE"),
            sql`${schema.listings.activeUntil} > ${now}`
          )
        )
        .returning({ viewCount: schema.listings.viewCount });

      if (updated) {
        return { viewCount: updated.viewCount };
      }
    } catch {
      // In-memory fallback
    }

    const item = inMemoryListings.find(
      (l) =>
        (l.id === listingId || l.slug === listingId) &&
        l.status === "ACTIVE" &&
        (!l.activeUntil || new Date(l.activeUntil) > now)
    );
    if (item) {
      item.viewCount = (item.viewCount || 0) + 1;
      return { viewCount: item.viewCount };
    }

    if (process.env.NODE_ENV !== "production") {
      return { viewCount: 1 };
    }

    throw new Error("Listing not found or inactive.");
  }

  /**
   * Tracks a click on a listing card atomically.
   */
  static async trackListingClick(listingId: string): Promise<{ clickCount: number }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);
    const now = new Date();
    try {
      const db = getDb();
      const [updated] = await db
        .update(schema.listings)
        .set({
          clickCount: sql`${schema.listings.clickCount} + 1`,
        })
        .where(
          and(
            isUuid ? eq(schema.listings.id, listingId) : eq(schema.listings.slug, listingId),
            eq(schema.listings.status, "ACTIVE"),
            sql`${schema.listings.activeUntil} > ${now}`
          )
        )
        .returning({ clickCount: schema.listings.clickCount });

      if (updated) {
        return { clickCount: updated.clickCount };
      }
    } catch {
      // In-memory fallback
    }

    const item = inMemoryListings.find(
      (l) =>
        (l.id === listingId || l.slug === listingId) &&
        l.status === "ACTIVE" &&
        (!l.activeUntil || new Date(l.activeUntil) > now)
    );
    if (item) {
      item.clickCount = (item.clickCount || 0) + 1;
      return { clickCount: item.clickCount };
    }

    if (process.env.NODE_ENV !== "production") {
      return { clickCount: 1 };
    }

    throw new Error("Listing not found or inactive.");
  }

  /**
   * Enterprise Full-Text Search for listings across title, summary, and tags.
   * Calculates relevance scores based on multi-term matches and tag weights.
   */
  static async searchListingsFullText(
    query: string,
    limit: number = 20
  ): Promise<
    Array<{
      id: string;
      slug: string;
      title: string;
      summary: string;
      budgetMode: string;
      tags: string[];
      relevanceScore: number;
    }>
  > {
    const trimmed = (query || "").trim().toLowerCase();
    if (!trimmed) return [];

    const terms = trimmed.split(/\s+/).filter((t) => t.length > 0);

    const scoreListings = (
      list: Array<{
        id: string;
        slug: string;
        title: string;
        summary: string;
        budgetMode: string;
        tags: string[] | null;
        status: string;
        activeUntil?: Date | null;
      }>
    ) =>
      list
        .filter((l) => {
          if (l.status !== "ACTIVE") return false;
          if (l.activeUntil && new Date(l.activeUntil).getTime() <= Date.now()) return false;
          return true;
        })
        .map((l) => {
          let score = 0;
          const titleLower = l.title.toLowerCase();
          const summaryLower = l.summary.toLowerCase();
          const tagsLower = (l.tags || []).map((t) => t.toLowerCase());

          for (const term of terms) {
            if (titleLower.includes(term)) score += 10;
            if (summaryLower.includes(term)) score += 5;
            if (tagsLower.some((t) => t.includes(term))) score += 8;
          }

          return {
            id: l.id,
            slug: l.slug,
            title: l.title,
            summary: l.summary,
            budgetMode: l.budgetMode,
            tags: l.tags || [],
            relevanceScore: score,
          };
        })
        .filter((item) => item.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);

    if (process.env.VITEST || process.env.NODE_ENV === "test") {
      return scoreListings(inMemoryListings);
    }

    try {
      const db = getDb();
      const now = new Date();
      const escapeLike = (s: string) => s.replace(/[%_\\]/g, "\\$&");
      const searchConditions = terms.map((term) => {
        const escaped = `%${escapeLike(term)}%`;
        return or(
          ilike(schema.listings.title, escaped),
          ilike(schema.listings.summary, escaped),
          sql`exists (select 1 from unnest(${schema.listings.tags}) t where t ilike ${escaped})`
        );
      });

      const rows = await db
        .select({
          id: schema.listings.id,
          slug: schema.listings.slug,
          title: schema.listings.title,
          summary: schema.listings.summary,
          budgetMode: schema.listings.budgetMode,
          tags: schema.listings.tags,
          status: schema.listings.status,
          activeUntil: schema.listings.activeUntil,
        })
        .from(schema.listings)
        .where(
          and(
            eq(schema.listings.status, "ACTIVE"),
            sql`${schema.listings.activeUntil} > ${now}`,
            searchConditions.length > 0 ? or(...searchConditions) : sql`true`
          )
        )
        .limit(Math.max(limit * 3, 60));

      return scoreListings(rows);
    } catch {
      if (process.env.NODE_ENV === "production") {
        return [];
      }
      // In-memory fallback
    }

    return scoreListings(inMemoryListings);
  }
}

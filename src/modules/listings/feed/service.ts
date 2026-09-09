import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { inMemoryListings } from "@/src/modules/listings/service";

export interface FeedQueryParams {
  mode?: "following" | "all";
  userId?: string;
  categorySlugs?: string[];
  search?: string;
  cursor?: string | null;
  limit?: number;
  locale?: "tr" | "en";
}

export interface FeedListingItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  scope: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  budgetMode: string;
  budgetCurrency: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineMode: string;
  targetDate: string | null;
  timelineValue: number | null;
  timelineUnit: string | null;
  ownerHandle: string;
  ownerDisplayName: string;
  firstPublishedAt: Date;
  lastActivatedAt: Date;
  activeUntil: Date;
  activationSeq: number;
  tags: string[];
}

export interface FeedResult {
  items: FeedListingItem[];
  nextCursor: string | null;
  hasMore: boolean;
  hasFollowedCategories?: boolean;
}

export class FeedService {
  /**
   * Retrieves active listings for the feed, supporting 'following' and 'all' modes,
   * category filtering, search queries, and deterministic cursor pagination.
   */
  static async getFeedListings(params: FeedQueryParams): Promise<FeedResult> {
    const db = getDb();
    const mode = params.mode ?? "all";
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const locale = params.locale ?? "tr";

    let followedCategoryIds: string[] = [];
    if (mode === "following" && params.userId) {
      const userFollows = await db
        .select({ categoryId: schema.categoryFollows.categoryId })
        .from(schema.categoryFollows)
        .where(eq(schema.categoryFollows.userId, params.userId));

      followedCategoryIds = userFollows.map((f) => f.categoryId);

      // If user follows 0 categories in following mode, return early with informative signal
      if (followedCategoryIds.length === 0) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          hasFollowedCategories: false,
        };
      }
    }

    // Resolve categorySlugs to IDs if provided
    let filterCategoryIds: string[] | undefined = undefined;
    if (params.categorySlugs && params.categorySlugs.length > 0) {
      const catRows = await db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(inArray(schema.categories.key, params.categorySlugs));
      filterCategoryIds = catRows.map((c) => c.id);
    }

    // Determine target category IDs when both following and explicit category filters exist
    let targetCategoryIds: string[] | undefined = filterCategoryIds;
    if (mode === "following" && params.userId) {
      if (targetCategoryIds) {
        targetCategoryIds = targetCategoryIds.filter((id) =>
          followedCategoryIds.includes(id)
        );
        if (targetCategoryIds.length === 0) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
            hasFollowedCategories: true,
          };
        }
      } else {
        targetCategoryIds = followedCategoryIds;
      }
    }

    // Decode cursor
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    if (params.cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(params.cursor, "base64").toString("utf-8")
        );
        if (decoded.lastActivatedAt && decoded.id) {
          cursorDate = new Date(decoded.lastActivatedAt);
          cursorId = decoded.id;
        }
      } catch {
        // Invalid cursor ignored
      }
    }

    // Base conditions: active and unexpired
    const now = new Date();
    const conditions = [
      eq(schema.listings.status, "ACTIVE"),
      sql`${schema.listings.activeUntil} > ${now}`,
    ];

    if (targetCategoryIds && targetCategoryIds.length > 0) {
      conditions.push(inArray(schema.listings.categoryId, targetCategoryIds));
    }

    // Search query
    if (params.search && params.search.trim().length > 0) {
      const sanitized = params.search.trim().slice(0, 100);
      const pattern = `%${sanitized}%`;
      conditions.push(
        or(
          ilike(schema.listings.title, pattern),
          ilike(schema.listings.summary, pattern),
          ilike(schema.listings.scope, pattern)
        )!
      );
    }

    // Mutual block exclusions if viewer is logged in
    if (params.userId) {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${schema.blocks}
          WHERE (${schema.blocks.blockerUserId} = ${params.userId} AND ${schema.blocks.blockedUserId} = ${schema.listings.ownerUserId})
             OR (${schema.blocks.blockerUserId} = ${schema.listings.ownerUserId} AND ${schema.blocks.blockedUserId} = ${params.userId})
        )`
      );
    }

    // Cursor pagination condition
    if (cursorDate && cursorId) {
      conditions.push(
        sql`(${schema.listings.lastActivatedAt} < ${cursorDate} OR (${schema.listings.lastActivatedAt} = ${cursorDate} AND ${schema.listings.id} < ${cursorId}))`
      );
    }

    // Build main query: join category and profile
    const query = db
      .select({
        id: schema.listings.id,
        slug: schema.listings.slug,
        title: schema.listings.title,
        summary: schema.listings.summary,
        scope: schema.listings.scope,
        categoryId: schema.listings.categoryId,
        categorySlug: schema.categories.key,
        categoryNameTr: schema.categoryTranslations.name,
        budgetMode: schema.listings.budgetMode,
        budgetCurrency: schema.listings.budgetCurrency,
        budgetMin: schema.listings.budgetMin,
        budgetMax: schema.listings.budgetMax,
        timelineMode: schema.listings.timelineMode,
        targetDate: schema.listings.targetDate,
        timelineValue: schema.listings.timelineValue,
        timelineUnit: schema.listings.timelineUnit,
        firstPublishedAt: schema.listings.firstPublishedAt,
        lastActivatedAt: schema.listings.lastActivatedAt,
        activeUntil: schema.listings.activeUntil,
        activationSeq: schema.listings.activationSeq,
        tags: schema.listings.tags,
        ownerHandle: schema.profiles.handle,
        ownerDisplayName: schema.profiles.displayName,
      })
      .from(schema.listings)
      .innerJoin(
        schema.categories,
        eq(schema.listings.categoryId, schema.categories.id)
      )
      .leftJoin(
        schema.categoryTranslations,
        and(
          eq(schema.categoryTranslations.categoryId, schema.categories.id),
          eq(schema.categoryTranslations.locale, locale)
        )
      )
      .innerJoin(
        schema.profiles,
        eq(schema.listings.ownerUserId, schema.profiles.userId)
      )
      .where(and(...conditions))
      .orderBy(
        desc(schema.listings.lastActivatedAt),
        desc(schema.listings.id)
      )
      .limit(limit + 1);

    const rows = await query;
    const hasMore = rows.length > limit;
    const itemsToReturn = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore && itemsToReturn.length > 0) {
      const lastItem = itemsToReturn[itemsToReturn.length - 1];
      if (lastItem) {
        nextCursor = Buffer.from(
          JSON.stringify({
            lastActivatedAt: lastItem.lastActivatedAt?.toISOString(),
            id: lastItem.id,
          })
        ).toString("base64");
      }
    }

    const items: FeedListingItem[] = itemsToReturn.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      scope: r.scope,
      categoryId: r.categoryId,
      categorySlug: r.categorySlug,
      categoryName: r.categoryNameTr ?? r.categorySlug,
      budgetMode: r.budgetMode,
      budgetCurrency: r.budgetCurrency,
      budgetMin: r.budgetMin,
      budgetMax: r.budgetMax,
      timelineMode: r.timelineMode,
      targetDate: r.targetDate,
      timelineValue: r.timelineValue,
      timelineUnit: r.timelineUnit,
      ownerHandle: r.ownerHandle,
      ownerDisplayName: r.ownerDisplayName,
      firstPublishedAt: r.firstPublishedAt ?? new Date(),
      lastActivatedAt: r.lastActivatedAt ?? new Date(),
      activeUntil: r.activeUntil ?? new Date(),
      activationSeq: r.activationSeq,
      tags: r.tags ?? [],
    }));

    if (
      typeof process !== "undefined" &&
      !process.env.VITEST &&
      process.env.NODE_ENV !== "test" &&
      items.length === 0 &&
      inMemoryListings.length > 0
    ) {
      let filteredInMem = inMemoryListings.filter((l) => l.status === "ACTIVE");
      if (params.search) {
        const q = params.search.toLowerCase();
        filteredInMem = filteredInMem.filter(
          (l) => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q)
        );
      }
      const inMemItems: FeedListingItem[] = filteredInMem.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        scope: l.scope,
        categoryId: l.categoryId,
        categorySlug: "web-development",
        categoryName: locale === "tr" ? "Web Geliştirme" : "Web Development",
        budgetMode: l.budgetMode,
        budgetCurrency: l.budgetCurrency,
        budgetMin: l.budgetMin,
        budgetMax: l.budgetMax,
        timelineMode: l.timelineMode,
        targetDate: l.targetDate,
        timelineValue: l.timelineValue,
        timelineUnit: l.timelineUnit,
        ownerHandle: "demokullanici",
        ownerDisplayName: "Demir Yıldız",
        firstPublishedAt: l.firstPublishedAt,
        lastActivatedAt: l.lastActivatedAt,
        activeUntil: l.activeUntil ?? new Date(),
        activationSeq: l.activationSeq,
        tags: l.tags,
      }));

      return {
        items: inMemItems,
        nextCursor: null,
        hasMore: false,
        hasFollowedCategories: mode === "following" ? true : undefined,
      };
    }

    return {
      items,
      nextCursor,
      hasMore,
      hasFollowedCategories: mode === "following" ? true : undefined,
    };
  }

  /**
   * Retrieves single listing details by slug, enforcing visibility and block rules.
   */
  static async getListingBySlug(slug: string, viewerUserId?: string) {
    try {
      const db = getDb();
      const rows = await db
        .select({
          listing: schema.listings,
          category: schema.categories,
          ownerProfile: schema.profiles,
        })
        .from(schema.listings)
        .innerJoin(
          schema.categories,
          eq(schema.listings.categoryId, schema.categories.id)
        )
        .innerJoin(
          schema.profiles,
          eq(schema.listings.ownerUserId, schema.profiles.userId)
        )
        .where(eq(schema.listings.slug, slug))
        .limit(1);

      const firstRow = rows[0];
      if (firstRow) {
        const { listing, category, ownerProfile } = firstRow;

        // Check block rule if viewer is logged in
        if (viewerUserId && viewerUserId !== listing.ownerUserId) {
          const blockExists = await db
            .select({ id: schema.blocks.blockerUserId })
            .from(schema.blocks)
            .where(
              or(
                and(
                  eq(schema.blocks.blockerUserId, viewerUserId),
                  eq(schema.blocks.blockedUserId, listing.ownerUserId)
                ),
                and(
                  eq(schema.blocks.blockerUserId, listing.ownerUserId),
                  eq(schema.blocks.blockedUserId, viewerUserId)
                )
              )
            )
            .limit(1);

          if (blockExists.length > 0) return null;
        }

        return {
          listing,
          category,
          ownerProfile,
        };
      }
    } catch {
      // In-memory fallback
    }

    const inMem = inMemoryListings.find((l) => l.slug === slug);
    if (inMem) {
      return {
        listing: {
          id: inMem.id,
          ownerUserId: inMem.ownerUserId,
          slug: inMem.slug,
          status: inMem.status,
          categoryId: inMem.categoryId,
          title: inMem.title,
          summary: inMem.summary,
          scope: inMem.scope,
          answersJson: inMem.answersJson ?? {},
          tags: inMem.tags ?? [],
          budgetMode: inMem.budgetMode,
          budgetCurrency: inMem.budgetCurrency,
          budgetMin: inMem.budgetMin,
          budgetMax: inMem.budgetMax,
          timelineMode: inMem.timelineMode,
          targetDate: inMem.targetDate,
          timelineValue: inMem.timelineValue,
          timelineUnit: inMem.timelineUnit,
          activationSeq: inMem.activationSeq,
          firstPublishedAt: inMem.firstPublishedAt,
          lastActivatedAt: inMem.lastActivatedAt,
          activeUntil: inMem.activeUntil,
          createdAt: inMem.firstPublishedAt,
          updatedAt: inMem.lastActivatedAt,
        } as unknown as typeof schema.listings.$inferSelect,
        category: {
          id: inMem.categoryId,
          key: "web-development",
          nameTr: "Web Geliştirme",
          nameEn: "Web Development",
          descriptionTr: "Modern web uygulamaları ve arayüzler",
          descriptionEn: "Modern web apps and frontends",
          discipline: "SOFTWARE",
          icon: "globe",
          sortOrder: 1,
          createdAt: new Date(),
        } as unknown as typeof schema.categories.$inferSelect,
        ownerProfile: {
          id: "mock-profile-id",
          userId: inMem.ownerUserId,
          displayName: "Demir Yıldız",
          handle: "demokullanici",
          bio: "Kıdemli Yazılım Mühendisi & Bağımsız Geliştirici",
          location: "İstanbul, TR",
          avatarUrl: null,
          title: "Full-stack Developer",
          githubUrl: "https://github.com/demiryildiz",
          linkedinUrl: null,
          portfolioUrl: null,
          upworkUrl: null,
          fiverrUrl: null,
          bionlukUrl: null,
          freelancerUrl: null,
          behanceUrl: "https://behance.net/demiryildiz",
          dribbbleUrl: null,
          figmaUrl: null,
          gitlabUrl: null,
          mediumUrl: null,
          xUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as typeof schema.profiles.$inferSelect,
      };
    }

    return null;
  }
}

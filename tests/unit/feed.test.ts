import { describe, it, expect, vi } from "vitest";
import { FeedService } from "@/src/modules/listings/feed/service";

// Mock DB
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockInnerJoin = vi.fn();
const mockLeftJoin = vi.fn();

vi.mock("@/src/lib/db", () => {
  return {
    getDb: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          from: (...fArgs: unknown[]) => {
            mockFrom(...fArgs);
            return {
              innerJoin: (...jArgs: unknown[]) => {
                mockInnerJoin(...jArgs);
                return {
                  leftJoin: (...ljArgs: unknown[]) => {
                    mockLeftJoin(...ljArgs);
                    return {
                      innerJoin: (...ijArgs: unknown[]) => {
                        mockInnerJoin(...ijArgs);
                        return {
                          where: (...wArgs: unknown[]) => {
                            mockWhere(...wArgs);
                            return {
                              orderBy: (...oArgs: unknown[]) => {
                                mockOrderBy(...oArgs);
                                return {
                                  limit: (...lArgs: unknown[]) => {
                                    mockLimit(...lArgs);
                                    return Promise.resolve([]);
                                  },
                                };
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
              where: (...wArgs: unknown[]) => {
                mockWhere(...wArgs);
                return Promise.resolve([]);
              },
            };
          },
        };
      },
    }),
    schema: {
      listings: {
        id: "id",
        slug: "slug",
        status: "status",
        categoryId: "category_id",
        title: "title",
        summary: "summary",
        scope: "scope",
        budgetMode: "budget_mode",
        budgetCurrency: "budget_currency",
        budgetMin: "budget_min",
        budgetMax: "budget_max",
        timelineMode: "timeline_mode",
        targetDate: "target_date",
        timelineValue: "timeline_value",
        timelineUnit: "timeline_unit",
        firstPublishedAt: "first_published_at",
        lastActivatedAt: "last_activated_at",
        activeUntil: "active_until",
        activationSeq: "activation_seq",
        viewCount: "view_count",
        clickCount: "click_count",
        tags: "tags",
        ownerUserId: "owner_user_id",
      },
      categories: {
        id: "id",
        slug: "slug",
      },
      categoryTranslations: {
        categoryId: "category_id",
        locale: "locale",
        name: "name",
      },
      categoryFollows: {
        userId: "user_id",
        categoryId: "category_id",
      },
      profiles: {
        userId: "user_id",
        handle: "handle",
        displayName: "display_name",
      },
      blocks: {
        blockerUserId: "blocker_user_id",
        blockedUserId: "blocked_user_id",
      },
    },
  };
});

describe("FeedService — Discovery, Following/All, Search, and Pagination", () => {
  it("returns empty result with hasFollowedCategories=false when user follows 0 categories in following mode", async () => {
    const result = await FeedService.getFeedListings({
      mode: "following",
      userId: "user-without-follows",
    });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.hasFollowedCategories).toBe(false);
  });

  it("handles search parameters and limits properly", async () => {
    const result = await FeedService.getFeedListings({
      mode: "all",
      search: "React Frontend Developer",
      limit: 15,
    });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("safely handles valid and corrupted pagination cursor strings", async () => {
    const invalidCursor = "invalid-not-base64-json";
    const result1 = await FeedService.getFeedListings({
      mode: "all",
      cursor: invalidCursor,
    });
    expect(result1.items).toEqual([]);

    const validCursor = Buffer.from(
      JSON.stringify({
        lastActivatedAt: new Date().toISOString(),
        id: "listing-123",
      })
    ).toString("base64");

    const result2 = await FeedService.getFeedListings({
      mode: "all",
      cursor: validCursor,
    });
    expect(result2.items).toEqual([]);
  });
});

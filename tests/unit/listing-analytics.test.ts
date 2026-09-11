import { describe, it, expect, beforeEach } from "vitest";
import { ListingService, inMemoryListings, InMemListing } from "@/src/modules/listings/service";
import { FeedService } from "@/src/modules/listings/feed/service";

describe("Listing Analytics (Görüntülenme ve Tıklanma Sayıları)", () => {
  const sampleListing: InMemListing = {
    id: "test-analytics-listing-1",
    ownerUserId: "user-123",
    slug: "test-analytics-slug-1",
    status: "ACTIVE",
    categoryId: "cat_web_dev",
    title: "Test Analytics Listing",
    summary: "Test summary",
    scope: "Test scope",
    answersJson: {},
    tags: ["React"],
    budgetMode: "FIXED_RANGE",
    budgetCurrency: "TRY",
    budgetMin: "10000",
    budgetMax: "20000",
    timelineMode: "DURATION_ESTIMATE",
    targetDate: null,
    timelineValue: 2,
    timelineUnit: "WEEKS",
    activationSeq: 1,
    viewCount: 142,
    clickCount: 89,
    firstPublishedAt: new Date(),
    lastActivatedAt: new Date(),
    activeUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  };

  beforeEach(() => {
    inMemoryListings.length = 0;
    inMemoryListings.push({ ...sampleListing });
  });

  it("stores and validates viewCount and clickCount in InMemListing", () => {
    expect(inMemoryListings.length).toBe(1);
    const listing = inMemoryListings[0]!;
    expect(typeof listing.viewCount).toBe("number");
    expect(typeof listing.clickCount).toBe("number");
    expect(listing.viewCount).toBe(142);
    expect(listing.clickCount).toBe(89);
  });

  it("atomically increments listing views via ListingService.incrementListingViews", async () => {
    const target = inMemoryListings[0]!;
    const initialViews = target.viewCount;
    const result = await ListingService.incrementListingViews(target.id);
    expect(result.viewCount).toBe(initialViews + 1);
    expect(target.viewCount).toBe(initialViews + 1);
  });

  it("atomically increments listing clicks via ListingService.trackListingClick", async () => {
    const target = inMemoryListings[0]!;
    const initialClicks = target.clickCount;
    const result = await ListingService.trackListingClick(target.id);
    expect(result.clickCount).toBe(initialClicks + 1);
    expect(target.clickCount).toBe(initialClicks + 1);
  });

  it("handles non-existent listing gracefully when incrementing views or clicks", async () => {
    const viewResult = await ListingService.incrementListingViews("non-existent-id");
    expect(viewResult.viewCount).toBe(1);

    const clickResult = await ListingService.trackListingClick("non-existent-id");
    expect(clickResult.clickCount).toBe(1);
  });

  it("returns viewCount and clickCount in FeedService.getListingBySlug", async () => {
    const target = inMemoryListings[0]!;
    const result = await FeedService.getListingBySlug(target.slug);
    expect(result).not.toBeNull();
    expect(result?.listing).toBeDefined();
    expect(result?.listing.viewCount).toBe(142);
    expect(result?.listing.clickCount).toBe(89);
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  submitOfferSchema,
  updateOfferSchema,
  rejectOfferSchema,
  REJECTION_CODES,
} from "@/src/modules/offers/validation";
import { OfferService } from "@/src/modules/offers/service";

// Mock DB
let mockListingsRows: Array<Record<string, unknown>> = [];
const mockOffersRows: Array<Record<string, unknown>> = [];
const mockBlocksRows: Array<Record<string, unknown>> = [];

vi.mock("@/src/lib/db", () => {
  return {
    getDb: () => ({
      select: () => ({
        from: (table: unknown) => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve(mockOffersRows),
                orderBy: () => Promise.resolve(mockOffersRows),
              }),
            }),
            where: () => ({
              limit: () => Promise.resolve(mockOffersRows),
              orderBy: () => Promise.resolve(mockOffersRows),
            }),
          }),
          where: () => ({
            limit: () => {
              const tbl = table as { id?: string; blockerUserId?: string } | string;
              if (tbl === "listings" || (typeof tbl === "object" && tbl?.id === "listings")) {
                return Promise.resolve(mockListingsRows);
              }
              if (
                tbl === "blocks" ||
                (typeof tbl === "object" && tbl?.blockerUserId === "blocks")
              ) {
                return Promise.resolve(mockBlocksRows);
              }
              return Promise.resolve(mockOffersRows);
            },
          }),
        }),
      }),
      transaction: async (fn: (tx: unknown) => unknown) => {
        return fn({
          insert: () => ({
            values: () => ({
              returning: () => Promise.resolve([{ id: "offer-created-123" }]),
            }),
          }),
          select: () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([{ revisionNo: 1 }]),
                }),
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([{ id: "offer-updated-123" }]),
              }),
            }),
          }),
        });
      },
    }),
    schema: {
      listings: "listings",
      offers: "offers",
      offerRevisions: "offer_revisions",
      blocks: "blocks",
      profiles: "profiles",
    },
  };
});

describe("Offers Module — Validation & Business Invariants", () => {
  const validListingId = "11111111-1111-1111-1111-111111111111";
  const validOfferId = "22222222-2222-2222-2222-222222222222";

  it("validates offer message length constraints (50-3000 chars)", () => {
    // Too short (< 50 chars)
    const shortResult = submitOfferSchema.safeParse({
      listingId: validListingId,
      message: "Too short message",
    });
    expect(shortResult.success).toBe(false);

    // Valid length (>= 50 chars)
    const validMessage =
      "Hello! I am a senior engineer with over 10 years of experience in distributed systems and Next.js.";
    const validResult = submitOfferSchema.safeParse({
      listingId: validListingId,
      message: validMessage,
      budgetCurrency: "TRY",
      budgetMin: "10000",
      budgetMax: "15000",
      estimatedDurationValue: 2,
      estimatedDurationUnit: "WEEKS",
    });
    expect(validResult.success).toBe(true);

    // Too long (> 3000 chars)
    const longResult = submitOfferSchema.safeParse({
      listingId: validListingId,
      message: "a".repeat(3001),
    });
    expect(longResult.success).toBe(false);
  });

  it("rejects emojis in offer message", () => {
    const emojiMessage =
      "Hello! I am excited to work on your project! Let's connect soon! 🚀✨ Great work!";
    const result = submitOfferSchema.safeParse({
      listingId: validListingId,
      message: emojiMessage,
    });
    expect(result.success).toBe(false);
  });

  it("rejects budgetMin > budgetMax", () => {
    const validMessage =
      "Hello! I am a senior engineer with over 10 years of experience in distributed systems and Next.js.";
    const result = submitOfferSchema.safeParse({
      listingId: validListingId,
      message: validMessage,
      budgetCurrency: "USD",
      budgetMin: "5000",
      budgetMax: "2000",
    });
    expect(result.success).toBe(false);
  });

  it("validates rejection codes and rejects emojis in rejection note", () => {
    expect(REJECTION_CODES).toContain("BUDGET_MISMATCH");
    expect(REJECTION_CODES).toContain("TIMELINE_MISMATCH");
    expect(REJECTION_CODES).toContain("SCOPE_MISMATCH");

    const validRejection = rejectOfferSchema.safeParse({
      offerId: validOfferId,
      rejectionCode: "BUDGET_MISMATCH",
      rejectionNote: "Budget exceeds project limits.",
    });
    expect(validRejection.success).toBe(true);

    const emojiRejection = rejectOfferSchema.safeParse({
      offerId: validOfferId,
      rejectionCode: "OTHER",
      rejectionNote: "Sorry not selected 😢",
    });
    expect(emojiRejection.success).toBe(false);
  });

  it("disallows listing owner from submitting an offer to own listing", async () => {
    const ownerId = "owner-1";
    mockListingsRows = [
      {
        id: validListingId,
        ownerUserId: ownerId,
        status: "ACTIVE",
        activeUntil: new Date(Date.now() + 86400000),
      },
    ];

    await expect(
      OfferService.submitOffer(ownerId, {
        listingId: validListingId,
        message: "Trying to bid on my own listing. This should fail immediately and cleanly.",
      })
    ).rejects.toThrow("You cannot submit an offer on your own listing");
  });

  it("disallows offer submission on inactive or expired listings", async () => {
    const offerorId = "offeror-1";
    mockListingsRows = [
      {
        id: validListingId,
        ownerUserId: "owner-different",
        status: "INACTIVE_EXPIRED",
        activeUntil: new Date(Date.now() - 1000),
      },
    ];

    await expect(
      OfferService.submitOffer(offerorId, {
        listingId: validListingId,
        message: "Trying to bid on an expired listing. This should fail immediately and cleanly.",
      })
    ).rejects.toThrow("Listing is not currently active for offers");
  });

  it("validates updateOfferSchema correctly", () => {
    const validUpdate = updateOfferSchema.safeParse({
      offerId: validOfferId,
      message: "Updated offer with revised scope and deliverable timeline for the client.",
      budgetCurrency: "TRY",
      budgetMin: "12000",
      budgetMax: "15000",
    });
    expect(validUpdate.success).toBe(true);
  });
});

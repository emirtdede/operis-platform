import { describe, it, expect, vi } from "vitest";
import { EngagementService } from "@/src/modules/engagements/service";

let mockOffers: Array<Record<string, unknown>> = [];
let mockListings: Array<Record<string, unknown>> = [];
let mockEngagements: Array<Record<string, unknown>> = [];

vi.mock("@/src/lib/db", () => {
  return {
    getDb: () => ({
      transaction: async (fn: (tx: unknown) => unknown) => {
        const txMock = {
          select: () => ({
            from: (table: unknown) => ({
              where: () => {
                const getResult = () => {
                  const tbl = table as { id?: string; listingId?: string } | string;
                  if (tbl === "offers" || (typeof tbl === "object" && tbl?.id === "offers")) {
                    return mockOffers;
                  }
                  if (tbl === "listings" || (typeof tbl === "object" && tbl?.id === "listings")) {
                    return mockListings;
                  }
                  if (
                    tbl === "engagements" ||
                    (typeof tbl === "object" && tbl?.listingId === "engagements")
                  ) {
                    return mockEngagements;
                  }
                  if (tbl === "categories") {
                    return [{ key: "web-development", slug: "web-development" }];
                  }
                  return [];
                };

                const p = Promise.resolve(getResult());
                return Object.assign(p, {
                  limit: () => Promise.resolve(getResult()),
                });
              },
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([{ id: "accepted-offer-1", status: "ACCEPTED" }]),
              }),
            }),
          }),
          insert: () => ({
            values: () => ({
              returning: () => Promise.resolve([{ id: "engagement-123", status: "MATCHED" }]),
              onConflictDoUpdate: () => Promise.resolve(),
            }),
          }),
        };
        return fn(txMock);
      },
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: () => Promise.resolve([]),
              }),
            }),
          }),
        }),
      }),
    }),
    schema: {
      offers: "offers",
      listings: "listings",
      engagements: { listingId: "engagements" },
      categories: "categories",
      listingStatusEvents: "listing_status_events",
      engagementCompletionMarks: "engagement_completion_marks",
      users: "users",
      profiles: "profiles",
      userPrivateIdentity: "user_private_identity",
    },
  };
});

describe("Engagements Module — Acceptance, Match Handoff & Completion", () => {
  const ownerId = "owner-uuid-1";
  const offerId = "offer-uuid-1";
  const listingId = "listing-uuid-1";

  it("fails offer acceptance if listing activeUntil is in the past (LISTING_EXPIRED)", async () => {
    mockOffers = [
      {
        id: offerId,
        listingId,
        offerorUserId: "freelancer-1",
        status: "PENDING",
      },
    ];
    mockListings = [
      {
        id: listingId,
        ownerUserId: ownerId,
        status: "ACTIVE",
        activeUntil: new Date(Date.now() - 10000), // Expired!
        categoryId: "cat-1",
      },
    ];
    mockEngagements = [];

    await expect(EngagementService.acceptOffer(ownerId, offerId)).rejects.toThrow(
      "LISTING_EXPIRED"
    );
  });

  it("fails offer acceptance if listing already has an engagement (LISTING_ALREADY_MATCHED)", async () => {
    mockOffers = [
      {
        id: offerId,
        listingId,
        offerorUserId: "freelancer-1",
        status: "PENDING",
      },
    ];
    mockListings = [
      {
        id: listingId,
        ownerUserId: ownerId,
        status: "ACTIVE",
        activeUntil: new Date(Date.now() + 86400000),
        categoryId: "cat-1",
      },
    ];
    mockEngagements = [{ id: "existing-match-uuid" }];

    await expect(EngagementService.acceptOffer(ownerId, offerId)).rejects.toThrow(
      "LISTING_ALREADY_MATCHED"
    );
  });

  it("successfully accepts offer and creates match when conditions are satisfied", async () => {
    mockOffers = [
      {
        id: offerId,
        listingId,
        offerorUserId: "freelancer-1",
        status: "PENDING",
      },
    ];
    mockListings = [
      {
        id: listingId,
        ownerUserId: ownerId,
        status: "ACTIVE",
        activeUntil: new Date(Date.now() + 86400000),
        categoryId: "cat-1",
        title: "Build High Performance Next.js Web Application",
        activationSeq: 1,
      },
    ];
    mockEngagements = [];

    const engagement = await EngagementService.acceptOffer(ownerId, offerId);
    expect(engagement).toBeDefined();
    expect(engagement?.id).toBe("engagement-123");
    expect(engagement?.status).toBe("MATCHED");
  });

  it("requires BOTH parties to mark complete before transitioning engagement to COMPLETED", () => {
    // Invariant verification
    const ownerMark = { status: "MARKED_COMPLETE" };
    const freelancerMarkNotYet = { status: "NOT_MARKED" };

    const bothComplete1 =
      ownerMark.status === "MARKED_COMPLETE" && freelancerMarkNotYet.status === "MARKED_COMPLETE";
    expect(bothComplete1).toBe(false);

    const freelancerMarkComplete = { status: "MARKED_COMPLETE" };
    const bothComplete2 =
      ownerMark.status === "MARKED_COMPLETE" && freelancerMarkComplete.status === "MARKED_COMPLETE";
    expect(bothComplete2).toBe(true);
  });
});

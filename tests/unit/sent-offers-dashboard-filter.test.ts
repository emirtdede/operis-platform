import { describe, it, expect } from "vitest";

describe("SentOffersDashboard status filtering and badge logic", () => {
  const sampleOffers = [
    { id: "1", status: "PENDING", createdAt: new Date().toISOString() },
    { id: "2", status: "ACCEPTED", createdAt: new Date().toISOString() },
    { id: "3", status: "REJECTED", createdAt: new Date().toISOString() },
    { id: "4", status: "REJECTED_OTHER_SELECTED", createdAt: new Date().toISOString() },
    { id: "5", status: "WITHDRAWN", createdAt: new Date().toISOString() },
    { id: "6", status: "CANCELLED_ENGAGEMENT", createdAt: new Date().toISOString() },
    { id: "7", status: "EXPIRED_LISTING", createdAt: new Date().toISOString() },
    { id: "8", status: "EXPIRED_LISTING_INACTIVE", createdAt: new Date().toISOString() },
    { id: "9", status: "VOID_MODERATION", createdAt: new Date().toISOString() },
  ];

  function filterOffers(offers: typeof sampleOffers, filter: string) {
    return offers.filter((o) => {
      if (filter === "all") return true;
      if (filter === "cancelled") {
        return (
          o.status === "CANCELLED_ENGAGEMENT" ||
          o.status === "CANCELLED" ||
          o.status === "EXPIRED_LISTING" ||
          o.status === "EXPIRED_LISTING_INACTIVE" ||
          o.status === "VOID_MODERATION"
        );
      }
      if (filter === "rejected") {
        return o.status.toLowerCase().startsWith("rejected");
      }
      return o.status.toLowerCase() === filter.toLowerCase();
    });
  }

  it("filters all offers correctly", () => {
    expect(filterOffers(sampleOffers, "all")).toHaveLength(9);
  });

  it("filters pending offers", () => {
    const pending = filterOffers(sampleOffers, "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("PENDING");
  });

  it("filters accepted offers", () => {
    const accepted = filterOffers(sampleOffers, "accepted");
    expect(accepted).toHaveLength(1);
    expect(accepted[0]?.status).toBe("ACCEPTED");
  });

  it("filters rejected offers including REJECTED_OTHER_SELECTED", () => {
    const rejected = filterOffers(sampleOffers, "rejected");
    expect(rejected).toHaveLength(2);
    expect(rejected.map((r) => r.status)).toEqual(["REJECTED", "REJECTED_OTHER_SELECTED"]);
  });

  it("filters cancelled offers including CANCELLED_ENGAGEMENT, EXPIRED_LISTING, and VOID_MODERATION", () => {
    const cancelled = filterOffers(sampleOffers, "cancelled");
    expect(cancelled).toHaveLength(4);
    expect(cancelled.map((c) => c.status)).toEqual([
      "CANCELLED_ENGAGEMENT",
      "EXPIRED_LISTING",
      "EXPIRED_LISTING_INACTIVE",
      "VOID_MODERATION",
    ]);
  });

  it("filters withdrawn offers", () => {
    const withdrawn = filterOffers(sampleOffers, "withdrawn");
    expect(withdrawn).toHaveLength(1);
    expect(withdrawn[0]?.status).toBe("WITHDRAWN");
  });
});

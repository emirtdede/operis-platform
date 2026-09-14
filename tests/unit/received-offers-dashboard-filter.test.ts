import { describe, it, expect } from "vitest";

describe("ReceivedOffersDashboard status filtering and badge logic", () => {
  const sampleReceivedOffers = [
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

  function filterReceivedOffers(offers: typeof sampleReceivedOffers, filter: string) {
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

  function getBadgeDetails(status: string, isTr: boolean) {
    let badgeVariant: "success" | "secondary" | "danger" | "neutral" | "outline" = "outline";
    let badgeLabel = status;

    if (status === "ACCEPTED") {
      badgeVariant = "success";
      badgeLabel = isTr ? "Kabul Edildi" : "Accepted";
    } else if (status === "PENDING") {
      badgeVariant = "secondary";
      badgeLabel = isTr ? "Beklemede" : "Pending";
    } else if (status === "CANCELLED_ENGAGEMENT" || status === "CANCELLED") {
      badgeVariant = "danger";
      badgeLabel = isTr ? "İş İptal Edildi" : "Cancelled";
    } else if (status === "EXPIRED_LISTING" || status === "EXPIRED_LISTING_INACTIVE") {
      badgeVariant = "neutral";
      badgeLabel = isTr ? "İlan Süresi Doldu" : "Listing Expired";
    } else if (status === "VOID_MODERATION") {
      badgeVariant = "danger";
      badgeLabel = isTr ? "Yönetimce İptal" : "Voided by Admin";
    } else if (status === "REJECTED_OTHER_SELECTED") {
      badgeVariant = "neutral";
      badgeLabel = isTr ? "Başka Teklif Seçildi" : "Other Selected";
    } else if (status.toLowerCase().startsWith("rejected")) {
      badgeVariant = "danger";
      badgeLabel = isTr ? "Reddedildi" : "Rejected";
    } else if (status === "WITHDRAWN") {
      badgeVariant = "outline";
      badgeLabel = isTr ? "Geri Çekildi" : "Withdrawn";
    }

    return { badgeVariant, badgeLabel };
  }

  it("filters all received offers correctly", () => {
    expect(filterReceivedOffers(sampleReceivedOffers, "all")).toHaveLength(9);
  });

  it("filters pending received offers", () => {
    const pending = filterReceivedOffers(sampleReceivedOffers, "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.status).toBe("PENDING");
  });

  it("filters accepted received offers", () => {
    const accepted = filterReceivedOffers(sampleReceivedOffers, "accepted");
    expect(accepted).toHaveLength(1);
    expect(accepted[0]?.status).toBe("ACCEPTED");
  });

  it("filters rejected received offers including other selected", () => {
    const rejected = filterReceivedOffers(sampleReceivedOffers, "rejected");
    expect(rejected).toHaveLength(2);
    expect(rejected.map((r) => r.status)).toEqual(["REJECTED", "REJECTED_OTHER_SELECTED"]);
  });

  it("filters cancelled, expired, and moderated received offers", () => {
    const cancelled = filterReceivedOffers(sampleReceivedOffers, "cancelled");
    expect(cancelled).toHaveLength(4);
    expect(cancelled.map((c) => c.status)).toEqual([
      "CANCELLED_ENGAGEMENT",
      "EXPIRED_LISTING",
      "EXPIRED_LISTING_INACTIVE",
      "VOID_MODERATION",
    ]);
  });

  it("filters withdrawn received offers", () => {
    const withdrawn = filterReceivedOffers(sampleReceivedOffers, "withdrawn");
    expect(withdrawn).toHaveLength(1);
    expect(withdrawn[0]?.status).toBe("WITHDRAWN");
  });

  it("correctly localizes badges for all statuses in TR and EN", () => {
    expect(getBadgeDetails("ACCEPTED", true)).toEqual({
      badgeVariant: "success",
      badgeLabel: "Kabul Edildi",
    });
    expect(getBadgeDetails("ACCEPTED", false)).toEqual({
      badgeVariant: "success",
      badgeLabel: "Accepted",
    });

    expect(getBadgeDetails("PENDING", true)).toEqual({
      badgeVariant: "secondary",
      badgeLabel: "Beklemede",
    });

    expect(getBadgeDetails("CANCELLED_ENGAGEMENT", true)).toEqual({
      badgeVariant: "danger",
      badgeLabel: "İş İptal Edildi",
    });

    expect(getBadgeDetails("EXPIRED_LISTING", true)).toEqual({
      badgeVariant: "neutral",
      badgeLabel: "İlan Süresi Doldu",
    });

    expect(getBadgeDetails("VOID_MODERATION", true)).toEqual({
      badgeVariant: "danger",
      badgeLabel: "Yönetimce İptal",
    });

    expect(getBadgeDetails("WITHDRAWN", true)).toEqual({
      badgeVariant: "outline",
      badgeLabel: "Geri Çekildi",
    });
  });
});

export interface SeedEngagement {
  id: string;
  listingId: string;
  acceptedOfferId: string;
  ownerUserId: string;
  freelancerUserId: string;
  status: "MATCHED" | "COMPLETED" | "CANCELLED";
  listingTitleSnapshot: string;
  listingCategorySnapshot: string;
  matchedAt: Date;
  completedAt?: Date | null;
}

export const SEED_ENGAGEMENTS: SeedEngagement[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    listingId: "e0000000-0000-0000-0000-000000000004",
    acceptedOfferId: "f0000000-0000-0000-0000-000000000002",
    ownerUserId: "d0000000-0000-0000-0000-000000000001",
    freelancerUserId: "d0000000-0000-0000-0000-000000000002",
    status: "COMPLETED",
    listingTitleSnapshot: "Kurumsal Dashboard ve Analitik Paneli Geliştirilmesi",
    listingCategorySnapshot: "web_frontend",
    matchedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

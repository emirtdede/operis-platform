export interface SeedOffer {
  id: string;
  listingId: string;
  offerorUserId: string;
  listingActivationSeq: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  message: string;
  budgetCurrency: string;
  budgetMin: string;
  budgetMax: string;
  estimatedDurationValue: number;
  estimatedDurationUnit: string;
}

export const SEED_OFFERS: SeedOffer[] = [
  {
    id: "f0000000-0000-0000-0000-000000000001",
    listingId: "e0000000-0000-0000-0000-000000000001",
    offerorUserId: "d0000000-0000-0000-0000-000000000002",
    listingActivationSeq: 1,
    status: "PENDING",
    message:
      "Merhaba, Next.js 15 ve Tailwind CSS ile daha önce birçok kurumsal e-ticaret ön yüzü geliştirdim. İlanınızda belirtilen tüm isterleri 2 hafta içerisinde eksiksiz ve test edilmiş olarak teslim edebilirim.",
    budgetCurrency: "TRY",
    budgetMin: "30000",
    budgetMax: "35000",
    estimatedDurationValue: 2,
    estimatedDurationUnit: "WEEKS",
  },
  {
    id: "f0000000-0000-0000-0000-000000000002",
    listingId: "e0000000-0000-0000-0000-000000000004",
    offerorUserId: "d0000000-0000-0000-0000-000000000002",
    listingActivationSeq: 1,
    status: "ACCEPTED",
    message:
      "Dashboard ve analitik bileşenlerini belirtilen takvim ve mimari standartlarda yüksek kaliteyle teslim etmeye hazırım.",
    budgetCurrency: "TRY",
    budgetMin: "42000",
    budgetMax: "45000",
    estimatedDurationValue: 3,
    estimatedDurationUnit: "WEEKS",
  },
];

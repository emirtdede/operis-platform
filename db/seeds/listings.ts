export interface SeedListing {
  id: string;
  ownerUserId: string;
  categoryKey: string;
  slug: string;
  status: "ACTIVE" | "DRAFT" | "COMPLETED";
  title: string;
  summary: string;
  scope: string;
  answersJson: Record<string, unknown>;
  tags: string[];
  budgetMode: "FIXED_RANGE" | "HOURLY_RATE" | "OPEN_BID";
  budgetCurrency: string;
  budgetMin: string;
  budgetMax: string;
  timelineMode: "DURATION_ESTIMATE" | "TARGET_DATE";
  timelineValue: number;
  timelineUnit: string;
  viewCount: number;
  clickCount: number;
  matchedAt?: Date;
  completedAt?: Date;
}

export const SEED_LISTINGS: SeedListing[] = [
  {
    id: "e0000000-0000-0000-0000-000000000001",
    ownerUserId: "d0000000-0000-0000-0000-000000000001",
    categoryKey: "web_frontend",
    slug: "nextjs-ve-tailwind-ile-modern-e-ticaret-arayuzu-gelistirilmesi-a1b2c3",
    status: "ACTIVE",
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
    timelineValue: 2,
    timelineUnit: "WEEKS",
    viewCount: 142,
    clickCount: 89,
  },
  {
    id: "e0000000-0000-0000-0000-000000000002",
    ownerUserId: "d0000000-0000-0000-0000-000000000001",
    categoryKey: "mobile_ios",
    slug: "flutter-ile-cross-platform-mobil-uygulama-gelistirilmesi-d4e5f6",
    status: "ACTIVE",
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
    timelineValue: 3,
    timelineUnit: "WEEKS",
    viewCount: 98,
    clickCount: 64,
  },
  {
    id: "e0000000-0000-0000-0000-000000000003",
    ownerUserId: "d0000000-0000-0000-0000-000000000001",
    categoryKey: "backend_apis",
    slug: "yuksek-trafikli-fintech-projesi-icin-go-ve-postgresql-api-g7h8i9",
    status: "ACTIVE",
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
    timelineValue: 4,
    timelineUnit: "WEEKS",
    viewCount: 215,
    clickCount: 137,
  },
  {
    id: "e0000000-0000-0000-0000-000000000004",
    ownerUserId: "d0000000-0000-0000-0000-000000000001",
    categoryKey: "web_frontend",
    slug: "kurumsal-dashboard-ve-analitik-paneli-gelistirilmesi-x9y8z7",
    status: "COMPLETED",
    title: "Kurumsal Dashboard ve Analitik Paneli Geliştirilmesi",
    summary:
      "Operis için gerçek zamanlı grafikler ve raporlama modülleri içeren modern yönetim paneli geliştirildi.",
    scope:
      "Dashboard, Chart.js, React Table ve PostgreSQL entegrasyonu başarıyla tamamlandı ve canlı ortama alındı.",
    answersJson: { authRequired: true, adminRequired: true, responsiveRequired: true },
    tags: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind CSS"],
    budgetMode: "FIXED_RANGE",
    budgetCurrency: "TRY",
    budgetMin: "40000",
    budgetMax: "50000",
    timelineMode: "DURATION_ESTIMATE",
    timelineValue: 3,
    timelineUnit: "WEEKS",
    viewCount: 312,
    clickCount: 204,
    matchedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

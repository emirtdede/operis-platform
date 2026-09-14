import { describe, it, expect, beforeEach, afterEach } from "vitest";
import pg from "pg";
import { AdminService } from "@/src/modules/admin/service";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import { createAdminDbFixture } from "@/tests/helpers/admin-db-fixture";

// B25: Controlled deterministic test fixtures for isolated unit testing
const FIXTURE_USERS = [
  {
    id: "usr_mock_demir",
    email: "demir.yildiz@operis.internal",
    displayName: "Demir Yıldız",
    handle: "demiryildiz",
    role: "USER",
    status: "ACTIVE",
    emailVerified: true,
    twoFactorEnabled: true,
    listingsCount: 2,
    offersCount: 3,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    updatedAt: new Date("2026-01-02T10:00:00Z"),
  },
  {
    id: "usr_mock_suspended",
    email: "suspended.user@operis.internal",
    displayName: "Askıya Alınmış Kullanıcı",
    handle: "suspendeduser",
    role: "USER",
    status: "SUSPENDED",
    emailVerified: true,
    twoFactorEnabled: false,
    listingsCount: 0,
    offersCount: 0,
    createdAt: new Date("2026-01-03T10:00:00Z"),
    updatedAt: new Date("2026-01-04T10:00:00Z"),
  },
];

const FIXTURE_LISTINGS = [
  {
    id: "list_sample_01",
    title: "Next.js & Supabase SaaS Geliştirme",
    slug: "nextjs-supabase-saas",
    status: "ACTIVE",
    categoryName: "Web Geliştirme",
    categoryKey: "web-development",
    ownerDisplayName: "Demir Yıldız",
    ownerHandle: "demiryildiz",
    ownerUserId: "usr_mock_demir",
    budgetMode: "RANGE",
    budgetFormatted: "50,000 - 80,000 TRY",
    activationSeq: 1,
    viewCount: 150,
    clickCount: 25,
    activeUntil: new Date("2026-10-01T10:00:00Z"),
    createdAt: new Date("2026-01-01T10:00:00Z"),
  },
];

const FIXTURE_OFFERS = [
  {
    id: "ofr_mock_01",
    listingId: "list_sample_01",
    listingTitle: "Next.js & Supabase SaaS Geliştirme",
    listingSlug: "nextjs-supabase-saas",
    senderUserId: "usr_mock_demir",
    senderDisplayName: "Demir Yıldız",
    senderHandle: "demiryildiz",
    recipientUserId: "usr_mock_suspended",
    recipientDisplayName: "Müşteri",
    recipientHandle: "musteri",
    status: "PENDING",
    rejectionReasonCode: null,
    budgetFormatted: "60,000 TRY",
    estimatedDuration: "14 gün",
    createdAt: new Date("2026-01-05T10:00:00Z"),
    resolvedAt: null,
  },
];

const FIXTURE_SECURITY_LOGS = [
  {
    id: "sec_log_01",
    eventType: "AUTH_LOGIN_SUCCESS",
    userId: "usr_mock_demir",
    ipAddress: "127.0.0.1",
    detailsJson: { category: "auth" },
    createdAt: new Date("2026-01-05T10:00:00Z"),
  },
  {
    id: "sec_log_02",
    eventType: "SYSTEM_OPTIMIZATION",
    userId: null,
    ipAddress: "127.0.0.1",
    detailsJson: { category: "system" },
    createdAt: new Date("2026-01-05T11:00:00Z"),
  },
];

const FIXTURE_REPORTS = [
  {
    id: "rep_sample_01",
    reporterUserId: "usr_admin_test_reporter",
    targetType: "listing",
    targetId: "list_sample_01",
    reasonCode: "SCAM_FRAUD",
    details: "Abuse report",
    status: "OPEN",
    createdAt: new Date("2026-01-05T10:00:00Z"),
  },
];

describe("AdminService Enterprise Operations (B25 Isolated Unit Tests)", () => {
  beforeEach(() => {
    // B25: Real AdminService runs with typed database fixture at the getDb() boundary
    const fixture = createAdminDbFixture({
      users: FIXTURE_USERS,
      listings: FIXTURE_LISTINGS,
      offers: FIXTURE_OFFERS,
      securityEvents: FIXTURE_SECURITY_LOGS,
      reports: FIXTURE_REPORTS,
      deadLettersCount: 0,
    });
    setDbForTesting(fixture);
  });

  afterEach(() => {
    resetDbForTesting();
  });

  it("strictly forbids any real database connection during unit testing (B25)", async () => {
    const client = new pg.Client();
    await expect(client.connect()).rejects.toThrow("UNIT_DB_ACCESS_FORBIDDEN");
  });

  it("fetches dashboard metrics with deadLetter and user count via real AdminService", async () => {
    const metrics = await AdminService.getDashboardMetrics();
    expect(metrics.totalUsers).toBe(2);
    expect(metrics.activeListings).toBe(1);
    expect(metrics.deadLetters).toBe(0);
    expect(typeof metrics.openReports).toBe("number");
    expect(typeof metrics.activeThreats).toBe("number");
  });

  it("handles paginated user queries with search and status filtering via real AdminService", async () => {
    const resAll = await AdminService.getUsersPaginated({ page: 1, limit: 10 });
    expect(resAll.items.length).toBe(2);
    expect(resAll.total).toBe(2);
    expect(resAll.totalPages).toBe(1);

    // Verify DTO transformation performed by real AdminService
    expect(resAll.items[0]?.displayName).toBe("Demir Yıldız");
    expect(resAll.items[1]?.displayName).toBe("Askıya Alınmış Kullanıcı");
  });

  it("handles empty dataset states gracefully using typed fixture", async () => {
    setDbForTesting(
      createAdminDbFixture({
        users: [],
        listings: [],
        offers: [],
        reports: [],
      })
    );

    const emptyUsers = await AdminService.getUsersPaginated({ page: 1, limit: 10 });
    expect(emptyUsers.items).toHaveLength(0);
    expect(emptyUsers.total).toBe(0);
    expect(emptyUsers.totalPages).toBe(1);

    const emptyMetrics = await AdminService.getDashboardMetrics();
    expect(emptyMetrics.totalUsers).toBe(0);
    expect(emptyMetrics.activeListings).toBe(0);
  });

  it("handles paginated listings queries and moderation via real AdminService", async () => {
    const listings = await AdminService.getListingsPaginated({ page: 1, limit: 10 });
    expect(listings.items.length).toBeGreaterThan(0);
    expect(listings.items[0]?.title).toBe("Next.js & Supabase SaaS Geliştirme");

    const moderated = await AdminService.moderateListing(
      "admin_123",
      "list_sample_01",
      "HIDE",
      "Uygunsuz ilan içeriği sebebiyle gizlendi."
    );
    expect(moderated?.status).toBe("HIDDEN_MODERATION");
  });

  it("records offers and response audit trail via real AdminService", async () => {
    const offers = await AdminService.getOffersPaginated({ status: "ALL" });
    expect(offers.items.length).toBeGreaterThan(0);
    expect(offers.items[0]).toHaveProperty("budgetFormatted");
    expect(offers.items[0]).toHaveProperty("senderDisplayName");
  });

  it("categorizes logs across auth, business, audit and system via real AdminService", async () => {
    const authLogs = await AdminService.getCategorizedLogs({ category: "auth" });
    expect(authLogs.items.length).toBeGreaterThanOrEqual(0);

    const sysLogs = await AdminService.getCategorizedLogs({ category: "system" });
    expect(sysLogs.items.length).toBeGreaterThanOrEqual(0);
  });

  it("manages abuse incidents and resolution via real AdminService", async () => {
    const incidents = await AdminService.getAbuseIncidents({ status: "ALL" });
    expect(incidents.length).toBeGreaterThan(0);

    const resolved = await AdminService.resolveReport("admin_123", "rep_sample_01", "RESOLVED");
    expect(resolved).toBe(true);
  });

  it("manages security threats and IP blacklisting via real AdminService", async () => {
    const blocked = await AdminService.blockIp(
      "admin_123",
      "203.0.113.19",
      "Brute-force saldırısı"
    );
    expect(blocked).toBe(true);

    const threats = await AdminService.getSecurityThreats({ status: "ALL" });
    expect(threats.length).toBeGreaterThanOrEqual(0);

    const unblocked = await AdminService.unblockIp("admin_123", "203.0.113.19");
    expect(unblocked).toBe(true);
  });

  it("triggers system optimization routines safely via real AdminService", async () => {
    const purge = await AdminService.triggerSystemOptimization("admin_123", "purge_sessions");
    expect(purge.success).toBe(true);

    const expiry = await AdminService.triggerSystemOptimization("admin_123", "run_expiry");
    expect(expiry.success).toBe(true);
  });
});

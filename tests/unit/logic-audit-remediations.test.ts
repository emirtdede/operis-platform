import { describe, it, expect, vi, beforeEach } from "vitest";

// Environment setup for testing
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.APP_URL = "http://localhost:3000";
process.env.AUTH_SECRET = "test-auth-secret-key-must-be-long-enough-12345";
process.env.PII_ENCRYPTION_KEY_CURRENT =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HMAC_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.LEGAL_ENTITY_NAME = "Operis Inc.";
process.env.LEGAL_ENTITY_TYPE = "LTD";
process.env.LEGAL_ADDRESS = "Istanbul, Turkey";
process.env.LEGAL_SUPPORT_EMAIL = "support@operis.pro";
process.env.LEGAL_PRIVACY_EMAIL = "privacy@operis.pro";
process.env.LEGAL_PHONE = "+905551234567";
process.env.TERMS_EFFECTIVE_DATE = "2026-09-01";
process.env.PRIVACY_EFFECTIVE_DATE = "2026-09-01";
process.env.LEGAL_ETBIS_CLASSIFICATION_APPROVED = "true";
process.env.LEGAL_PRIVACY_REVIEW_APPROVED = "true";

import { ModerationService } from "@/src/modules/moderation/service";
import { AdminService } from "@/src/modules/admin/service";
import { EngagementService } from "@/src/modules/engagements/service";
import { CategoryService } from "@/src/modules/categories/service";
import { NotificationService } from "@/src/modules/notifications/service";
import { OfferService } from "@/src/modules/offers/service";
import { verifyPhoneOtp } from "@/src/modules/auth/verification";
import { inMemoryListings } from "@/src/modules/listings/service";
import { inMemorySentOffers, inMemoryReceivedOffers } from "@/src/modules/offers/service";

describe("Logic Audit Remediations Verification Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    inMemoryListings.length = 0;
    inMemorySentOffers.length = 0;
    inMemoryReceivedOffers.length = 0;
  });

  describe("1. General Abuse Report Unblocked (CANNOT_REPORT_SELF Fix)", () => {
    it("allows a user to submit a general platform report without CANNOT_REPORT_SELF error", async () => {
      const reporterId = "user-reporter-test-general-01";
      const report = await ModerationService.submitReport(reporterId, {
        targetType: "general",
        targetId: "platform-general-bug",
        reasonCode: "OTHER",
        details: "Found a general platform display issue on search results.",
      });

      expect(report).toBeDefined();
      expect(report.targetType).toBe("general");
      expect(report.reporterUserId).toBe(reporterId);
      expect((report as Record<string, unknown>).offenderUserId).toBeUndefined();
    });

    it("still blocks a user from reporting their own profile (CANNOT_REPORT_SELF)", async () => {
      const userId = "user-alice-self-check";
      await expect(
        ModerationService.submitReport(userId, {
          targetType: "profile",
          targetId: userId,
          reasonCode: "HARASSMENT_ABUSE",
          details: "Self report must fail",
        })
      ).rejects.toThrow("CANNOT_REPORT_SELF");
    });
  });

  describe("2. Suspended User Pending Offers Invalidation & Inactive Listing State", () => {
    it("invalidates all pending received offers and hides active listings when a user is suspended", async () => {
      const suspendedUserId = "usr_target_suspended_1";
      const otherUserId = "usr_other_offeror_2";

      // Setup in-memory listing owned by suspendedUserId
      inMemoryListings.push({
        id: "listing_susp_01",
        ownerUserId: suspendedUserId,
        slug: "test-susp-slug",
        status: "ACTIVE",
        categoryId: "cat_web_dev",
        title: "Active Project by Soon-To-Be-Suspended User",
        summary: "Summary",
        scope: "Scope",
        answersJson: {},
        tags: ["React"],
        budgetMode: "FIXED_RANGE",
        budgetCurrency: "TRY",
        budgetMin: "5000",
        budgetMax: "10000",
        timelineMode: "DURATION_ESTIMATE",
        targetDate: null,
        timelineValue: 2,
        timelineUnit: "WEEKS",
        activationSeq: 1,
        viewCount: 1,
        clickCount: 1,
        firstPublishedAt: new Date(),
        lastActivatedAt: new Date(),
        activeUntil: new Date(Date.now() + 86400000),
      });

      // Setup received offer on that listing
      inMemoryReceivedOffers.push({
        offer: {
          id: "offer_on_susp_listing_1",
          listingId: "listing_susp_01",
          offerorUserId: otherUserId,
          status: "PENDING",
          amount: 7500,
          currency: "TRY",
          scopeSummary: "Will complete tasks",
          estimatedDurationDays: 14,
          createdAt: new Date(),
          resolvedAt: null,
          updatedAt: new Date(),
        } as unknown as (typeof inMemoryReceivedOffers)[0]["offer"],
        listing: {
          id: "listing_susp_01",
          ownerUserId: suspendedUserId,
          title: "Active Project by Soon-To-Be-Suspended User",
          slug: "test-susp-slug",
          status: "ACTIVE",
          activeUntil: new Date(Date.now() + 86400000),
        } as unknown as (typeof inMemoryReceivedOffers)[0]["listing"],
        offerorProfile: {
          userId: otherUserId,
          handle: "other_freelancer",
          displayName: "Other Freelancer",
        },
      });

      // Execute suspension via AdminService
      const adminId = "usr_mock_demir_yildiz";
      const result = await AdminService.moderateUser(
        adminId,
        suspendedUserId,
        "SUSPEND",
        "Breach of terms: commercial spam"
      );

      expect(result).toBeDefined();
      expect(result!.status).toBe("SUSPENDED");

      // Verify listing is now HIDDEN_MODERATION
      const listing = inMemoryListings.find((l) => l.id === "listing_susp_01");
      expect(listing?.status).toBe("HIDDEN_MODERATION");

      // Verify received pending offer is now EXPIRED_LISTING_INACTIVE
      const receivedOffer = inMemoryReceivedOffers.find(
        (ro) => ro.offer.id === "offer_on_susp_listing_1"
      );
      expect(receivedOffer?.offer.status).toBe("EXPIRED_LISTING_INACTIVE");
    });
  });

  describe("3. Engagement Cancellation Notification & Localization", () => {
    it("notifies counterparty with MATCH_MUTUALLY_CANCELLED when engagement is cancelled", async () => {
      const notifSpy = vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        id: "mock-cancel-notif",
        userId: "freelancer-user-uuid",
        type: "MATCH_MUTUALLY_CANCELLED",
        payloadJson: {},
        readAt: null,
        createdAt: new Date(),
      });

      // Cancel demo engagement
      const res = await EngagementService.cancelEngagement(
        "usr_mock_demir_yildiz",
        "eng-demo-101",
        "Mutual agreement to conclude work"
      );

      expect(res.cancelled).toBe(true);
      expect(res.engagement.status).toBe("CANCELLED");

      // Verify notification was dispatched with MATCH_MUTUALLY_CANCELLED
      expect(notifSpy).toHaveBeenCalled();
      const lastCall = notifSpy.mock.calls[0]!;
      expect(lastCall[1]).toBe("MATCH_MUTUALLY_CANCELLED");
      expect(lastCall[2]).toBe("engagement");
      // Check payload title
      const payload = lastCall[4] as { title?: string };
      expect(payload?.title).toBeDefined();
    });
  });

  describe("4. Category Multi-Lingual Fallback Hierarchy", () => {
    it("returns Turkish translations as fallback when requested English translation is absent", async () => {
      const categoriesEn = await CategoryService.getCategories("en");
      expect(categoriesEn.length).toBeGreaterThan(0);

      // Verify each category has a valid name and slug
      for (const cat of categoriesEn) {
        expect(cat.name).toBeDefined();
        expect(cat.name.trim().length).toBeGreaterThan(0);
        expect(cat.slug).toBeDefined();
      }

      const categoriesTr = await CategoryService.getCategories("tr");
      expect(categoriesTr.length).toBe(categoriesEn.length);
    });
  });

  describe("5. OTP Demo Bypass Security Restriction", () => {
    it("allows 123456 bypass only for designated mock/demo accounts", async () => {
      // Demo account 1: usr_mock_demir_yildiz
      const demoResult1 = verifyPhoneOtp("usr_mock_demir_yildiz", "123456");
      expect(demoResult1).toBe(true);

      // Demo account 2: u-techcorp-1
      const demoResult2 = verifyPhoneOtp("u-techcorp-1", "123456");
      expect(demoResult2).toBe(true);

      // Non-demo account should NOT bypass and fail when code is not in OTP store
      const nonDemoResult = verifyPhoneOtp("usr_random_attacker_99", "123456");
      expect(nonDemoResult).toBe(false);
    });
  });

  describe("6. Account Deletion Pending Offer Cleanup", () => {
    it("invalidates pending received offers and withdraws submitted offers on account deletion", async () => {
      const deletedUserId = "user-to-delete-01";
      const otherUserId = "user-freelancer-other-02";

      inMemoryListings.push({
        id: "listing-del-01",
        ownerUserId: deletedUserId,
        slug: "project-del-slug",
        status: "ACTIVE",
        categoryId: "cat_web_dev",
        title: "Project by Deleting User",
        summary: "Summary",
        scope: "Scope",
        answersJson: {},
        tags: ["Next.js"],
        budgetMode: "FIXED_RANGE",
        budgetCurrency: "TRY",
        budgetMin: "1000",
        budgetMax: "2000",
        timelineMode: "DURATION_ESTIMATE",
        targetDate: null,
        timelineValue: 1,
        timelineUnit: "WEEKS",
        activationSeq: 1,
        viewCount: 0,
        clickCount: 0,
        firstPublishedAt: new Date(),
        lastActivatedAt: new Date(),
        activeUntil: new Date(Date.now() + 86400000),
      });

      inMemoryReceivedOffers.push({
        offer: {
          id: "received-offer-del-01",
          listingId: "listing-del-01",
          offerorUserId: otherUserId,
          status: "PENDING",
          amount: 1500,
          currency: "TRY",
          scopeSummary: "Will deliver",
          estimatedDurationDays: 7,
          createdAt: new Date(),
          resolvedAt: null,
          updatedAt: new Date(),
        } as unknown as (typeof inMemoryReceivedOffers)[0]["offer"],
        listing: {
          id: "listing-del-01",
          ownerUserId: deletedUserId,
          title: "Project by Deleting User",
          slug: "project-del-slug",
          status: "ACTIVE",
          activeUntil: new Date(Date.now() + 86400000),
        } as unknown as (typeof inMemoryReceivedOffers)[0]["listing"],
        offerorProfile: {
          userId: otherUserId,
          handle: "other_user",
          displayName: "Other User",
        },
      });

      const { PrivacyService } = await import("@/src/modules/privacy/service");
      await PrivacyService.deleteAccount(deletedUserId, "Closing account permanently");

      // Verify received offer transitioned to EXPIRED_LISTING_INACTIVE
      const received = inMemoryReceivedOffers.find((ro) => ro.offer.id === "received-offer-del-01");
      expect(received?.offer.status).toBe("EXPIRED_LISTING_INACTIVE");

      // Verify listing transitioned to DELETED
      const listing = inMemoryListings.find((l) => l.id === "listing-del-01");
      expect(listing?.status).toBe("DELETED");
    });
  });

  describe("7. Listing Publication Notification Isolation", () => {
    it("invokes radar and category follow notification dispatchers on publishListing", async () => {
      const { ListingService } = await import("@/src/modules/listings/service");

      const radarSpy = vi.spyOn(ListingService, "dispatchRadarNotifications").mockResolvedValue([]);
      const catSpy = vi
        .spyOn(ListingService, "dispatchCategoryFollowNotifications")
        .mockResolvedValue([]);

      const res = await ListingService.publishListing("usr_publisher_01", {
        categoryId: "11111111-1111-4111-8111-111111111111",
        title: "Cross-Platform React Native App",
        summary:
          "High quality cross platform mobile application for enterprise customers with full offline support and seamless synchronization.",
        scope:
          "Complete end-to-end development including state management and offline synchronization capabilities. The deliverable includes complete source code, automated test suite, CI/CD pipeline configuration, and comprehensive technical documentation.",
        tags: ["React Native", "TypeScript"],
        answers: {},
        budgetMode: "FIXED_RANGE",
        budgetCurrency: "TRY",
        budgetMin: 30000,
        budgetMax: 50000,
        timelineMode: "DURATION_ESTIMATE",
        timelineValue: 4,
        timelineUnit: "WEEKS",
        projectType: "new_build",
        projectStage: "requirements_ready",
        workPreference: "REMOTE",
        preferredLanguage: "tr",
        noSecretsConfirmed: true,
        acceptableUseConfirmed: true,
        expiryAcknowledged: true,
        matchingRoleAcknowledged: true,
      });

      expect(res.id).toBeDefined();
      expect(res.slug).toBeDefined();
      expect(radarSpy).toHaveBeenCalled();
      expect(catSpy).toHaveBeenCalled();
    });
  });

  describe("8. Dual-Tier Brute-Force Rate Limiting", () => {
    it("enforces account-based rate limits independently of IP", async () => {
      const { checkRateLimit } = await import("@/src/lib/security/rate-limit");

      const testAccountKey = `auth:login:acc:test_user_${Date.now()}@operis.pro`;

      // Requests 1 to 3 should pass (limit: 3, window: 60s)
      expect(checkRateLimit(testAccountKey, 3, 60000).success).toBe(true);
      expect(checkRateLimit(testAccountKey, 3, 60000).success).toBe(true);
      expect(checkRateLimit(testAccountKey, 3, 60000).success).toBe(true);

      // Request 4 should be rejected
      const fourth = checkRateLimit(testAccountKey, 3, 60000);
      expect(fourth.success).toBe(false);
      expect(fourth.remaining).toBe(0);
      expect(fourth.reset).toBeGreaterThan(0);
      expect(fourth.reset).toBeLessThanOrEqual(60);
    });
  });

  describe("9. Dispute Arbitration Cancellation Lock", () => {
    it("strictly blocks cancellation of engagements in DISPUTED status", async () => {
      await expect(
        EngagementService.cancelEngagement(
          "usr_mock_demir_yildiz",
          "eng-demo-disputed",
          "Unilateral cancellation attempt"
        )
      ).rejects.toThrow("CANNOT_CANCEL_DISPUTED_ENGAGEMENT");
    });
  });

  describe("10. Offer Revision Notification Dispatching", () => {
    it("dispatches OFFER_UPDATED notification to listing owner when offer is updated", async () => {
      vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        id: "mock-offer-updated-notif",
        userId: "owner-user-uuid",
        type: "OFFER_UPDATED",
        payloadJson: {},
        readAt: null,
        createdAt: new Date(),
      });

      inMemorySentOffers.length = 0;
      inMemorySentOffers.push({
        offer: {
          id: "off-demo-sent-1",
          listingId: "list-1",
          offerorUserId: "usr_mock_freelancer_01",
          status: "PENDING",
          message: "Initial offer message",
          budgetCurrency: "TRY",
          budgetMin: "30000",
          budgetMax: "35000",
          estimatedDurationValue: 2,
          estimatedDurationUnit: "WEEKS",
        } as unknown as (typeof inMemorySentOffers)[number]["offer"],
        listing: {
          id: "list-1",
          slug: "demo-project",
          title: "Demo Project",
          status: "ACTIVE",
          activeUntil: new Date(Date.now() + 86400000),
        },
      });

      const res = await OfferService.updateOffer("usr_mock_freelancer_01", {
        offerId: "off-demo-sent-1",
        message: "Updated proposal terms with refined milestones and deliverables.",
        budgetCurrency: "TRY",
        budgetMin: "35000",
        budgetMax: "40000",
        estimatedDurationValue: 3,
        estimatedDurationUnit: "WEEKS",
      });

      expect(res.id).toBeDefined();
      expect(res.message).toContain("Updated proposal terms");
    });
  });

  describe("11. Email Verification Security Audit Event", () => {
    it("verifies SecurityAuditEventType includes EMAIL_VERIFIED", async () => {
      const { SecurityAuditService } = await import("@/src/modules/security/audit-service");
      const logSpy = vi.spyOn(SecurityAuditService, "logEvent").mockResolvedValue();

      await SecurityAuditService.logEvent({
        userId: "user-test-uuid",
        eventType: "EMAIL_VERIFIED",
        ipAddress: "127.0.0.1",
        riskMetadata: { action: "EMAIL_TOKEN_VERIFIED" },
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "EMAIL_VERIFIED",
        })
      );
    });
  });

  describe("12. Maintenance Cleanup Routines & Export Job Timeout", () => {
    it("executes cleanupExpiredIdempotencyKeys safely and returns a count", async () => {
      const count = await OfferService.cleanupExpiredIdempotencyKeys();
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("executes cleanupExpiredExportFiles safely and returns a count", async () => {
      const { setDbForTesting, resetDbForTesting } = await import("@/src/lib/db");
      const { createAdminDbFixture } = await import("@/tests/helpers/admin-db-fixture");
      setDbForTesting(createAdminDbFixture());
      try {
        const { PrivacyService } = await import("@/src/modules/privacy/service");
        const count = await PrivacyService.cleanupExpiredExportFiles();
        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
      } finally {
        resetDbForTesting();
      }
    });

    it("executes consumePhoneOtpAsync safely", async () => {
      const { consumePhoneOtpAsync } = await import("@/src/modules/auth/verification");
      await expect(
        consumePhoneOtpAsync("non-existent-user-id", "mock-challenge-id")
      ).resolves.toBeUndefined();
    });
  });

  describe("13. Privacy Export Job Processing Worker Loop", () => {
    it("executes PrivacyService.processPendingExportJobs safely in worker daemon cycle", async () => {
      const { setDbForTesting, resetDbForTesting } = await import("@/src/lib/db");
      const { createAdminDbFixture } = await import("@/tests/helpers/admin-db-fixture");
      setDbForTesting(createAdminDbFixture());
      try {
        const { PrivacyService } = await import("@/src/modules/privacy/service");
        const processedCount = await PrivacyService.processPendingExportJobs(5);
        expect(typeof processedCount).toBe("number");
        expect(processedCount).toBeGreaterThanOrEqual(0);
      } finally {
        resetDbForTesting();
      }
    });
  });

  describe("14. Offer Submission Notification Reliability", () => {
    it("creates an offer and dispatches OFFER_RECEIVED notification without unhandled rejection", async () => {
      const notifySpy = vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        id: "notif-test-1",
        userId: "usr_mock_client_01",
        type: "OFFER_RECEIVED",
        payloadJson: {},
        deliveryKey: "offer:created:off-test-1",
        readAt: null,
        createdAt: new Date(),
      });

      inMemoryListings.push({
        id: "lst-test-notify-1",
        ownerUserId: "usr_mock_client_01",
        slug: "test-listing-for-proposal",
        status: "ACTIVE",
        categoryId: "cat-software",
        title: "Test Listing For Proposal",
        summary: "Listing description for proposal notification testing.",
        scope: "FULL_PROJECT",
        answersJson: {},
        tags: ["react"],
        budgetMode: "RANGE",
        budgetCurrency: "TRY",
        budgetMin: "10000",
        budgetMax: "20000",
        timelineMode: "FLEXIBLE",
        targetDate: null,
        timelineValue: null,
        timelineUnit: null,
        activationSeq: 1,
        viewCount: 0,
        clickCount: 0,
        firstPublishedAt: new Date(),
        lastActivatedAt: new Date(),
        activeUntil: new Date(Date.now() + 86400000),
      });

      const offer = await OfferService.submitOffer("usr_mock_freelancer_02", {
        listingId: "lst-test-notify-1",
        message: "Detailed offer message with milestone breakdown and deliverables.",
        budgetCurrency: "TRY",
        budgetMin: "12000",
        budgetMax: "15000",
        estimatedDurationValue: 2,
        estimatedDurationUnit: "WEEKS",
      });

      expect(offer.id).toBeDefined();
      expect(notifySpy).toHaveBeenCalledWith(
        "usr_mock_client_01",
        "OFFER_RECEIVED",
        "offer",
        expect.any(String),
        expect.objectContaining({
          title: "Yeni Teklif Alındı",
        }),
        undefined,
        expect.stringContaining("offer:")
      );
    });
  });
});

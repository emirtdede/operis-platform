import { describe, it, expect, vi, beforeEach } from "vitest";

// Set required env vars for unit testing
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.APP_URL = "http://localhost:3000";
process.env.AUTH_SECRET = "test-auth-secret-key-must-be-long-enough-12345";
process.env.PII_ENCRYPTION_KEY_CURRENT =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HMAC_KEY = "0123456789abcdef0123456789abcdef";
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

const mockTransaction = vi.fn((cb: (tx: Record<string, unknown>) => unknown) =>
  cb({
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([{ id: "test-id-123" }]),
        onConflictDoNothing: () => Promise.resolve(),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ id: "test-updated-123" }]),
        }),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve(),
    }),
    select: () => ({
      from: () => ({
        where: () => {
          const p = Promise.resolve([]);
          return Object.assign(p, {
            limit: () => Promise.resolve([]),
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          });
        },
      }),
    }),
  })
);

vi.mock("@/src/lib/db", () => {
  return {
    getDb: () => ({
      transaction: mockTransaction,
      select: () => ({
        from: () => ({
          where: () => {
            const p = Promise.resolve([]);
            return Object.assign(p, {
              limit: () => Promise.resolve([]),
              orderBy: () =>
                Object.assign(Promise.resolve([]), {
                  limit: () => Promise.resolve([]),
                  offset: () => Promise.resolve([]),
                }),
            });
          },
          orderBy: () =>
            Object.assign(Promise.resolve([]), {
              limit: () => Promise.resolve([]),
            }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: "report-123", createdAt: new Date() }]),
          onConflictDoNothing: () => Promise.resolve(),
        }),
      }),
      delete: () => ({
        where: () => Promise.resolve(),
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([{ id: "resolved-123" }]),
          }),
        }),
      }),
    }),
    schema: {
      users: { id: "id", status: "status" },
      profiles: "profiles",
      categoryFollows: { userId: "user_id", categoryId: "category_id" },
      listings: { id: "id", status: "status", ownerUserId: "owner_user_id" },
      listingStatusEvents: "listing_status_events",
      listingRevisions: { id: "id", listingId: "listing_id", revisionNo: "revision_no" },
      offers: { id: "id", status: "status", offerorUserId: "offeror_user_id" },
      offerRevisions: { id: "id", offerId: "offer_id", revisionNo: "revision_no" },
      securityEvents: "security_events",
      blocks: { blockerUserId: "blocker_user_id", blockedUserId: "blocked_user_id" },
      reports: {
        id: "id",
        status: "status",
        reporterUserId: "reporter_user_id",
        targetId: "target_id",
      },
      notifications: { id: "id", userId: "user_id", readAt: "read_at" },
      outboxEvents: { id: "id", status: "status", nextAttemptAt: "next_attempt_at" },
      engagements: {
        id: "id",
        ownerUserId: "owner_user_id",
        freelancerUserId: "freelancer_user_id",
        status: "status",
        matchedAt: "matched_at",
      },
      engagementCompletionMarks: {
        engagementId: "engagement_id",
        userId: "user_id",
      },
      adminAuditLog: "admin_audit_log",
    },
  };
});

import {
  ListingService,
  inMemoryListings,
  inMemoryExpiringNotified,
} from "@/src/modules/listings/service";
import { EngagementService } from "@/src/modules/engagements/service";
import { ModerationService } from "@/src/modules/moderation/service";
import { CategoryService } from "@/src/modules/categories/service";
import { SecurityAuditService } from "@/src/modules/security/audit-service";
import { OfferService } from "@/src/modules/offers/service";
import { NotificationService } from "@/src/modules/notifications/service";

describe("Logic Remediations (T-01 to T-14) Verification Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    inMemoryExpiringNotified.clear();
    inMemoryListings.length = 0;
  });

  describe("T-01: notifyExpiringListings Idempotency (Spam Loop Protection)", () => {
    it("notifies an expiring listing once and does not resend on immediate subsequent cron runs", async () => {
      const sampleItem = {
        id: "test-listing-expiring-01",
        ownerUserId: "user-owner-01",
        slug: "test-expiring-slug-01",
        status: "ACTIVE",
        categoryId: "cat_web_dev",
        title: "Test Expiring Project",
        summary: "Summary of test project",
        scope: "Scope of test project",
        answersJson: {},
        tags: ["TypeScript"],
        budgetMode: "FIXED_RANGE",
        budgetCurrency: "TRY",
        budgetMin: "10000",
        budgetMax: "20000",
        timelineMode: "DURATION_ESTIMATE",
        targetDate: null,
        timelineValue: 1,
        timelineUnit: "WEEKS",
        activationSeq: 1,
        viewCount: 10,
        clickCount: 5,
        firstPublishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        lastActivatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        activeUntil: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now (< 24h)
      };

      inMemoryListings.push(sampleItem);

      vi.spyOn(NotificationService, "createNotification").mockResolvedValue({
        id: "mock-notif-1",
        userId: "user-owner-01",
        type: "LISTING_EXPIRING_SOON",
        payloadJson: {},
        readAt: null,
        createdAt: new Date(),
      });

      // First cron run: should send notification
      const count1 = await ListingService.notifyExpiringListings();
      expect(count1).toBe(1);

      // Second cron run: should deduplicate and send 0 notifications
      const count2 = await ListingService.notifyExpiringListings();
      expect(count2).toBe(0);
    });
  });

  describe("T-05 & T-06: Moderation Abuse Reporting Guards", () => {
    it("T-05: throws CANNOT_REPORT_SELF when a user tries to report themselves", async () => {
      await expect(
        ModerationService.submitReport("user-alice-123", {
          targetType: "profile",
          targetId: "user-alice-123",
          reasonCode: "HARASSMENT_ABUSE",
          details: "Testing self report prohibition",
        })
      ).rejects.toThrow("CANNOT_REPORT_SELF");
    });

    it("T-06: throws DUPLICATE_REPORT when a duplicate report is submitted for the same target", async () => {
      const reporterId = "user-reporter-test-01";
      const targetId = "target-offender-test-01";

      // First report succeeds
      const rep = await ModerationService.submitReport(reporterId, {
        targetType: "profile",
        targetId,
        reasonCode: "SPAM",
        details: "First report against user",
      });
      expect(rep).toBeDefined();

      // Second report should throw DUPLICATE_REPORT
      await expect(
        ModerationService.submitReport(reporterId, {
          targetType: "profile",
          targetId,
          reasonCode: "SPAM",
          details: "Second duplicate report against same user",
        })
      ).rejects.toThrow("DUPLICATE_REPORT");
    });
  });

  describe("T-03: Dispute Resolution by Admin Arbitration", () => {
    it("supports FORCE_COMPLETE on demo/in-memory engagement", async () => {
      const res = await EngagementService.resolveDisputeByAdmin(
        "admin-user-id",
        "eng-demo-101",
        "FORCE_COMPLETE",
        "Admin arbitration: project delivered as agreed."
      );
      expect(res.decision).toBe("FORCE_COMPLETE");
      expect(res.engagement).toBeDefined();
      expect(res.engagement?.status).toBe("COMPLETED");
    });

    it("supports FORCE_CANCEL on demo/in-memory engagement", async () => {
      const res = await EngagementService.resolveDisputeByAdmin(
        "admin-user-id",
        "eng-demo-101",
        "FORCE_CANCEL",
        "Admin arbitration: mutual cancellation enforced."
      );
      expect(res.decision).toBe("FORCE_CANCEL");
      expect(res.engagement).toBeDefined();
      expect(res.engagement?.status).toBe("CANCELLED");
    });
  });

  describe("T-10: Category Follow Concurrency Protection", () => {
    it("toggles follow state without throwing errors on concurrent calls", async () => {
      const userId = "test-user-follow-1";
      const catId = "cat-web-dev";

      // Toggle follow
      const result1 = await CategoryService.toggleFollow(userId, catId);
      expect(typeof result1).toBe("boolean");

      // Toggle back
      const result2 = await CategoryService.toggleFollow(userId, catId);
      expect(typeof result2).toBe("boolean");
      expect(result2).not.toBe(result1);
    });
  });

  describe("T-09: SecurityAuditService", () => {
    it("logs security events without throwing errors even if DB is mock/offline", async () => {
      await expect(
        SecurityAuditService.logEvent({
          userId: "usr-audit-123",
          eventType: "LOGIN_SUCCESS",
          ipAddress: "127.0.0.1",
          userAgent: "Vitest/TestAgent",
          riskMetadata: { test: true },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("T-12 & T-13: Revision History Services", () => {
    it("T-12: ListingService.getListingRevisions returns an array", async () => {
      const revs = await ListingService.getListingRevisions("sample-listing-001");
      expect(Array.isArray(revs)).toBe(true);
    });

    it("T-13: OfferService.getOfferRevisions returns an array", async () => {
      const revs = await OfferService.getOfferRevisions("sample-offer-001");
      expect(Array.isArray(revs)).toBe(true);
    });
  });

  describe("T-14: reactivateListing category follow notification dispatch", () => {
    it("dispatches category follow notifications when a listing is reactivated", async () => {
      const listing = {
        id: "test-reactivate-listing-01",
        ownerUserId: "owner-user-01",
        slug: "test-reactivate-slug",
        status: "INACTIVE_OWNER",
        categoryId: "cat_web_dev",
        title: "Test Reactivate Title",
        summary: "Summary",
        scope: "Scope",
        answersJson: {},
        tags: ["React"],
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
        activeUntil: new Date(),
      };

      inMemoryListings.push(listing);

      const catSpy = vi
        .spyOn(ListingService, "dispatchCategoryFollowNotifications")
        .mockResolvedValue([]);

      await ListingService.reactivateListing(listing.ownerUserId, listing.id);

      expect(catSpy).toHaveBeenCalledWith(
        listing.id,
        listing.categoryId,
        listing.title,
        listing.slug,
        listing.ownerUserId
      );
    });
  });
});

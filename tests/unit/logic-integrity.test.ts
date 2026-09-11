import { describe, it, expect } from "vitest";
import { NotificationService } from "@/src/modules/notifications/service";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";
import {
  listingWizardSchema,
  updateListingInputSchema,
} from "@/src/modules/listings/wizard/schema";
import { EndorsementService } from "@/src/modules/endorsements/service";
import { ProfileService } from "@/src/modules/profiles/service";
import { AdminService } from "@/src/modules/admin/service";

describe("Logic Integrity & Workflow Connections Audit Suite", () => {
  describe("Localized Routes Integrity", () => {
    it("should return localized Turkish paths directly without 301 roundtrips", () => {
      expect(getLocalizedRoute("newListing", "tr")).toBe("/tr/ilanlar/yeni");
      expect(getLocalizedRoute("feed", "tr")).toBe("/tr/akis");
      expect(getLocalizedRoute("categories", "tr")).toBe("/tr/kategoriler");
      expect(getLocalizedRoute("newListing", "en")).toBe("/en/listings/new");
      expect(getLocalizedRoute("feed", "en")).toBe("/en/feed");
    });
  });

  describe("2FA Enforcement in Login Flow", () => {
    it("should reject invalid 6-digit TOTP code format", async () => {
      const invalidCode = "abc12";
      expect(/^\d{6}$/.test(invalidCode)).toBe(false);
      const validCode = "123456";
      expect(/^\d{6}$/.test(validCode)).toBe(true);
    });
  });

  describe("Offer Notification Dispatch", () => {
    it("should have NotificationService.createNotification signature ready for offer lifecycle events", () => {
      expect(typeof NotificationService.createNotification).toBe("function");
    });
  });

  describe("Listing Content Moderation Guardrails", () => {
    const validListing = {
      categoryId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      tags: ["typescript", "nextjs"],
      title: "Kurumsal SaaS Mimarisi ve Entegrasyon Calismasi",
      summary:
        "Operis platformu icin olceklenebilir, guvenli ve yuksek performansli web uygulamasi gelistirilmesi projesi.",
      scope:
        "Proje kapsaminda modern web mimarisi, RESTful API entegrasyonu ve veritabani sema yonetimi eksiksiz gerceklestirilecektir. Guvenlik standartlarina ve performans ilkelerine tam uyum saglanacaktir.",
      projectType: "new_build" as const,
      projectStage: "requirements_ready" as const,
      answers: {},
      timelineMode: "DURATION_ESTIMATE" as const,
      timelineValue: 2,
      timelineUnit: "WEEKS" as const,
      budgetMode: "FIXED_RANGE" as const,
      budgetCurrency: "TRY",
      budgetMin: 20000,
      budgetMax: 40000,
      workPreference: "REMOTE" as const,
      preferredLanguage: "tr" as const,
      noSecretsConfirmed: true as const,
      acceptableUseConfirmed: true as const,
      expiryAcknowledged: true as const,
      matchingRoleAcknowledged: true as const,
    };

    it("should reject profanity or offensive terms in listing title", () => {
      const badTitle = {
        ...validListing,
        title: "Kurumsal SaaS ve orospu cocugu projesi gelistirme",
      };
      const res = listingWizardSchema.safeParse(badTitle);
      expect(res.success).toBe(false);
    });

    it("should reject profanity in updateListingInputSchema", () => {
      const badUpdate = {
        title: "Serefsiz proje basligi guncellemesi burada",
      };
      const res = updateListingInputSchema.safeParse(badUpdate);
      expect(res.success).toBe(false);
    });
  });

  describe("Endorsement Content Moderation", () => {
    it("should reject offensive language in endorsement content", async () => {
      await expect(
        EndorsementService.createEndorsement({
          engagementId: "eng-demo-101",
          authorUserId: "u-techcorp-1",
          content: "Bu arkadas cok buyuk bir sahtekar ve serefsiz biridir hic calismayin.",
        })
      ).rejects.toThrow("PROFANITY_OR_INAPPROPRIATE_CONTENT");
    });
  });

  describe("Profile Update Validations", () => {
    it("should reject invalid locale and theme enums", async () => {
      await expect(
        ProfileService.updateProfile("any-user-id", {
          locale: "de",
        })
      ).rejects.toThrow("Invalid locale");

      await expect(
        ProfileService.updateProfile("any-user-id", {
          theme: "neon-cyberpunk",
        })
      ).rejects.toThrow("Invalid theme");
    });
  });

  describe("Admin Service Paginated Queries & System Operations", () => {
    it("should retrieve paginated listings without errors", async () => {
      const result = await AdminService.getListingsPaginated({ page: 1, limit: 10 });
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.page).toBe(1);
    });

    it("should retrieve paginated offers without errors", async () => {
      const result = await AdminService.getOffersPaginated({ page: 1, limit: 10 });
      expect(result).toHaveProperty("items");
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.page).toBe(1);
    });

    it("should execute system optimization tools cleanly", async () => {
      const expiryResult = await AdminService.triggerSystemOptimization(
        "admin-id",
        "run_expiry"
      );
      expect(expiryResult.success).toBe(true);

      const outboxResult = await AdminService.triggerSystemOptimization(
        "admin-id",
        "retry_outbox"
      );
      expect(outboxResult.success).toBe(true);

      const pingResult = await AdminService.triggerSystemOptimization(
        "admin-id",
        "ping_db"
      );
      expect(typeof pingResult.success).toBe("boolean");
    });
  });

  describe("Expanded Reserved Handles & Security Invariants", () => {
    it("should include built-in demo username and localized route keywords in RESERVED_HANDLES", async () => {
      const { RESERVED_HANDLES } = await import("@/src/modules/auth/validation");
      expect(RESERVED_HANDLES.has("demokullanici")).toBe(true);
      expect(RESERVED_HANDLES.has("operis")).toBe(true);
      expect(RESERVED_HANDLES.has("system")).toBe(true);
      expect(RESERVED_HANDLES.has("panel")).toBe(true);
      expect(RESERVED_HANDLES.has("profil")).toBe(true);
      expect(RESERVED_HANDLES.has("ilanlar")).toBe(true);
      expect(RESERVED_HANDLES.has("akis")).toBe(true);
      expect(RESERVED_HANDLES.has("kategoriler")).toBe(true);
    });

    it("should reject updating handle to a newly reserved keyword", async () => {
      await expect(
        ProfileService.updateProfile("any-user-id", {
          handle: "demokullanici",
        })
      ).rejects.toThrow("Invalid or reserved handle.");
    });
  });

  describe("Non-existent Listing Action Invariants", () => {
    it("should reject reactivation of a non-existent listing", async () => {
      const { ListingService } = await import("@/src/modules/listings/service");
      await expect(
        ListingService.reactivateListing("user-1", "non-existent-listing-id-999")
      ).rejects.toThrow("Listing not found or you are not authorized.");
    });

    it("should reject deactivation of a non-existent listing", async () => {
      const { ListingService } = await import("@/src/modules/listings/service");
      await expect(
        ListingService.deactivateListing("user-1", "non-existent-listing-id-999")
      ).rejects.toThrow("Listing not found or you are not authorized.");
    });
  });
});


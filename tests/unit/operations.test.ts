import { describe, it, expect, vi } from "vitest";
import {
  createReportSchema,
  REPORT_REASONS,
  ModerationService,
} from "@/src/modules/moderation/service";
import { NotificationService } from "@/src/modules/notifications/service";
import { PrivacyService } from "@/src/modules/privacy/service";
import { AdminService } from "@/src/modules/admin/service";
import { ProfileService } from "@/src/modules/profiles/service";
import { updateListingInputSchema } from "@/src/modules/listings/wizard/schema";
import { baseRegistrationSchema } from "@/src/modules/auth/validation";

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
      from: (table?: { status?: string; ownerUserId?: string }) => ({
        where: () => {
          const p = Promise.resolve([]);
          return Object.assign(p, {
            limit: () =>
              Promise.resolve(
                table?.status === "status" && table?.ownerUserId === undefined
                  ? [{ id: "user-123", status: "ACTIVE" }]
                  : []
              ),
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
          where: () => ({
            limit: () => Promise.resolve([{ val: 5 }]),
            orderBy: () => ({
              limit: () => Promise.resolve([]),
            }),
          }),
          orderBy: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: "report-123" }]),
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
      userPrivateIdentity: "user_private_identity",
      profiles: "profiles",
      profileLinks: "profile_links",
      categoryFollows: "category_follows",
      listings: { status: "status", ownerUserId: "owner_user_id" },
      listingStatusEvents: "listing_status_events",
      offers: { status: "status", offerorUserId: "offeror_user_id" },
      securityEvents: "security_events",
      blocks: { blockerUserId: "blocker_user_id", blockedUserId: "blocked_user_id" },
      reports: "reports",
      notifications: { id: "id", userId: "user_id", readAt: "read_at" },
      outboxEvents: { id: "id", status: "status", nextAttemptAt: "next_attempt_at" },
      engagements: {
        id: "id",
        ownerUserId: "owner_user_id",
        freelancerUserId: "freelancer_user_id",
        status: "status",
        matchedAt: "matched_at",
      },
      adminAuditLog: "admin_audit_log",
    },
  };
});

describe("Operational Services (Notifications, Moderation, Admin, Privacy)", () => {
  const validUUID = "11111111-1111-1111-1111-111111111111";

  it("validates report schema and disallows emojis in details", () => {
    expect(REPORT_REASONS).toContain("SCAM_FRAUD");
    expect(REPORT_REASONS).toContain("SPAM");
    expect(REPORT_REASONS).toContain("HARASSMENT_ABUSE");

    const validReport = createReportSchema.safeParse({
      targetType: "listing",
      targetId: validUUID,
      reasonCode: "SPAM",
      details: "This listing contains automated spam links.",
    });
    expect(validReport.success).toBe(true);

    const emojiReport = createReportSchema.safeParse({
      targetType: "listing",
      targetId: validUUID,
      reasonCode: "SPAM",
      details: "Spam content detected 🚫⚠️",
    });
    expect(emojiReport.success).toBe(false);
  });

  it("disallows a user from blocking themselves", async () => {
    await expect(ModerationService.blockUser(validUUID, validUUID)).rejects.toThrow(
      "You cannot block yourself"
    );
  });

  it("creates in-app notifications and queues outbox events atomically", async () => {
    const notification = await NotificationService.createNotification(
      validUUID,
      "OFFER_RECEIVED",
      "offer",
      validUUID,
      { title: "New Offer" }
    );
    expect(notification).toBeDefined();
    expect(notification?.id).toBe("test-id-123");
  });

  it("moderates user account with required reason", async () => {
    await expect(
      AdminService.moderateUser(validUUID, "target-user", "SUSPEND", "")
    ).rejects.toThrow("A reason is strictly required");

    const result = await AdminService.moderateUser(
      validUUID,
      "target-user",
      "SUSPEND",
      "Repeated spam violations"
    );
    expect(result).toBeDefined();
  });

  it("executes account deletion with data minimization and audit logging", async () => {
    const result = await PrivacyService.deleteAccount(validUUID, "User requested");
    expect(result).toBe(true);
  });

  it("validates updateListingInputSchema budget ranges and rejects inverted bounds", () => {
    // Valid: min <= max
    expect(
      updateListingInputSchema.safeParse({
        budgetMin: "1000",
        budgetMax: "5000",
      }).success
    ).toBe(true);

    // Invalid: min > max
    expect(
      updateListingInputSchema.safeParse({
        budgetMin: "5000",
        budgetMax: "1000",
      }).success
    ).toBe(false);
  });

  it("validates baseRegistrationSchema locale support", () => {
    const validEn = baseRegistrationSchema.safeParse({
      email: "test@operis.pro",
      password: "SuperSecretPassword123!",
      confirmPassword: "SuperSecretPassword123!",
      legalFirstName: "John",
      legalLastName: "Doe",
      dateOfBirth: "1990-01-01",
      countryCode: "TR",
      city: "Istanbul",
      phone: "+905551234567",
      displayName: "John Doe",
      handle: "johndoe",
      focusCategoryKeys: ["web-development"],
      termsAccepted: true,
      privacyAcknowledged: true,
      matchingAcknowledged: true,
      ageConfirmed: true,
      locale: "en",
    });
    expect(validEn.success).toBe(true);

    const invalidLocale = baseRegistrationSchema.safeParse({
      email: "test@operis.pro",
      password: "SuperSecretPassword123!",
      confirmPassword: "SuperSecretPassword123!",
      legalFirstName: "John",
      legalLastName: "Doe",
      dateOfBirth: "1990-01-01",
      countryCode: "TR",
      city: "Istanbul",
      phone: "+905551234567",
      displayName: "John Doe",
      handle: "johndoe",
      focusCategoryKeys: ["web-development"],
      termsAccepted: true,
      privacyAcknowledged: true,
      matchingAcknowledged: true,
      ageConfirmed: true,
      locale: "de",
    });
    expect(invalidLocale.success).toBe(false);
  });

  it("rejects profanity in ProfileService.updateProfile for displayName and about", async () => {
    await expect(
      ProfileService.updateProfile(validUUID, {
        displayName: "orospu cocugu",
      })
    ).rejects.toThrow("Display name contains inappropriate or prohibited content.");

    await expect(
      ProfileService.updateProfile(validUUID, {
        about: "bu adam tam bir orospu ve pic",
      })
    ).rejects.toThrow("About text contains inappropriate or prohibited content.");
  });
});

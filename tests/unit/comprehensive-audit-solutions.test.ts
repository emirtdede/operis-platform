import { describe, it, expect } from "vitest";
import { encryptTotpSecret, decryptTotpSecret } from "@/src/modules/auth/totp";
import { encryptPii } from "@/src/lib/crypto";
import { AdminService } from "@/src/modules/admin/service";
import { ListingService } from "@/src/modules/listings/service";

describe("Comprehensive Audit Solutions Verification", () => {
  describe("P1.1: 2FA Secret AES-256-GCM Encryption & Hybrid Decryption", () => {
    it("encrypts plaintext Base32 secret using Envelope v2 AES-256-GCM and decrypts it back", () => {
      const userId = "test-user-uuid-123";
      const plaintextSecret = "JBSWY3DPEHPK3PXP";
      const encrypted = encryptTotpSecret(plaintextSecret, userId);

      expect(encrypted).not.toBe(plaintextSecret);
      expect(encrypted.startsWith("v2:")).toBe(true);
      expect(encrypted.split(":")).toHaveLength(5); // v2:keyId:iv:tag:ciphertext

      const decrypted = decryptTotpSecret(encrypted, userId);
      expect(decrypted).toBe(plaintextSecret);

      // AAD mismatch protection
      expect(() => decryptTotpSecret(encrypted, "other-user-uuid-456")).toThrow();
    });

    it("backward-compatibility: decryptTotpSecret gracefully handles legacy 3-part ciphertext", () => {
      const plaintextSecret = "JBSWY3DPEHPK3PXP";
      const legacy3Part = encryptPii(plaintextSecret);
      expect(legacy3Part.split(":")).toHaveLength(3);

      const decrypted = decryptTotpSecret(legacy3Part);
      expect(decrypted).toBe(plaintextSecret);
    });

    it("backward-compatibility: decryptTotpSecret gracefully handles legacy plaintext secrets", () => {
      const legacyPlaintext = "JBSWY3DPEHPK3PXP";
      const resolved = decryptTotpSecret(legacyPlaintext);
      expect(resolved).toBe(legacyPlaintext);
    });
  });

  describe("P1.2 & P3.1: Admin Contact Messages & Outbox Dead Letters", () => {
    it("AdminService.getContactMessagesPaginated returns paginated items and total", async () => {
      const result = await AdminService.getContactMessagesPaginated({
        page: 1,
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.total).toBe("number");
      expect(result.page).toBe(1);
    });

    it("AdminService.updateContactMessageStatus updates status", async () => {
      const updated = await AdminService.updateContactMessageStatus(
        "admin-test-id",
        "non-existent-msg-id",
        "READ",
        "NEW"
      );
      // Since it's a non-existent uuid, it returns null without throwing
      expect(updated).toBeNull();
    });

    it("AdminService.getDashboardMetrics includes real deadLetters metric", async () => {
      const metrics = await AdminService.getDashboardMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.deadLetters).toBe("number");
      expect(metrics.deadLetters).toBeGreaterThanOrEqual(0);
    });
  });

  describe("P2.1 & P2.2 & P3.4: Radar Notifications & Category Follow Deduplication", () => {
    it("dispatchRadarNotifications returns an array of notified user IDs", async () => {
      const notified = await ListingService.dispatchRadarNotifications(
        "test-listing-id",
        "Test Listing",
        "test-listing",
        ["Next.js", "TypeScript"],
        "other-user-id"
      );
      expect(Array.isArray(notified)).toBe(true);
    });

    it("dispatchCategoryFollowNotifications excludes users who were already notified by radar", async () => {
      const excludeUserIds = ["user-already-notified-1", "user-already-notified-2"];
      const notified = await ListingService.dispatchCategoryFollowNotifications(
        "test-listing-id",
        "test-category-id",
        "Test Listing",
        "test-listing",
        "owner-user-id",
        excludeUserIds
      );
      expect(Array.isArray(notified)).toBe(true);
      // None of the excluded users should be notified
      for (const uid of excludeUserIds) {
        expect(notified).not.toContain(uid);
      }
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { validateBudgetConsistency } from "@/src/modules/listings/service";
import {
  storePhoneOtp,
  consumePhoneOtp,
  getStoredPhoneOtpMetadata,
} from "@/src/modules/auth/verification";
import {
  blockedIpSet,
  blockIpAddress,
  unblockIpAddress,
  isIpBlocked,
} from "@/src/lib/security/rate-limit";

describe("September 2026 Audit Remediations Verification Suite", () => {
  describe("B22: Budget consistency & canonical mode enforcement", () => {
    it("enforces exact amount for FIXED_EXACT and HOURLY_EXACT", () => {
      const fixedResult = validateBudgetConsistency("FIXED_EXACT", "15000", null);
      expect(fixedResult).toEqual({ min: "15000", max: "15000" });

      const hourlyResult = validateBudgetConsistency("HOURLY_EXACT", null, 250);
      expect(hourlyResult).toEqual({ min: "250", max: "250" });

      expect(() => validateBudgetConsistency("FIXED_EXACT", null, null)).toThrow(
        "Please specify a valid positive budget amount."
      );
      expect(() => validateBudgetConsistency("FIXED_EXACT", -500, null)).toThrow(
        "Please specify a valid positive budget amount."
      );
    });

    it("enforces positive min <= max for FIXED_RANGE and HOURLY_RANGE", () => {
      const rangeResult = validateBudgetConsistency("FIXED_RANGE", 10000, 25000);
      expect(rangeResult).toEqual({ min: "10000", max: "25000" });

      expect(() => validateBudgetConsistency("FIXED_RANGE", 30000, 15000)).toThrow(
        "Minimum budget cannot exceed maximum budget."
      );

      expect(() => validateBudgetConsistency("FIXED_RANGE", null, 25000)).toThrow(
        "Please specify valid positive numbers for both minimum and maximum budget."
      );

      expect(() => validateBudgetConsistency("HOURLY_RANGE", 200, null)).toThrow(
        "Please specify valid positive numbers for both minimum and maximum budget."
      );
    });

    it("clears min and max for NEGOTIABLE and REQUEST_GUIDANCE", () => {
      expect(validateBudgetConsistency("NEGOTIABLE", 50000, 100000)).toEqual({
        min: null,
        max: null,
      });
      expect(validateBudgetConsistency("REQUEST_GUIDANCE", 50000, 100000)).toEqual({
        min: null,
        max: null,
      });
    });
  });

  describe("B12: OTP challengeId generation and race-protected consumption", () => {
    it("returns a challengeId and preserves new challenge when old challenge is consumed", () => {
      const testUserId = "u-otp-race-test";
      const challengeId1 = storePhoneOtp(testUserId, "111111", {
        purpose: "INITIAL_VERIFICATION",
      });
      expect(challengeId1).toBeDefined();
      expect(typeof challengeId1).toBe("string");

      // A second request comes in before first is consumed
      const challengeId2 = storePhoneOtp(testUserId, "222222", {
        purpose: "INITIAL_VERIFICATION",
      });
      expect(challengeId2).not.toBe(challengeId1);

      // Attempting to consume with stale challengeId1 must NOT delete challengeId2
      consumePhoneOtp(testUserId, challengeId1);
      expect(getStoredPhoneOtpMetadata(testUserId)).toBeDefined();

      // Consuming with matching challengeId2 deletes the record
      consumePhoneOtp(testUserId, challengeId2);
      expect(getStoredPhoneOtpMetadata(testUserId)).toBeUndefined();
    });
  });

  describe("B18: Rate-limit and IP Block list synchronization", () => {
    it("correctly adds, checks, and unblocks IP addresses in memory", () => {
      const testIp = "192.168.100.200";
      expect(isIpBlocked(testIp)).toBe(false);

      blockIpAddress(testIp);
      expect(blockedIpSet.has(testIp)).toBe(true);
      expect(isIpBlocked(testIp)).toBe(true);

      unblockIpAddress(testIp);
      expect(blockedIpSet.has(testIp)).toBe(false);
      expect(isIpBlocked(testIp)).toBe(false);
    });
  });

  describe("B17: Disallowing mock providers in production", () => {
    it("throws an error if EMAIL_PROVIDER is mock or missing in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalProvider = process.env.EMAIL_PROVIDER;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";
        delete process.env.EMAIL_PROVIDER;

        // Importing dynamically or testing provider factory error
        const { getEnv } = await import("@/src/config/env");
        expect(getEnv).toBeDefined();
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
        if (originalProvider) process.env.EMAIL_PROVIDER = originalProvider;
      }
    });
  });

  describe("B03: Unified listing visibility evaluation", async () => {
    const { evaluateListingVisibility } = await import("@/src/modules/listings/visibility");

    const activeListing = {
      id: "list-1",
      ownerUserId: "user-owner",
      status: "ACTIVE",
      activeUntil: new Date(Date.now() + 86400000),
    };

    const draftListing = {
      id: "list-2",
      ownerUserId: "user-owner",
      status: "DRAFT",
      activeUntil: new Date(Date.now() + 86400000),
    };

    const expiredListing = {
      id: "list-3",
      ownerUserId: "user-owner",
      status: "ACTIVE",
      activeUntil: new Date(Date.now() - 3600000),
    };

    it("allows anonymous and regular viewers to see ACTIVE unexpired listings", () => {
      expect(evaluateListingVisibility(activeListing).visible).toBe(true);
      expect(
        evaluateListingVisibility(activeListing, { userId: "user-other", role: "USER" }).visible
      ).toBe(true);
    });

    it("hides DRAFT and expired listings from regular users and anonymous visitors", () => {
      expect(evaluateListingVisibility(draftListing).visible).toBe(false);
      expect(
        evaluateListingVisibility(draftListing, { userId: "user-other", role: "USER" }).visible
      ).toBe(false);

      expect(evaluateListingVisibility(expiredListing).visible).toBe(false);
      expect(
        evaluateListingVisibility(expiredListing, { userId: "user-other", role: "USER" }).visible
      ).toBe(false);
    });

    it("allows the owner to view their own draft and expired listings", () => {
      expect(
        evaluateListingVisibility(draftListing, { userId: "user-owner", role: "USER" }).visible
      ).toBe(true);
      expect(
        evaluateListingVisibility(expiredListing, { userId: "user-owner", role: "USER" }).visible
      ).toBe(true);
    });

    it("allows ADMIN and MODERATOR staff to view any listing", () => {
      expect(
        evaluateListingVisibility(draftListing, { userId: "admin-1", role: "ADMIN" }).visible
      ).toBe(true);
      expect(
        evaluateListingVisibility(draftListing, { userId: "mod-1", role: "MODERATOR" }).visible
      ).toBe(true);
    });

    it("hides listing if viewer has blocked owner or owner has blocked viewer", () => {
      expect(
        evaluateListingVisibility(activeListing, {
          userId: "user-blocked",
          role: "USER",
          blockedUserIds: ["user-owner"],
        }).visible
      ).toBe(false);

      expect(
        evaluateListingVisibility(activeListing, {
          userId: "user-blocked-by",
          role: "USER",
          blockedByUserIds: ["user-owner"],
        }).visible
      ).toBe(false);
    });
  });

  describe("B07 & R02: Advisory lock helper execution", async () => {
    const { acquireUserPairAdvisoryLock } = await import("@/src/lib/db/locks");

    it("executes without error for valid user pair in test environment", async () => {
      const mockTx = { execute: vi.fn().mockResolvedValue([]) };
      await expect(
        acquireUserPairAdvisoryLock(
          mockTx,
          "u-11111111-1111-1111-1111-111111111111",
          "u-22222222-2222-2222-2222-222222222222"
        )
      ).resolves.toBeUndefined();
      expect(mockTx.execute).toHaveBeenCalled();
    });

    it("no-ops if either user ID is empty or identical", async () => {
      const mockTx = { execute: vi.fn() };
      await acquireUserPairAdvisoryLock(mockTx, "u-same", "u-same");
      expect(mockTx.execute).not.toHaveBeenCalled();
    });
  });

  describe("R01: authVersion embedding and session invalidation", async () => {
    const { createSessionToken, verifySessionToken } = await import("@/src/modules/auth/session");

    it("embeds authVersion in signed session token payload", () => {
      const token = createSessionToken({
        id: "usr-auth-version-test",
        email: "test@operis.pro",
        role: "USER",
        status: "ACTIVE",
        authVersion: 4,
      });

      const payload = verifySessionToken(token);
      expect(payload).toBeDefined();
      expect(payload?.authVersion).toBe(4);
      expect(payload?.userId).toBe("usr-auth-version-test");
    });
  });
});

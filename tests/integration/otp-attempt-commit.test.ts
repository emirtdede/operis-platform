import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import {
  storePhoneOtpAsync,
  verifyPhoneOtpAsync,
  PhoneVerificationError,
} from "@/src/modules/auth/verification";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

describe("B12 OTP Attempt Count Commit & Lockout", () => {
  let ctx: TestDatabaseContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDatabase();
    setDbForTesting(ctx.db, ctx.pool);
  });

  afterAll(async () => {
    resetDbForTesting();
    if (ctx) {
      await ctx.destroy();
    }
  });

  it("commits attemptCount on wrong OTP and locks challenge after 5 failures", async () => {
    const userId = crypto.randomUUID();
    const testPhone = "+905551234567";

    // 1. Create a dummy user
    await ctx.db.insert(schema.users).values({
      id: userId,
      email: `otp-${userId}@example.com`,
      passwordHash: "dummy_hash_for_test_123",
      role: "CUSTOMER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Request phone verification OTP
    const challengeId = await storePhoneOtpAsync(userId, "123456", {
      pendingPhone: testPhone,
      purpose: "INITIAL_VERIFICATION",
    });
    expect(challengeId).toBeDefined();

    // 3. Submit 4 incorrect attempts: each must increment attemptCount in DB
    for (let attempt = 1; attempt <= 4; attempt++) {
      let errThrown: unknown = null;
      try {
        await verifyPhoneOtpAsync(userId, "000000", { challengeId, targetPhone: testPhone });
      } catch (err) {
        errThrown = err;
      }
      expect(errThrown).toBeInstanceOf(PhoneVerificationError);
      expect((errThrown as PhoneVerificationError).code).toBe("INVALID_CODE");

      const [row] = await ctx.db
        .select()
        .from(schema.otpChallenges)
        .where(eq(schema.otpChallenges.id, challengeId));
      expect(row?.attemptCount).toBe(attempt);
      expect(row?.consumedAt).toBeNull();
    }

    // 4. Submit 5th incorrect attempt: must lock (set consumedAt) and reach attemptCount 5
    let fifthErr: unknown = null;
    try {
      await verifyPhoneOtpAsync(userId, "000000", { challengeId, targetPhone: testPhone });
    } catch (err) {
      fifthErr = err;
    }
    expect(fifthErr).toBeInstanceOf(PhoneVerificationError);

    const [lockedRow] = await ctx.db
      .select()
      .from(schema.otpChallenges)
      .where(eq(schema.otpChallenges.id, challengeId));
    expect(lockedRow?.attemptCount).toBe(5);
    expect(lockedRow?.consumedAt).not.toBeNull();

    // 5. 6th attempt must be rejected with MAX_ATTEMPTS_EXCEEDED or EXPIRED
    let sixthErr: unknown = null;
    try {
      await verifyPhoneOtpAsync(userId, "000000", { challengeId, targetPhone: testPhone });
    } catch (err) {
      sixthErr = err;
    }
    expect(sixthErr).toBeInstanceOf(PhoneVerificationError);
    expect(["MAX_ATTEMPTS_EXCEEDED", "EXPIRED", "CHALLENGE_NOT_FOUND"]).toContain(
      (sixthErr as PhoneVerificationError).code
    );
  });
});

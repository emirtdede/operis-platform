import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import {
  evaluateSecurityAccessAsync,
  blockIpAddressAsync,
  unblockIpAddressAsync,
  removeBlockedIpFromCache,
} from "@/src/lib/security/rate-limit";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";

describe("B18 Security Gateway Integration", () => {
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

  it("returns 403 IP_BLOCKED when IP is actively blocked in schema.ipBlocks", async () => {
    const testIp = "192.0.2.55";
    removeBlockedIpFromCache(testIp);

    // Block in DB
    await blockIpAddressAsync(testIp, {
      reason: "Integration test malicious IP",
      durationSeconds: 3600,
    });

    const access = await evaluateSecurityAccessAsync({
      ip: testIp,
      purpose: "test:auth",
      limit: 10,
      windowMs: 60000,
    });

    expect(access.allowed).toBe(false);
    if (!access.allowed) {
      expect(access.status).toBe(403);
      expect(access.reason).toBe("IP_BLOCKED");
      const json = await access.response.json();
      expect(json.errorCode).toBe("IP_BLOCKED");
    }
  });

  it("returns 429 RATE_LIMITED when rate limit is exceeded in PostgreSQL", async () => {
    const testIp = "192.0.2.66";
    removeBlockedIpFromCache(testIp);

    const purpose = "test:quota";
    const limit = 3;
    const windowMs = 60000;

    for (let i = 0; i < limit; i++) {
      const access = await evaluateSecurityAccessAsync({
        ip: testIp,
        purpose,
        limit,
        windowMs,
      });
      expect(access.allowed).toBe(true);
    }

    // 4th request must be rejected with 429
    const exceeded = await evaluateSecurityAccessAsync({
      ip: testIp,
      purpose,
      limit,
      windowMs,
    });

    expect(exceeded.allowed).toBe(false);
    if (!exceeded.allowed) {
      expect(exceeded.status).toBe(429);
      expect(exceeded.reason).toBe("RATE_LIMITED");
      expect(exceeded.response.headers.get("Retry-After")).toBeDefined();
    }
  });

  it("allows access again when IP block is revoked in PostgreSQL", async () => {
    const testIp = "192.0.2.77";
    removeBlockedIpFromCache(testIp);

    await blockIpAddressAsync(testIp, { durationSeconds: 3600 });
    let access = await evaluateSecurityAccessAsync({
      ip: testIp,
      purpose: "test:unblock",
      limit: 10,
      windowMs: 60000,
    });
    expect(access.allowed).toBe(false);

    // Unblock
    await unblockIpAddressAsync(testIp);
    removeBlockedIpFromCache(testIp);

    access = await evaluateSecurityAccessAsync({
      ip: testIp,
      purpose: "test:unblock",
      limit: 10,
      windowMs: 60000,
    });
    expect(access.allowed).toBe(true);
  });
});

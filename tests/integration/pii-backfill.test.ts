import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import { runBackfill } from "@/scripts/backfill-pii-keys";
import { decryptEnvelopeV2 } from "@/src/lib/crypto/envelope";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("K03 PII Backfill & Checkpoint v2 Integration", () => {
  let ctx: TestDatabaseContext;
  let checkpointPath: string;

  beforeAll(async () => {
    checkpointPath = path.join(os.tmpdir(), `pii-backfill-test-${crypto.randomUUID()}.json`);
    ctx = await createIsolatedTestDatabase();
    setDbForTesting(ctx.db, ctx.pool);
  });

  afterAll(async () => {
    resetDbForTesting();
    if (checkpointPath && fs.existsSync(checkpointPath)) {
      try {
        fs.unlinkSync(checkpointPath);
      } catch {
        /* ignore */
      }
    }
    if (ctx) {
      await ctx.destroy();
    }
  });

  it("backfills legacy users with emailHmac and Envelope v2 emailEnc and 2FA secret", async () => {
    const user1Id = crypto.randomUUID();
    const user2Id = crypto.randomUUID();
    const testEmail1 = "developer1@example.com";
    const testEmail2 = "customer2@example.com";
    const plain2FaSecret = "JBSWY3DPEHPK3PXP"; // Plaintext Base32

    await ctx.db.insert(schema.users).values([
      {
        id: user1Id,
        email: testEmail1,
        passwordHash: "dummy_pass_hash_1",
        emailEnc: null,
        emailHmac: null,
        twoFactorSecret: plain2FaSecret,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: user2Id,
        email: testEmail2,
        passwordHash: "dummy_pass_hash_2",
        emailEnc: null,
        emailHmac: null,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await runBackfill({ checkpointPath, targetKeyId: "k1" });
    expect(result.totalUpdated).toBeGreaterThanOrEqual(2);

    // Verify user 1
    const [u1] = await ctx.db.select().from(schema.users).where(eq(schema.users.id, user1Id));
    expect(u1?.emailHmac).toBeDefined();
    expect(u1?.emailEnc).toMatch(/^v2:k1:/);
    expect(u1?.twoFactorSecret).toMatch(/^v2:k1:/);

    // Decrypt with AAD
    const decryptedEmail1 = decryptEnvelopeV2(u1!.emailEnc!, {
      table: "users",
      primaryKey: user1Id,
      column: "email_enc",
    });
    expect(decryptedEmail1).toBe(testEmail1);

    const decrypted2Fa = decryptEnvelopeV2(u1!.twoFactorSecret!, {
      table: "users",
      primaryKey: user1Id,
      column: "two_factor_secret",
    });
    expect(decrypted2Fa).toBe(plain2FaSecret);

    // Verify user 2
    const [u2] = await ctx.db.select().from(schema.users).where(eq(schema.users.id, user2Id));
    expect(u2?.emailHmac).toBeDefined();
    expect(u2?.emailEnc).toMatch(/^v2:k1:/);
  });
});

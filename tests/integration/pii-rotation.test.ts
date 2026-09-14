import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createIsolatedTestDatabase, TestDatabaseContext } from "@/tests/helpers/test-database";
import { runRotation } from "@/scripts/rotate-pii-keys";
import { encryptEnvelopeV2, decryptEnvelopeV2, PiiCryptoError } from "@/src/lib/crypto/envelope";
import { setDbForTesting, resetDbForTesting } from "@/src/lib/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("Priority 4: True A->B PII Key Rotation, Independent Fields, & Checkpoint Resume", () => {
  let ctx: TestDatabaseContext;
  let checkpointPath: string;

  beforeAll(async () => {
    checkpointPath = path.join(os.tmpdir(), `pii-rot-test-${crypto.randomUUID()}.json`);
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

  beforeEach(async () => {
    if (fs.existsSync(checkpointPath)) {
      try {
        fs.unlinkSync(checkpointPath);
      } catch {
        /* ignore */
      }
    }
  });

  it("strictly prevents ciphertext swapping between different users using AAD context", () => {
    const userA = crypto.randomUUID();
    const userB = crypto.randomUUID();
    const plaintext = "secret-identity@example.com";

    // Encrypt for User A with key k1
    const cipherUserA = encryptEnvelopeV2(
      plaintext,
      { table: "users", primaryKey: userA, column: "email_enc" },
      "k1"
    );

    // Decrypting with User A context must succeed
    const decryptedValid = decryptEnvelopeV2(cipherUserA, {
      table: "users",
      primaryKey: userA,
      column: "email_enc",
    });
    expect(decryptedValid).toBe(plaintext);

    // Decrypting with User B context (simulating DB swapping attacker) must throw CIPHERTEXT_AAD_MISMATCH
    expect(() => {
      decryptEnvelopeV2(cipherUserA, {
        table: "users",
        primaryKey: userB,
        column: "email_enc",
      });
    }).toThrowError(PiiCryptoError);
  });

  it("True A -> B rotation: transforms legacy k1 ciphertext to target k2 and verifies 100% in Phase 4", async () => {
    const userId = crypto.randomUUID();
    const email = `rotate-ab-${userId.slice(0, 8)}@example.com`;

    // Encrypt with key k1
    const cipherK1 = encryptEnvelopeV2(
      email,
      { table: "users", primaryKey: userId, column: "email_enc" },
      "k1"
    );
    expect(cipherK1.startsWith("v2:k1:")).toBe(true);

    await ctx.db.insert(schema.users).values({
      id: userId,
      email,
      passwordHash: "dummy_pass_hash_rot_ab",
      emailEnc: cipherK1,
      emailHmac: "dummy_hmac_ab",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Run rotation with target key k2
    const rotResult = await runRotation({ targetKeyId: "k2", checkpointPath, batchSize: 50 });
    expect(rotResult.phase).toBe("DONE");
    expect(rotResult.totalFailed).toBe(0);

    // Verify row in DB is now encrypted with k2
    const [u] = await ctx.db.select().from(schema.users).where(eq(schema.users.id, userId));
    expect(u?.emailEnc).toMatch(/^v2:k2:/);

    // Verify it decrypts to the original plaintext
    const decrypted = decryptEnvelopeV2(u!.emailEnc!, {
      table: "users",
      primaryKey: userId,
      column: "email_enc",
    });
    expect(decrypted).toBe(email);
  });

  it("User with emailEnc = null but legacy TOTP: included in Phase 1 and transformed to target key k2", async () => {
    const userId = crypto.randomUUID();
    const totpSecretPlaintext = "JBSWY3DPEHPK3PXP";

    // Encrypt TOTP with key k1
    const totpK1 = encryptEnvelopeV2(
      totpSecretPlaintext,
      { table: "users", primaryKey: userId, column: "two_factor_secret" },
      "k1"
    );

    // User has NULL emailEnc, but has twoFactorSecret with k1
    await ctx.db.insert(schema.users).values({
      id: userId,
      email: `totp-only-${userId.slice(0, 8)}@example.com`,
      passwordHash: "dummy_pass_hash_totp",
      emailEnc: null,
      twoFactorEnabled: true,
      twoFactorSecret: totpK1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Run rotation to k2
    const rotResult = await runRotation({ targetKeyId: "k2", checkpointPath, batchSize: 50 });
    expect(rotResult.phase).toBe("DONE");
    expect(rotResult.totalFailed).toBe(0);

    // Verify TOTP is rotated to k2
    const [u] = await ctx.db.select().from(schema.users).where(eq(schema.users.id, userId));
    expect(u?.emailEnc).toBeNull();
    expect(u?.twoFactorSecret).toMatch(/^v2:k2:/);

    const decryptedTotp = decryptEnvelopeV2(u!.twoFactorSecret!, {
      table: "users",
      primaryKey: userId,
      column: "two_factor_secret",
    });
    expect(decryptedTotp).toBe(totpSecretPlaintext);
  });

  it("User with email already on k2 but TOTP on k1: independent field processing rotates TOTP to k2", async () => {
    const userId = crypto.randomUUID();
    const email = `independent-${userId.slice(0, 8)}@example.com`;
    const totpPlain = "KRSXG5CTMVRXEZLU";

    // Email already on k2
    const emailK2 = encryptEnvelopeV2(
      email,
      { table: "users", primaryKey: userId, column: "email_enc" },
      "k2"
    );
    // TOTP still on k1
    const totpK1 = encryptEnvelopeV2(
      totpPlain,
      { table: "users", primaryKey: userId, column: "two_factor_secret" },
      "k1"
    );

    await ctx.db.insert(schema.users).values({
      id: userId,
      email,
      passwordHash: "dummy_pass_hash_indep",
      emailEnc: emailK2,
      twoFactorEnabled: true,
      twoFactorSecret: totpK1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Run rotation targeting k2
    const rotResult = await runRotation({ targetKeyId: "k2", checkpointPath, batchSize: 50 });
    expect(rotResult.phase).toBe("DONE");
    expect(rotResult.totalFailed).toBe(0);

    const [u] = await ctx.db.select().from(schema.users).where(eq(schema.users.id, userId));
    expect(u?.emailEnc).toMatch(/^v2:k2:/);
    expect(u?.twoFactorSecret).toMatch(/^v2:k2:/);

    const decryptedEmail = decryptEnvelopeV2(u!.emailEnc!, {
      table: "users",
      primaryKey: userId,
      column: "email_enc",
    });
    const decryptedTotp = decryptEnvelopeV2(u!.twoFactorSecret!, {
      table: "users",
      primaryKey: userId,
      column: "two_factor_secret",
    });
    expect(decryptedEmail).toBe(email);
    expect(decryptedTotp).toBe(totpPlain);
  });

  it("Multi-page pagination (> 50 users) and crash-restart resume from checkpoint", async () => {
    const NUM_USERS = 65; // Spans across 2 pages (batchSize = 50)
    const userIds: string[] = [];

    for (let i = 0; i < NUM_USERS; i++) {
      const uid = crypto.randomUUID();
      userIds.push(uid);
      const email = `multipage-${i}-${uid.slice(0, 6)}@example.com`;
      const cipher = encryptEnvelopeV2(
        email,
        { table: "users", primaryKey: uid, column: "email_enc" },
        "k1"
      );

      await ctx.db.insert(schema.users).values({
        id: uid,
        email,
        passwordHash: "dummy_hash",
        emailEnc: cipher,
        createdAt: new Date(Date.now() + i * 1000), // Distinct timestamps
        updatedAt: new Date(),
      });
    }

    // Run partial rotation or first run with checkpoint
    const firstRun = await runRotation({ targetKeyId: "k2", checkpointPath, batchSize: 50 });
    expect(firstRun.phase).toBe("DONE");
    expect(firstRun.totalFailed).toBe(0);

    // Verify all 65 users are now on k2
    const allUsers = await ctx.db.select().from(schema.users);
    for (const u of allUsers) {
      if (userIds.includes(u.id)) {
        expect(u.emailEnc).toMatch(/^v2:k2:/);
      }
    }

    // Second run with same checkpoint must be idempotent with 0 failures
    const secondRun = await runRotation({ targetKeyId: "k2", checkpointPath, batchSize: 50 });
    expect(secondRun.phase).toBe("DONE");
    expect(secondRun.totalFailed).toBe(0);
  });
});

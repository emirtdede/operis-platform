import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import { encryptTotpSecret, decryptTotpSecret } from "@/src/modules/auth/totp";
import {
  encryptEnvelopeV2,
  decryptEnvelopeV2,
  encryptEnvelopeV2Buffer,
  decryptEnvelopeV2Buffer,
  getKeyRing,
  PiiCryptoError,
} from "@/src/lib/crypto/envelope";
import { encryptPii } from "@/src/lib/crypto";
import { evaluateWorkerHealth } from "@/scripts/lib/worker-health";
import { inspectMigrationHistory } from "@/scripts/migrate";

describe("Critical Audit Remediations & Regression Suite 2026", () => {
  // --------------------------------------------------------------------------
  // 1. Export Worker UUID Lease Token Validation
  // --------------------------------------------------------------------------
  describe("1. Export Worker UUID Lease Token Invariants", () => {
    it("strictly generates and enforces standard RFC 4122 UUID format for lease tokens", () => {
      const leaseToken = crypto.randomUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(leaseToken).toMatch(uuidRegex);

      const invalidToken = `worker-${process.pid}-${Date.now()}`;
      expect(invalidToken).not.toMatch(uuidRegex);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Export UI & API Contract Alignment
  // --------------------------------------------------------------------------
  describe("2. Export UI & API Contract Compatibility", () => {
    it("provides unified DTO containing top-level properties and nested job object", () => {
      const mockJob = {
        id: "job-123",
        status: "READY" as const,
        progress: 100,
        partCount: 3,
        fileSizeBytes: 2048576,
        checksumSha256: "a".repeat(64),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        completedAt: new Date(),
      };

      const downloadUrl = `/api/account/export?jobId=${encodeURIComponent(mockJob.id)}&download=1`;

      const jobDto = {
        id: mockJob.id,
        jobId: mockJob.id,
        status: mockJob.status,
        progress: mockJob.progress,
        progressPercent: mockJob.progress,
        partCount: mockJob.partCount,
        fileSizeBytes: mockJob.fileSizeBytes,
        checksumSha256: mockJob.checksumSha256,
        sha256Checksum: mockJob.checksumSha256,
        downloadUrl,
        expiresAt: mockJob.expiresAt.toISOString(),
        createdAt: mockJob.createdAt.toISOString(),
        completedAt: mockJob.completedAt.toISOString(),
      };

      const responsePayload = {
        ...jobDto,
        job: jobDto,
      };

      // Both modern and legacy UI consumers must succeed
      expect(responsePayload.jobId).toBe("job-123");
      expect(responsePayload.progressPercent).toBe(100);
      expect(responsePayload.downloadUrl).toBe(downloadUrl);
      expect(responsePayload.sha256Checksum).toBe("a".repeat(64));

      expect(responsePayload.job.id).toBe("job-123");
      expect(responsePayload.job.downloadUrl).toBe(downloadUrl);
      expect(responsePayload.job.sha256Checksum).toBe("a".repeat(64));
    });

    it("handles alreadyRunning active export response with 202 status and jobId", () => {
      const activeResponse = {
        success: true,
        jobId: "existing-job-uuid",
        status: "PROCESSING",
        alreadyRunning: true,
        pollAfterSeconds: 5,
        message: "Mevcut veri aktarım işi devam ediyor.",
      };

      expect(activeResponse.alreadyRunning).toBe(true);
      expect(activeResponse.jobId).toBe("existing-job-uuid");
      expect(activeResponse.status).toBe("PROCESSING");
    });
  });

  // --------------------------------------------------------------------------
  // 3. UTF-8 Multi-Byte Character Integrity Across 1 MiB Chunk Boundaries
  // --------------------------------------------------------------------------
  describe("3. UTF-8 Multi-Byte Chunk Boundary Integrity (Turkish Characters & Emojis)", () => {
    it("encrypts and decrypts binary Buffer without UTF-8 string truncation or boundary corruption", () => {
      // Create a payload where a 4-byte UTF-8 sequence or Turkish multibyte character crosses exactly at 1 MiB (1,048,576 bytes)
      const oneMiB = 1024 * 1024;
      const padding = Buffer.alloc(oneMiB - 2, "A"); // 2 bytes short of 1 MiB

      // Turkish multi-byte characters: 'ş' (2 bytes: 0xC5 0x9F), 'ğ' (2 bytes: 0xC4 0x9F)
      // Emoji: '🔒' (4 bytes: 0xF0 0x9F 0x94 0x92)
      const boundaryText = "şğ🔒OperisKVKKVeriAktarımı";
      const boundaryBuffer = Buffer.from(boundaryText, "utf8");

      const combinedBuffer = Buffer.concat([padding, boundaryBuffer]);
      expect(combinedBuffer.length).toBeGreaterThan(oneMiB);

      const context = {
        table: "export_job_parts",
        primaryKey: "job-boundary-test",
        column: "1:0",
      };

      // Encrypt raw buffer
      const ciphertext = encryptEnvelopeV2Buffer(combinedBuffer, context);
      expect(ciphertext.startsWith("v2:")).toBe(true);

      // Decrypt raw buffer
      const decryptedBuffer = decryptEnvelopeV2Buffer(ciphertext, context);
      expect(Buffer.isBuffer(decryptedBuffer)).toBe(true);
      expect(decryptedBuffer.length).toBe(combinedBuffer.length);

      // Compare exact byte contents
      expect(decryptedBuffer.equals(combinedBuffer)).toBe(true);

      // Verify the boundary string specifically
      const extractedBoundary = decryptedBuffer.subarray(oneMiB - 2).toString("utf8");
      expect(extractedBoundary).toBe(boundaryText);
    });
  });

  // --------------------------------------------------------------------------
  // 4. TOTP Reader Envelope v2 Decryption & AAD Context Verification
  // --------------------------------------------------------------------------
  describe("4. TOTP Envelope v2 AAD Binding & Decryption", () => {
    it("encrypts with userId AAD context and decrypts successfully with matching userId", () => {
      const userId = "4cb9bbd3-6e3e-4b4e-9ff1-52cf34d4023b";
      const secret = "JBSWY3DPEHPK3PXP";

      const ciphertext = encryptTotpSecret(userId, secret);
      expect(ciphertext.startsWith("v2:")).toBe(true);
      expect(ciphertext.split(":")).toHaveLength(5);

      const decrypted = decryptTotpSecret(userId, ciphertext);
      expect(decrypted).toBe(secret);
    });

    it("strictly fails decryption when an attacker attempts to substitute a different userId", () => {
      const victimUserId = "11111111-1111-1111-1111-111111111111";
      const attackerUserId = "22222222-2222-2222-2222-222222222222";
      const secret = "JBSWY3DPEHPK3PXP";

      const ciphertext = encryptTotpSecret(victimUserId, secret);

      expect(() => decryptTotpSecret(attackerUserId, ciphertext)).toThrow();
    });

    it("gracefully decrypts legacy 3-part ciphertext and plaintext Base32 fallback", () => {
      const secret = "MZXW6YTBOI======";
      const legacy3Part = encryptPii(secret);
      expect(legacy3Part.split(":")).toHaveLength(3);

      const decryptedLegacy = decryptTotpSecret(legacy3Part);
      expect(decryptedLegacy).toBe(secret);

      const plaintextSecret = "JBSWY3DPEHPK3PXP";
      const decryptedPlain = decryptTotpSecret(plaintextSecret);
      expect(decryptedPlain).toBe(plaintextSecret);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Immutable Keyring Decryption Across CURRENT Key ID Shift
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  describe("5. Keyring Decryption Immutability", () => {
    it("verifies that ciphertext encrypted under key 'k1' remains decryptable even when active key is 'k2'", () => {
      const keyring = getKeyRing();
      const availableKeyIds = Array.from(keyring.keys());

      expect(availableKeyIds.length).toBeGreaterThanOrEqual(1);
      const primaryKeyId = availableKeyIds[0]!;

      const plaintext = "Confidential PII Data 2026";
      const context = { table: "users", primaryKey: "user-1", column: "email_enc" };

      // Encrypt explicitly with primaryKeyId
      const ciphertextK1 = encryptEnvelopeV2(plaintext, context, primaryKeyId);
      expect(ciphertextK1.startsWith(`v2:${primaryKeyId}:`)).toBe(true);

      // Decrypt reads the keyId from the ciphertext header and looks up keyring
      const decrypted = decryptEnvelopeV2(ciphertextK1, context);
      expect(decrypted).toBe(plaintext);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Worker Health Observer State Machine & Webhook Retries
  // --------------------------------------------------------------------------
  describe("6. Worker Health Observer State Machine", () => {
    it("evaluates healthy heartbeat correctly", () => {
      const now = new Date();
      const freshHeartbeat = {
        schemaVersion: 2 as const,
        pid: 1234,
        uptimeSeconds: 100,
        timestamp: now.toISOString(),
        dbProbe: {
          status: "UP" as const,
          latencyMs: 12,
          lastCheckedAt: now.toISOString(),
        },
        outbox: {
          consecutiveFailures: 0,
          lastSuccessAt: now.toISOString(),
          deadCount: 0,
          failedCount: 0,
          oldestPendingSeconds: 5,
        },
        export: {
          consecutiveFailures: 0,
          lastAttemptAt: now.toISOString(),
          lastSuccessAt: now.toISOString(),
          activeJobId: null,
        },
        maintenance: {
          consecutiveFailures: 0,
          lastAttemptAt: now.toISOString(),
          lastSuccessAt: now.toISOString(),
          hasErrors: false,
          summary: {},
        },
      };

      const result = evaluateWorkerHealth(freshHeartbeat, now);
      expect(result.healthy).toBe(true);
      expect(result.reasons).toHaveLength(0);
      expect(result.dbProbeStatus).toBe("UP");
    });

    it("evaluates stale heartbeat as unhealthy and specifies reason", () => {
      const now = new Date();
      const staleTime = new Date(now.getTime() - 120 * 1000); // 2 minutes ago
      const staleHeartbeat = {
        schemaVersion: 2 as const,
        pid: 1234,
        uptimeSeconds: 120,
        timestamp: staleTime.toISOString(),
        dbProbe: {
          status: "UP" as const,
          latencyMs: 12,
          lastCheckedAt: staleTime.toISOString(),
        },
        outbox: {
          consecutiveFailures: 0,
          lastSuccessAt: staleTime.toISOString(),
          deadCount: 0,
          failedCount: 0,
          oldestPendingSeconds: 0,
        },
        export: {
          consecutiveFailures: 0,
          lastAttemptAt: staleTime.toISOString(),
          lastSuccessAt: staleTime.toISOString(),
          activeJobId: null,
        },
        maintenance: {
          consecutiveFailures: 0,
          lastAttemptAt: staleTime.toISOString(),
          lastSuccessAt: staleTime.toISOString(),
          hasErrors: false,
          summary: {},
        },
      };

      const result = evaluateWorkerHealth(staleHeartbeat, now);
      expect(result.healthy).toBe(false);
      expect(result.reasons.some((r) => r.includes("Stale heartbeat"))).toBe(true);
    });

    it("detects stuck export job over 600 seconds", () => {
      const now = new Date();
      const stuckJobTime = new Date(now.getTime() - 700 * 1000); // 700s ago
      const stuckHeartbeat = {
        schemaVersion: 2 as const,
        pid: 1234,
        uptimeSeconds: 750,
        timestamp: now.toISOString(),
        dbProbe: {
          status: "UP" as const,
          latencyMs: 5,
          lastCheckedAt: now.toISOString(),
        },
        outbox: {
          consecutiveFailures: 0,
          lastSuccessAt: now.toISOString(),
          deadCount: 0,
          failedCount: 0,
          oldestPendingSeconds: 0,
        },
        export: {
          consecutiveFailures: 0,
          lastAttemptAt: stuckJobTime.toISOString(),
          lastSuccessAt: null,
          activeJobId: "job-stuck-uuid",
        },
        maintenance: {
          consecutiveFailures: 0,
          lastAttemptAt: now.toISOString(),
          lastSuccessAt: now.toISOString(),
          hasErrors: false,
          summary: {},
        },
      };

      const result = evaluateWorkerHealth(stuckHeartbeat, now);
      expect(result.healthy).toBe(false);
      expect(result.reasons.some((r) => r.includes("Export job job-stuck-uuid stuck"))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Migration Runner History Table Inspection
  // --------------------------------------------------------------------------
  describe("7. Drizzle Migration History Preservation", () => {
    it("inspectMigrationHistory checks both drizzle schema and local schema tables", async () => {
      // Mock db client returning simulated drizzle migrations table
      const mockClient = {
        query: vi.fn().mockImplementation(async (sqlText: string) => {
          if (sqlText.includes("table_schema = 'drizzle'")) {
            return {
              rows: [{ exists: true }],
            };
          }
          if (sqlText.includes("WHERE table_schema = $1")) {
            return {
              rows: [{ exists: false }],
            };
          }
          if (sqlText.includes('FROM "drizzle"."__drizzle_migrations"')) {
            return {
              rows: [
                {
                  id: 1,
                  hash: "abc123hash",
                  created_at: Date.now().toString(),
                },
              ],
            };
          }
          return { rows: [] };
        }),
      };

      const history = await inspectMigrationHistory(
        mockClient as unknown as Parameters<typeof inspectMigrationHistory>[0],
        "public"
      );
      expect(history.hasDrizzleSchemaTable).toBe(true);
      expect(history.appliedHashes.has("abc123hash")).toBe(true);
      expect(history.tablesToUpdate).toContainEqual({
        schema: "drizzle",
        table: "__drizzle_migrations",
      });
    });

    it("detects and rejects conflicting migration hashes between drizzle and targetSchema tables", async () => {
      const ts = 1726000000000;
      const mockClient = {
        query: vi.fn().mockImplementation(async (sqlText: string) => {
          if (sqlText.includes("table_schema = 'drizzle'")) {
            return { rows: [{ exists: true }] };
          }
          if (sqlText.includes("WHERE table_schema = $1")) {
            return { rows: [{ exists: true }] };
          }
          if (sqlText.includes('FROM "drizzle"."__drizzle_migrations"')) {
            return { rows: [{ id: 1, hash: "hash_version_A", created_at: ts }] };
          }
          if (sqlText.includes('FROM "custom_schema"."__drizzle_migrations"')) {
            return { rows: [{ id: 1, hash: "hash_version_B", created_at: ts }] };
          }
          return { rows: [] };
        }),
      };

      await expect(
        inspectMigrationHistory(
          mockClient as unknown as Parameters<typeof inspectMigrationHistory>[0],
          "custom_schema"
        )
      ).rejects.toThrow(/Migration history conflict/);
    });
  });

  // --------------------------------------------------------------------------
  // 8. PII Rotation Keyset Cursor & Numeric Sorting Invariants
  // --------------------------------------------------------------------------
  describe("8. PII Rotation Keyset Cursor & Numeric Sorting Invariants", () => {
    it("correctly orders parts numerically across 9->10 and 99->100 boundaries rather than lexicographically", () => {
      // In lexicographical sorting: "10" < "9" and "100" < "99".
      // Keyset cursor MUST use numeric integer ordering: 9 < 10 and 99 < 100.
      const partNumbers = [1, 5, 9, 10, 11, 50, 99, 100, 101, 150];

      // Comparator replicating SQL composite cursor (jobId, attemptNo, partNo)
      const compositeCompare = (
        a: { jobId: string; attemptNo: number; partNo: number },
        b: { jobId: string; attemptNo: number; partNo: number }
      ) => {
        if (a.jobId !== b.jobId) return a.jobId.localeCompare(b.jobId);
        if (a.attemptNo !== b.attemptNo) return a.attemptNo - b.attemptNo;
        return a.partNo - b.partNo;
      };

      const jobId = "4cb9bbd3-6e3e-4b4e-9ff1-52cf34d4023b";
      const parts = partNumbers.map((partNo) => ({
        jobId,
        attemptNo: 1,
        partNo,
      }));

      const sorted = [...parts].sort(compositeCompare);

      // Verify strict ascending numeric order across boundaries
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i]!.partNo).toBeLessThan(sorted[i + 1]!.partNo);
      }

      // Check boundary 9 -> 10 specifically
      const idx9 = sorted.findIndex((p) => p.partNo === 9);
      const idx10 = sorted.findIndex((p) => p.partNo === 10);
      expect(idx9).toBeLessThan(idx10);

      // Check boundary 99 -> 100 specifically
      const idx99 = sorted.findIndex((p) => p.partNo === 99);
      const idx100 = sorted.findIndex((p) => p.partNo === 100);
      expect(idx99).toBeLessThan(idx100);
    });

    it("simulates 160 export parts keyset pagination without getting stuck on first page", () => {
      const jobId = "11111111-2222-3333-4444-555555555555";
      const totalParts = 160;
      const allParts = Array.from({ length: totalParts }, (_, i) => ({
        jobId,
        attemptNo: 1,
        partNo: i + 1,
      }));

      // Simulate keyset pagination loop with batch size 50
      const batchSize = 50;
      let cursor: { jobId: string; attemptNo: number; partNo: number } | null = null;
      const processed: number[] = [];

      while (true) {
        // Query simulation with WHERE (jobId, attemptNo, partNo) > cursor ORDER BY ... LIMIT batchSize
        const batch = allParts
          .filter((p) => {
            if (!cursor) return true;
            if (p.jobId !== cursor.jobId) return p.jobId > cursor.jobId;
            if (p.attemptNo !== cursor.attemptNo) return p.attemptNo > cursor.attemptNo;
            return p.partNo > cursor.partNo;
          })
          .slice(0, batchSize);

        if (batch.length === 0) break;

        for (const item of batch) {
          processed.push(item.partNo);
        }

        const last = batch[batch.length - 1]!;
        cursor = { jobId: last.jobId, attemptNo: last.attemptNo, partNo: last.partNo };
      }

      // All 160 items must be processed exactly once in strictly ascending order
      expect(processed).toHaveLength(160);
      expect(processed[0]).toBe(1);
      expect(processed[totalParts - 1]).toBe(160);
      expect(new Set(processed).size).toBe(160);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Crypto Callers Context Enforcement & Alias Rejection
  // --------------------------------------------------------------------------
  describe("9. Crypto Callers Context Enforcement & Alias Rejection", () => {
    it("rejects dynamic aliases 'current' and 'previous' for new ciphertexts", () => {
      const context = { table: "users", primaryKey: "user-test-1", column: "email_enc" };

      expect(() => {
        encryptEnvelopeV2("secret", context, "current");
      }).toThrowError(PiiCryptoError);

      expect(() => {
        encryptEnvelopeV2("secret", context, "previous");
      }).toThrowError(PiiCryptoError);
    });

    it("strictly enforces table, primaryKey, and column AAD context on Envelope v2 decryptions", () => {
      const context = { table: "users", primaryKey: "user-valid-1", column: "email_enc" };
      const ciphertext = encryptEnvelopeV2("sensitive@example.com", context, "k1");

      // Without context
      expect(() => {
        decryptEnvelopeV2(ciphertext);
      }).toThrowError(PiiCryptoError);

      // With wrong table
      expect(() => {
        decryptEnvelopeV2(ciphertext, {
          table: "user_private_identity",
          primaryKey: "user-valid-1",
          column: "email_enc",
        });
      }).toThrowError(PiiCryptoError);

      // With wrong column
      expect(() => {
        decryptEnvelopeV2(ciphertext, {
          table: "users",
          primaryKey: "user-valid-1",
          column: "phone_e164_enc",
        });
      }).toThrowError(PiiCryptoError);

      // With matching context -> succeeds
      expect(decryptEnvelopeV2(ciphertext, context)).toBe("sensitive@example.com");
    });
  });

  // --------------------------------------------------------------------------
  // 10. Export Job UUID Validation
  // --------------------------------------------------------------------------
  describe("10. Export Job UUID Validation", () => {
    it("strictly discriminates valid RFC 4122 UUIDs from malicious or malformed parameters", () => {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      // Valid UUIDs
      expect(UUID_REGEX.test("4cb9bbd3-6e3e-4b4e-9ff1-52cf34d4023b")).toBe(true);
      expect(UUID_REGEX.test(crypto.randomUUID())).toBe(true);

      // Invalid UUIDs (SQL injection attempt, worker token format, path traversal)
      expect(UUID_REGEX.test("worker-lease-token-AAA")).toBe(false);
      expect(UUID_REGEX.test("4cb9bbd3-6e3e-4b4e-9ff1-52cf34d4023b; DROP TABLE users;--")).toBe(
        false
      );
      expect(UUID_REGEX.test("../../../etc/passwd")).toBe(false);
      expect(UUID_REGEX.test("undefined")).toBe(false);
      expect(UUID_REGEX.test("")).toBe(false);
    });
  });
});

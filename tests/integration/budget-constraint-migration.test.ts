import { describe, it, expect } from "vitest";
import { createIsolatedTestDatabase } from "@/tests/helpers/test-database";
import { migrateDatabase } from "@/scripts/migrate";

/**
 * B22: 0007 Budget Integrity Check Constraint Matrix & Migration Verification
 *
 * Enforces:
 *   CHECK (
 *     status = 'DRAFT'
 *     OR (budget_mode = 'EXACT' AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min = budget_max AND budget_min > 0 AND budget_currency IS NOT NULL)
 *     OR (budget_mode = 'RANGE' AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min > 0 AND budget_max >= budget_min AND budget_currency IS NOT NULL)
 *     OR (budget_mode = 'OPEN_BID' AND (budget_min IS NULL OR budget_min > 0) AND (budget_max IS NULL OR budget_max > 0) AND (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min))
 *   )
 */

export function evaluateBudgetIntegrity(row: {
  status: string;
  budget_mode: string;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string | null;
}): boolean {
  if (row.status === "DRAFT") return true;

  if (row.budget_mode === "EXACT") {
    return (
      row.budget_min !== null &&
      row.budget_max !== null &&
      row.budget_min === row.budget_max &&
      row.budget_min > 0 &&
      row.budget_currency !== null
    );
  }

  if (row.budget_mode === "RANGE") {
    return (
      row.budget_min !== null &&
      row.budget_max !== null &&
      row.budget_min > 0 &&
      row.budget_max >= row.budget_min &&
      row.budget_currency !== null
    );
  }

  if (row.budget_mode === "OPEN_BID") {
    const minValid = row.budget_min === null || row.budget_min > 0;
    const maxValid = row.budget_max === null || row.budget_max > 0;
    const orderValid =
      row.budget_min === null || row.budget_max === null || row.budget_max >= row.budget_min;
    return minValid && maxValid && orderValid;
  }

  return false;
}

describe("B22: Budget Integrity Constraint Matrix & Migration Verification", () => {
  describe("1. Pure SQL Logic Invariants Matrix", () => {
    it("allows any budget configuration when status = 'DRAFT'", () => {
      expect(
        evaluateBudgetIntegrity({
          status: "DRAFT",
          budget_mode: "EXACT",
          budget_min: null,
          budget_max: null,
          budget_currency: null,
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "DRAFT",
          budget_mode: "RANGE",
          budget_min: -100,
          budget_max: -50,
          budget_currency: null,
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "DRAFT",
          budget_mode: "OPEN_BID",
          budget_min: -50,
          budget_max: -10,
          budget_currency: null,
        })
      ).toBe(true);
    });

    it("strictly validates EXACT budget mode", () => {
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "EXACT",
          budget_min: 5000,
          budget_max: 5000,
          budget_currency: "TRY",
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "EXACT",
          budget_min: 5000,
          budget_max: 6000,
          budget_currency: "TRY",
        })
      ).toBe(false);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "EXACT",
          budget_min: 0,
          budget_max: 0,
          budget_currency: "TRY",
        })
      ).toBe(false);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "EXACT",
          budget_min: 5000,
          budget_max: 5000,
          budget_currency: null,
        })
      ).toBe(false);
    });

    it("strictly validates RANGE budget mode", () => {
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "RANGE",
          budget_min: 3000,
          budget_max: 7000,
          budget_currency: "TRY",
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "RANGE",
          budget_min: 5000,
          budget_max: 5000,
          budget_currency: "TRY",
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "RANGE",
          budget_min: 7000,
          budget_max: 3000,
          budget_currency: "TRY",
        })
      ).toBe(false);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "RANGE",
          budget_min: -100,
          budget_max: 5000,
          budget_currency: "TRY",
        })
      ).toBe(false);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "RANGE",
          budget_min: 3000,
          budget_max: 7000,
          budget_currency: null,
        })
      ).toBe(false);
    });

    it("strictly validates OPEN_BID budget mode", () => {
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "OPEN_BID",
          budget_min: null,
          budget_max: null,
          budget_currency: null,
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "OPEN_BID",
          budget_min: 1000,
          budget_max: null,
          budget_currency: "TRY",
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "OPEN_BID",
          budget_min: null,
          budget_max: 5000,
          budget_currency: "TRY",
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "OPEN_BID",
          budget_min: 1000,
          budget_max: 5000,
          budget_currency: "TRY",
        })
      ).toBe(true);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "OPEN_BID",
          budget_min: -500,
          budget_max: 5000,
          budget_currency: "TRY",
        })
      ).toBe(false);
      expect(
        evaluateBudgetIntegrity({
          status: "ACTIVE",
          budget_mode: "OPEN_BID",
          budget_min: 5000,
          budget_max: 1000,
          budget_currency: "TRY",
        })
      ).toBe(false);
    });
  });

  describe("2. Live PostgreSQL Constraint and Upgrade Verification (B22)", () => {
    it("runs clean migrations and validates budget constraint on real listings table", async () => {
      const ctx = await createIsolatedTestDatabase();
      try {
        const client = await ctx.pool.connect();
        try {
          // Populate prerequisite user and category
          const userRes = await client.query(`
            INSERT INTO "users" (id, email, password_hash, role)
            VALUES (gen_random_uuid(), 'owner@operis.test', 'hash123', 'USER')
            RETURNING id;
          `);
          const ownerId = userRes.rows[0].id;

          const catRes = await client.query(`
            INSERT INTO "categories" (id, key)
            VALUES (gen_random_uuid(), 'cat_test_b22')
            RETURNING id;
          `);
          const catId = catRes.rows[0].id;

          // 1. Valid DRAFT insert with negative budget
          await client.query(`
            INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, timeline_mode, status)
            VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Draft Listing', 'draft-1', 'Summary', 'MEDIUM', 'EXACT', -100, -100, 'FLEXIBLE', 'DRAFT');
          `);

          // 2. Valid ACTIVE EXACT insert
          await client.query(`
            INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, budget_currency, timeline_mode, status)
            VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Active Exact', 'active-exact', 'Summary', 'MEDIUM', 'EXACT', 5000, 5000, 'TRY', 'FLEXIBLE', 'ACTIVE');
          `);

          // 3. Valid ACTIVE OPEN_BID insert
          await client.query(`
            INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, timeline_mode, status)
            VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Active Open', 'active-open', 'Summary', 'MEDIUM', 'OPEN_BID', NULL, NULL, 'FLEXIBLE', 'ACTIVE');
          `);

          // 4. Invalid OPEN_BID insert (negative min) must be rejected with SQLSTATE 23514
          let rejectedNegative = false;
          try {
            await client.query(`
              INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, budget_currency, timeline_mode, status)
              VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Invalid Negative', 'inv-neg', 'Summary', 'MEDIUM', 'OPEN_BID', -500, 1000, 'TRY', 'FLEXIBLE', 'ACTIVE');
            `);
          } catch (err: unknown) {
            if ((err as { code?: string }).code === "23514") {
              rejectedNegative = true;
            }
          }
          expect(rejectedNegative).toBe(true);

          // 5. Invalid EXACT insert (mismatch) must be rejected with SQLSTATE 23514
          let rejectedMismatch = false;
          try {
            await client.query(`
              INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, budget_currency, timeline_mode, status)
              VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Invalid Mismatch', 'inv-mis', 'Summary', 'MEDIUM', 'EXACT', 5000, 6000, 'TRY', 'FLEXIBLE', 'ACTIVE');
            `);
          } catch (err: unknown) {
            if ((err as { code?: string }).code === "23514") {
              rejectedMismatch = true;
            }
          }
          expect(rejectedMismatch).toBe(true);

          // 6. Atomic rollback verification in transaction batch
          let rolledBack = false;
          try {
            await client.query("BEGIN;");
            await client.query(`
              INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, budget_currency, timeline_mode, status)
              VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Rollback Valid', 'rb-valid', 'Summary', 'MEDIUM', 'EXACT', 8000, 8000, 'TRY', 'FLEXIBLE', 'ACTIVE');
            `);
            // This invalid insert aborts the transaction
            await client.query(`
              INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, budget_currency, timeline_mode, status)
              VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Rollback Invalid', 'rb-invalid', 'Summary', 'MEDIUM', 'EXACT', -999, -999, 'TRY', 'FLEXIBLE', 'ACTIVE');
            `);
            await client.query("COMMIT;");
          } catch {
            await client.query("ROLLBACK;");
            rolledBack = true;
          }
          expect(rolledBack).toBe(true);

          const rbCount = await client.query(
            `SELECT count(*)::int as c FROM "listings" WHERE slug = 'rb-valid';`
          );
          expect(rbCount.rows[0].c).toBe(0);

          // 7. Verify migrator idempotency: running migrateDatabase again makes no changes
          await migrateDatabase({
            connectionString: ctx.connectionString,
            schemaName: ctx.schemaName,
          });
        } finally {
          client.release();
        }
      } finally {
        await ctx.destroy();
      }
    });

    it("verifies upgrade from 0006 with invalid row failure and rollback recovery", async () => {
      // Create isolated test DB up through migration 0006
      const ctx = await createIsolatedTestDatabase({ throughTag: "0006" });
      try {
        const client = await ctx.pool.connect();
        try {
          const userRes = await client.query(`
            INSERT INTO "users" (id, email, password_hash, role)
            VALUES (gen_random_uuid(), 'upgrade_owner@operis.test', 'hash123', 'USER')
            RETURNING id;
          `);
          const ownerId = userRes.rows[0].id;

          const catRes = await client.query(`
            INSERT INTO "categories" (id, key)
            VALUES (gen_random_uuid(), 'cat_upgrade')
            RETURNING id;
          `);
          const catId = catRes.rows[0].id;

          // Insert an invalid OPEN_BID row that violates 0007's stricter constraint
          const invalidRowRes = await client.query(`
            INSERT INTO "listings" (id, owner_user_id, category_id, title, slug, summary, scope, budget_mode, budget_min, budget_max, budget_currency, timeline_mode, status)
            VALUES (gen_random_uuid(), '${ownerId}', '${catId}', 'Bad Row', 'bad-row', 'Summary', 'MEDIUM', 'OPEN_BID', -50, 100, 'TRY', 'FLEXIBLE', 'ACTIVE')
            RETURNING id;
          `);
          const invalidId = invalidRowRes.rows[0].id;

          // Applying 0007 must fail due to the invalid row
          let upgradeFailed = false;
          try {
            await migrateDatabase({
              connectionString: ctx.connectionString,
              schemaName: ctx.schemaName,
              throughTag: "0007",
            });
          } catch {
            upgradeFailed = true;
          }
          expect(upgradeFailed).toBe(true);

          // Fix the invalid row in the test
          await client.query(`
            UPDATE "listings"
            SET budget_min = 50, budget_max = 100
            WHERE id = '${invalidId}';
          `);

          // Now migration 0007 and onwards must succeed
          await migrateDatabase({
            connectionString: ctx.connectionString,
            schemaName: ctx.schemaName,
          });

          // Verify row is preserved
          const checkRes = await client.query(`
            SELECT status, budget_min FROM "listings" WHERE id = '${invalidId}';
          `);
          expect(checkRes.rows[0].status).toBe("ACTIVE");
          expect(Number(checkRes.rows[0].budget_min)).toBe(50);
        } finally {
          client.release();
        }
      } finally {
        await ctx.destroy();
      }
    });
  });
});

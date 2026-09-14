import pg from "pg";
import crypto from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { migrateDatabase } from "@/scripts/migrate";

export interface TestSchemaContext {
  schemaName: string;
  pool: pg.Pool;
  db: ReturnType<typeof drizzle<typeof schema>>;
  destroy: () => Promise<void>;
}

export function getVerifiedTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    const err = new Error("TEST_DB_NOT_ALLOWED: TEST_DATABASE_URL is not set.");
    (err as unknown as { code: string }).code = "TEST_DB_NOT_ALLOWED";
    throw err;
  }
  const parsed = new URL(url);
  const host = parsed.hostname;
  if (!["localhost", "127.0.0.1", "postgres"].includes(host)) {
    const err = new Error(`TEST_DB_NOT_ALLOWED: Host ${host} is not allowed.`);
    (err as unknown as { code: string }).code = "TEST_DB_NOT_ALLOWED";
    throw err;
  }
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.startsWith("operis_test")) {
    const err = new Error(`TEST_DB_NOT_ALLOWED: DB ${dbName} must start with operis_test.`);
    (err as unknown as { code: string }).code = "TEST_DB_NOT_ALLOWED";
    throw err;
  }
  return url;
}

export interface TestDatabaseContext {
  dbName: string;
  schemaName: string;
  connectionString: string;
  pool: pg.Pool;
  db: ReturnType<typeof drizzle<typeof schema>>;
  destroy: () => Promise<void>;
}

/**
 * Creates an isolated, ephemeral PostgreSQL database (operis_test_<uuid>)
 * for an integration test suite, runs migrations on its clean public schema,
 * and completely drops the database upon test teardown.
 */
export async function createIsolatedTestDatabase(options?: {
  throughTag?: string;
  skipMigrations?: boolean;
}): Promise<TestDatabaseContext> {
  const baseConnectionString = getVerifiedTestDatabaseUrl();
  const parsed = new URL(baseConnectionString);
  const dbSuffix = crypto.randomUUID().replace(/-/g, "");
  const dbName = `operis_test_${dbSuffix}`;

  // 1. Connect to base admin DB and CREATE DATABASE
  const adminPool = new pg.Pool({ connectionString: baseConnectionString, max: 1 });
  try {
    await adminPool.query(`CREATE DATABASE "${dbName}";`);
  } finally {
    await adminPool.end();
  }

  // 2. Build connection URL for the newly created isolated DB
  parsed.pathname = `/${dbName}`;
  const isolatedConnectionString = parsed.toString();

  const pool = new pg.Pool({
    connectionString: isolatedConnectionString,
    max: 5,
    statement_timeout: 60000,
  });

  try {
    if (!options?.skipMigrations) {
      await migrateDatabase({
        connectionString: isolatedConnectionString,
        throughTag: options?.throughTag,
      });
    }
  } catch (setupErr) {
    try {
      await pool.end();
    } catch {
      // ignore
    }
    const cleanupPool = new pg.Pool({ connectionString: baseConnectionString, max: 1 });
    try {
      await cleanupPool.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid();`,
        [dbName]
      );
      await cleanupPool.query(`DROP DATABASE IF EXISTS "${dbName}";`);
    } catch {
      // ignore
    } finally {
      await cleanupPool.end();
    }
    throw setupErr;
  }

  const db = drizzle(pool, { schema });

  const destroy = async () => {
    try {
      await pool.end();
    } catch {
      // ignore
    }

    if (!dbName.startsWith("operis_test_")) {
      throw new Error(`REFUSING to drop non-test database: ${dbName}`);
    }

    const cleanupPool = new pg.Pool({ connectionString: baseConnectionString, max: 1 });
    try {
      // Terminate any remaining active connections to the isolated test database
      await cleanupPool.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid();`,
        [dbName]
      );
      await cleanupPool.query(`DROP DATABASE IF EXISTS "${dbName}";`);
    } finally {
      await cleanupPool.end();
    }
  };

  return {
    dbName,
    schemaName: "public",
    connectionString: isolatedConnectionString,
    pool,
    db,
    destroy,
  };
}

/**
 * Creates an isolated PostgreSQL schema for test suites, binds search_path,
 * runs all active migrations within the schema, and returns cleanup functions.
 */
export async function createIsolatedTestSchema(options?: {
  throughTag?: string;
  skipMigrations?: boolean;
}): Promise<TestSchemaContext> {
  const connectionString = getVerifiedTestDatabaseUrl();
  const schemaSuffix = crypto.randomUUID().replace(/-/g, "");
  const schemaName = `test_${schemaSuffix}`;

  const adminPool = new pg.Pool({ connectionString, max: 1 });
  try {
    await adminPool.query(`CREATE SCHEMA "${schemaName}";`);
  } finally {
    await adminPool.end();
  }

  const pool = new pg.Pool({
    connectionString,
    max: 5,
    statement_timeout: 60000,
  });

  // Set search_path for all connections
  pool.on("connect", (client) => {
    client.query(`SET search_path TO "${schemaName}", public;`);
  });

  try {
    if (!options?.skipMigrations) {
      await migrateDatabase({
        connectionString,
        schemaName,
        throughTag: options?.throughTag,
      });
    }
  } catch (setupErr) {
    try {
      await pool.end();
    } catch {
      // ignore
    }
    const cleanupPool = new pg.Pool({ connectionString, max: 1 });
    try {
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
    } catch {
      // ignore
    } finally {
      await cleanupPool.end();
    }
    throw setupErr;
  }

  const db = drizzle(pool, { schema });

  const destroy = async () => {
    try {
      await pool.end();
    } catch {
      // ignore pool close error
    }

    if (!schemaName.startsWith("test_")) {
      throw new Error(`REFUSING to drop non-test schema: ${schemaName}`);
    }

    const cleanupPool = new pg.Pool({ connectionString, max: 1 });
    try {
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`);
    } finally {
      await cleanupPool.end();
    }
  };

  return { schemaName, pool, db, destroy };
}

/**
 * B25-ENTRY: Strict fail-closed verification before any mutating E2E test action.
 * Refuses execution if TEST_DATABASE_URL is missing, invalid, points to non-test host,
 * has non-ephemeral DB name, does not match DATABASE_URL, or lacks runner token.
 */
export function assertSafeE2ETestEnvironment(): void {
  const testDbUrl = (process.env.TEST_DATABASE_URL || "").trim();
  if (!testDbUrl) {
    throw new Error("B25-ENTRY: FAIL-CLOSED: TEST_DATABASE_URL is missing or empty.");
  }

  const runnerToken = (process.env.OPERIS_E2E_RUNNER_TOKEN || "").trim();
  if (
    !runnerToken ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runnerToken)
  ) {
    throw new Error(
      "B25-ENTRY: FAIL-CLOSED: Valid OPERIS_E2E_RUNNER_TOKEN is required for mutating E2E tests."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(testDbUrl);
  } catch {
    throw new Error("B25-ENTRY: FAIL-CLOSED: TEST_DATABASE_URL is not a valid URL.");
  }

  const host = parsed.hostname;
  if (!["localhost", "127.0.0.1", "postgres"].includes(host)) {
    throw new Error(`B25-ENTRY: FAIL-CLOSED: Host '${host}' is not allowed for E2E tests.`);
  }

  const dbName = parsed.pathname.replace(/^\//, "");
  if (!dbName.startsWith("operis_test_")) {
    throw new Error(
      `B25-ENTRY: FAIL-CLOSED: DB '${dbName}' must be an ephemeral database starting with operis_test_.`
    );
  }

  const appDbUrl = (process.env.DATABASE_URL || "").trim();
  if (appDbUrl && appDbUrl !== testDbUrl) {
    throw new Error(
      "B25-ENTRY: FAIL-CLOSED: DATABASE_URL does not match verified TEST_DATABASE_URL."
    );
  }
}

/**
 * B25-RUNNER: Safely drop abandoned ephemeral test databases (operis_test_*)
 * from interrupted runs.
 */
export async function cleanupStaleEphemeralDatabases(_options?: {
  excludeDbNames?: string[];
  force?: boolean;
}): Promise<string[]> {
  // Never infer ownership from a name or absence of active connections.
  // Only the destroy closure returned by createIsolatedTestDatabase may drop its own DB.
  // Kept as a non-destructive compatibility API for older callers.
  return [];
}

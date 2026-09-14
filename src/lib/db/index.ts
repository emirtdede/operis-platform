import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@/db/schema";
import { getEnv } from "@/src/config/env";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let shutdownRegistered = false;

function registerGracefulShutdown(p: pg.Pool) {
  if (shutdownRegistered) return;
  shutdownRegistered = true;

  const closePool = async () => {
    try {
      await p.end();
    } catch {
      // ignore
    }
  };

  if (
    typeof process !== "undefined" &&
    typeof process.once === "function" &&
    process.env.NODE_ENV === "production"
  ) {
    process.once("SIGTERM", closePool);
    process.once("SIGINT", closePool);
  }
}

export function getDbPool(): pg.Pool {
  if (!pool) {
    const env = getEnv();
    const isSupabase =
      env.DATABASE_URL.includes("supabase.co") || env.DATABASE_URL.includes("pooler.supabase.com");
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
    });
    registerGracefulShutdown(pool);
  }
  return pool;
}

export function getDb() {
  if (!dbInstance) {
    const p = getDbPool();
    dbInstance = drizzle(p, { schema });
  }
  return dbInstance;
}

export function setDbForTesting(mockDb: unknown, testPool?: pg.Pool) {
  dbInstance = mockDb as ReturnType<typeof drizzle<typeof schema>>;
  if (testPool) {
    pool = testPool;
  }
}

export function resetDbForTesting() {
  dbInstance = null;
  pool = null;
}

export { schema };
export * from "./locks";
export * from "./cancellation";

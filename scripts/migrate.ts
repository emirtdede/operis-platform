import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "node:path";
import { getEnv } from "@/src/config/env";

const { Pool } = pg;

async function runMigrations() {
  const env = getEnv();
  console.info("Running database migrations on:", env.DATABASE_URL.replace(/:[^:@]+@/, ":***@"));

  const pool = new Pool({
    connectionString: env.DATABASE_MIGRATION_URL || env.DATABASE_URL,
    max: 1,
  });

  const db = drizzle(pool);

  try {
    const migrationsFolder = path.resolve(process.cwd(), "db/migrations");
    await migrate(db, { migrationsFolder });
    console.info("Migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();

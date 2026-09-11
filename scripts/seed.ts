import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { SEED_CATEGORIES } from "@/db/seeds/categories";
import { getEnv } from "@/src/config/env";

const { Pool } = pg;

async function runSeed() {
  const env = getEnv();
  console.info("Seeding database taxonomy on:", env.DATABASE_URL.replace(/:[^:@]+@/, ":***@"));

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 2,
  });

  const db = drizzle(pool, { schema });

  try {
    console.info(`Seeding ${SEED_CATEGORIES.length} official technology categories...`);

    for (const cat of SEED_CATEGORIES) {
      // Upsert category by key
      const existing = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.key, cat.key))
        .limit(1);

      let categoryId: string;

      if (existing.length === 0) {
        const [inserted] = await db
          .insert(schema.categories)
          .values({
            key: cat.key,
            sortOrder: cat.sortOrder,
            isActive: true,
          })
          .returning({ id: schema.categories.id });
        categoryId = inserted!.id;
      } else {
        categoryId = existing[0]!.id;
        await db
          .update(schema.categories)
          .set({ sortOrder: cat.sortOrder, isActive: true })
          .where(eq(schema.categories.id, categoryId));
      }

      // Upsert translations for 'tr' and 'en'
      for (const locale of ["tr", "en"] as const) {
        const trans = cat.translations[locale];
        const existingTrans = await db
          .select()
          .from(schema.categoryTranslations)
          .where(eq(schema.categoryTranslations.categoryId, categoryId));

        const hasLocale = existingTrans.some((t) => t.locale === locale);

        if (!hasLocale) {
          await db.insert(schema.categoryTranslations).values({
            categoryId,
            locale,
            name: trans.name,
            description: trans.description,
          });
        } else {
          await db
            .update(schema.categoryTranslations)
            .set({ name: trans.name, description: trans.description })
            .where(
              and(
                eq(schema.categoryTranslations.categoryId, categoryId),
                eq(schema.categoryTranslations.locale, locale)
              )
            );
        }
      }
    }

    console.info("Categories and translations seeded successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();

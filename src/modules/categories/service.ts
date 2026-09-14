import crypto from "node:crypto";
import { eq, and, asc, inArray } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { Locale } from "@/src/lib/i18n/config";
import { SEED_CATEGORIES } from "@/db/seeds/categories";

export interface CategoryDto {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isFollowed?: boolean;
}

// In-memory fallback follows when DB is offline or unseeded
const inMemoryFollows = new Map<string, Set<string>>();

export function getDeterministicUuid(key: string): string {
  const hash = crypto.createHash("md5").update(`operis-cat-${key}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function getFallbackCategories(locale: Locale, userId?: string): CategoryDto[] {
  const lang = locale === "tr" ? "tr" : "en";
  const userFollows = userId ? inMemoryFollows.get(userId) : undefined;

  return SEED_CATEGORIES.map((cat) => {
    const trans = cat.translations[lang] || cat.translations.tr;
    const catId = getDeterministicUuid(cat.key);
    return {
      id: catId,
      key: cat.key,
      slug: cat.key,
      name: trans.name,
      description: trans.description,
      sortOrder: cat.sortOrder,
      isActive: true,
      isFollowed: userFollows ? userFollows.has(catId) || userFollows.has(cat.key) : false,
    };
  });
}

export class CategoryService {
  /**
   * Returns all active categories localized to the requested locale.
   * If userId is provided, attaches the private `isFollowed` status.
   */
  static async getAllCategories(locale: Locale, userId?: string): Promise<CategoryDto[]> {
    return this.getCategories(locale, userId);
  }

  static async getCategories(locale: Locale, userId?: string): Promise<CategoryDto[]> {
    try {
      const db = getDb();

      // 1. Fetch active categories
      const categoryRows = await db
        .select({
          id: schema.categories.id,
          key: schema.categories.key,
          sortOrder: schema.categories.sortOrder,
          isActive: schema.categories.isActive,
        })
        .from(schema.categories)
        .where(eq(schema.categories.isActive, true))
        .orderBy(asc(schema.categories.sortOrder));

      if (categoryRows && categoryRows.length > 0) {
        // 2. Fetch translations for this locale and fallback 'tr'
        const localesToFetch = Array.from(new Set([locale, "tr"]));
        const translationRows = await db
          .select({
            categoryId: schema.categoryTranslations.categoryId,
            locale: schema.categoryTranslations.locale,
            name: schema.categoryTranslations.name,
            description: schema.categoryTranslations.description,
          })
          .from(schema.categoryTranslations)
          .where(inArray(schema.categoryTranslations.locale, localesToFetch));

        const transMap = new Map<string, { name: string; description: string | null }>();
        const trFallbackMap = new Map<string, { name: string; description: string | null }>();

        for (const t of translationRows) {
          if (t.locale === locale) {
            transMap.set(t.categoryId, { name: t.name, description: t.description });
          } else if (t.locale === "tr") {
            trFallbackMap.set(t.categoryId, { name: t.name, description: t.description });
          }
        }

        // 3. If authenticated user, fetch private follows
        let followedSet = new Set<string>();
        if (userId) {
          const followRows = await db
            .select({ categoryId: schema.categoryFollows.categoryId })
            .from(schema.categoryFollows)
            .where(eq(schema.categoryFollows.userId, userId));
          followedSet = new Set(followRows.map((f) => f.categoryId));
        }

        return categoryRows.map((cat) => {
          const trans = transMap.get(cat.id) ||
            trFallbackMap.get(cat.id) || { name: cat.key, description: null };
          return {
            id: cat.id,
            key: cat.key,
            slug: cat.key,
            name: trans.name,
            description: trans.description,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
            isFollowed: userId ? followedSet.has(cat.id) : undefined,
          };
        });
      }
    } catch {
      // Gracefully fall through to SEED_CATEGORIES when database is unreachable or unseeded
    }

    return getFallbackCategories(locale, userId);
  }

  /**
   * Toggles category follow state for a user.
   */
  static async toggleFollow(userId: string, categoryId: string): Promise<boolean> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      categoryId
    );
    try {
      const db = getDb();

      const categoryRows = await db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(
          isUuid ? eq(schema.categories.id, categoryId) : eq(schema.categories.key, categoryId)
        )
        .limit(1);

      if (categoryRows.length === 0) {
        throw new Error("Category not found");
      }

      const targetId = categoryRows[0]!.id;

      const existing = await db
        .select()
        .from(schema.categoryFollows)
        .where(
          and(
            eq(schema.categoryFollows.userId, userId),
            eq(schema.categoryFollows.categoryId, targetId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(schema.categoryFollows)
          .where(
            and(
              eq(schema.categoryFollows.userId, userId),
              eq(schema.categoryFollows.categoryId, targetId)
            )
          );
        return false; // unfollowed
      } else {
        await db
          .insert(schema.categoryFollows)
          .values({
            userId,
            categoryId: targetId,
          })
          .onConflictDoNothing();
        return true; // followed
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      if (err instanceof Error && err.message === "Category not found") {
        throw err;
      }
      // In-memory fallback
      let userSet = inMemoryFollows.get(userId);
      if (!userSet) {
        userSet = new Set<string>();
        inMemoryFollows.set(userId, userSet);
      }
      const catUuid = isUuid ? categoryId : getDeterministicUuid(categoryId);
      if (userSet.has(categoryId) || userSet.has(catUuid)) {
        userSet.delete(categoryId);
        userSet.delete(catUuid);
        return false;
      } else {
        userSet.add(categoryId);
        userSet.add(catUuid);
        return true;
      }
    }
  }

  /**
   * Follows all currently active categories.
   */
  static async followAll(userId: string): Promise<void> {
    try {
      const db = getDb();

      const activeCategories = await db
        .select({ id: schema.categories.id })
        .from(schema.categories)
        .where(eq(schema.categories.isActive, true));

      if (activeCategories && activeCategories.length > 0) {
        await db
          .insert(schema.categoryFollows)
          .values(
            activeCategories.map((cat) => ({
              userId,
              categoryId: cat.id,
            }))
          )
          .onConflictDoNothing();
        return;
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      // In-memory fallback
    }

    const allIds = SEED_CATEGORIES.flatMap((c) => [getDeterministicUuid(c.key), c.key]);
    inMemoryFollows.set(userId, new Set(allIds));
  }

  /**
   * Unfollows all categories for a user.
   */
  static async unfollowAll(userId: string): Promise<void> {
    try {
      const db = getDb();
      await db.delete(schema.categoryFollows).where(eq(schema.categoryFollows.userId, userId));
      return;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      // In-memory fallback
    }
    inMemoryFollows.delete(userId);
  }

  /**
   * Fetches user's private followed category IDs.
   * STRICT ACCESS CONTROL: Only account owner or server feed logic can invoke this.
   */
  static async getFollowedCategoryIds(userId: string): Promise<string[]> {
    try {
      const db = getDb();
      const rows = await db
        .select({ categoryId: schema.categoryFollows.categoryId })
        .from(schema.categoryFollows)
        .where(eq(schema.categoryFollows.userId, userId));

      return rows.map((r) => r.categoryId);
    } catch {
      if (process.env.NODE_ENV === "production") {
        return [];
      }
      // In-memory fallback
    }

    return Array.from(inMemoryFollows.get(userId) || []);
  }
}

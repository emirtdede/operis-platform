import { eq, and, asc } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { Locale } from "@/src/lib/i18n/config";

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

export class CategoryService {
  /**
   * Returns all active categories localized to the requested locale.
   * If userId is provided, attaches the private `isFollowed` status.
   */
  static async getAllCategories(
    locale: Locale,
    userId?: string
  ): Promise<CategoryDto[]> {
    return this.getCategories(locale, userId);
  }

  static async getCategories(
    locale: Locale,
    userId?: string
  ): Promise<CategoryDto[]> {
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

    // 2. Fetch translations for this locale
    const translationRows = await db
      .select({
        categoryId: schema.categoryTranslations.categoryId,
        name: schema.categoryTranslations.name,
        description: schema.categoryTranslations.description,
      })
      .from(schema.categoryTranslations)
      .where(eq(schema.categoryTranslations.locale, locale));

    const transMap = new Map(
      translationRows.map((t) => [t.categoryId, { name: t.name, description: t.description }])
    );

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
      const trans = transMap.get(cat.id) || { name: cat.key, description: null };
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

  /**
   * Toggles category follow state for a user.
   */
  static async toggleFollow(userId: string, categoryId: string): Promise<boolean> {
    const db = getDb();

    const existing = await db
      .select()
      .from(schema.categoryFollows)
      .where(
        and(
          eq(schema.categoryFollows.userId, userId),
          eq(schema.categoryFollows.categoryId, categoryId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(schema.categoryFollows)
        .where(
          and(
            eq(schema.categoryFollows.userId, userId),
            eq(schema.categoryFollows.categoryId, categoryId)
          )
        );
      return false; // unfollowed
    } else {
      await db.insert(schema.categoryFollows).values({
        userId,
        categoryId,
      });
      return true; // followed
    }
  }

  /**
   * Follows all currently active categories.
   */
  static async followAll(userId: string): Promise<void> {
    const db = getDb();

    const activeCategories = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true));

    await db.transaction(async (tx) => {
      for (const cat of activeCategories) {
        // Upsert follow
        const existing = await tx
          .select({ userId: schema.categoryFollows.userId })
          .from(schema.categoryFollows)
          .where(
            and(
              eq(schema.categoryFollows.userId, userId),
              eq(schema.categoryFollows.categoryId, cat.id)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          await tx.insert(schema.categoryFollows).values({
            userId,
            categoryId: cat.id,
          });
        }
      }
    });
  }

  /**
   * Unfollows all categories for a user.
   */
  static async unfollowAll(userId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(schema.categoryFollows)
      .where(eq(schema.categoryFollows.userId, userId));
  }

  /**
   * Fetches user's private followed category IDs.
   * STRICT ACCESS CONTROL: Only account owner or server feed logic can invoke this.
   */
  static async getFollowedCategoryIds(userId: string): Promise<string[]> {
    const db = getDb();
    const rows = await db
      .select({ categoryId: schema.categoryFollows.categoryId })
      .from(schema.categoryFollows)
      .where(eq(schema.categoryFollows.userId, userId));

    return rows.map((r) => r.categoryId);
  }
}

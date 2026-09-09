import { eq, and, desc } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { EMOJI_REGEX } from "@/scripts/check-emojis";
import { ProfileLinkInput, profileLinkSchema } from "./links";
import { RESERVED_HANDLES } from "../auth/validation";

export interface PublicProfileDto {
  userId: string;
  handle: string;
  displayName: string;
  about: string | null;
  showLocation: boolean;
  location?: { countryCode: string; city: string } | null;
  links: Array<{
    id: string;
    type: string;
    label: string;
    url: string;
  }>;
  completedWork: Array<{
    engagementId: string;
    title: string;
    category: string;
    completedAt: Date;
    counterparty: {
      displayName: string;
      handle: string;
      isDeleted: boolean;
    };
  }>;
}

export interface UpdateProfileInput {
  displayName?: string;
  handle?: string;
  about?: string | null;
  showLocation?: boolean;
  revealPhoneAfterMatch?: boolean;
  locale?: string;
  theme?: string;
}

export class ProfileService {
  /**
   * Fetches public profile with only mutually completed work and public links.
   * Never exposes private identity or incomplete projects.
   */
  static async getPublicProfileByHandle(handle: string): Promise<PublicProfileDto | null> {
    const db = getDb();

    // 1. Fetch profile
    const profileRows = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.handle, handle.toLowerCase()))
      .limit(1);

    if (profileRows.length === 0) return null;
    const profile = profileRows[0]!;

    // 2. Fetch public links
    const links = await db
      .select({
        id: schema.profileLinks.id,
        type: schema.profileLinks.type,
        label: schema.profileLinks.label,
        url: schema.profileLinks.url,
      })
      .from(schema.profileLinks)
      .where(eq(schema.profileLinks.userId, profile.userId))
      .orderBy(schema.profileLinks.sortOrder);

    // 3. Location if enabled
    let location = null;
    if (profile.showLocation) {
      const identityRows = await db
        .select({
          countryCode: schema.userPrivateIdentity.countryCode,
          city: schema.userPrivateIdentity.city,
        })
        .from(schema.userPrivateIdentity)
        .where(eq(schema.userPrivateIdentity.userId, profile.userId))
        .limit(1);

      if (identityRows.length > 0) {
        location = identityRows[0];
      }
    }

    // 4. Fetch ONLY mutually completed engagements
    // Either the user was the owner, or the freelancer
    const completedEngagements = await db
      .select()
      .from(schema.engagements)
      .where(
        and(
          eq(schema.engagements.status, "COMPLETED")
          // Must involve this user
        )
      )
      .orderBy(desc(schema.engagements.completedAt));

    const userCompleted = completedEngagements.filter(
      (eng) => eng.ownerUserId === profile.userId || eng.freelancerUserId === profile.userId
    );

    // Build counterparty details safely
    const completedWork = [];
    for (const eng of userCompleted) {
      const counterpartyUserId =
        eng.ownerUserId === profile.userId ? eng.freelancerUserId : eng.ownerUserId;

      const cpUserRows = await db
        .select({ status: schema.users.status })
        .from(schema.users)
        .where(eq(schema.users.id, counterpartyUserId))
        .limit(1);

      const cpProfileRows = await db
        .select({ displayName: schema.profiles.displayName, handle: schema.profiles.handle })
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, counterpartyUserId))
        .limit(1);

      const isDeleted = cpUserRows[0]?.status === "DELETED";

      completedWork.push({
        engagementId: eng.id,
        title: eng.listingTitleSnapshot,
        category: eng.listingCategorySnapshot,
        completedAt: eng.completedAt || eng.matchedAt,
        counterparty: {
          displayName: isDeleted ? "Former User" : cpProfileRows[0]?.displayName || "User",
          handle: isDeleted ? "former-user" : cpProfileRows[0]?.handle || "user",
          isDeleted,
        },
      });
    }

    return {
      userId: profile.userId,
      handle: profile.handle,
      displayName: profile.displayName,
      about: profile.about,
      showLocation: profile.showLocation,
      location,
      links,
      completedWork,
    };
  }

  /**
   * Updates profile fields with validation and reserved handles protection.
   */
  static async updateProfile(userId: string, input: UpdateProfileInput): Promise<void> {
    const db = getDb();
    const updateData: Partial<typeof schema.profiles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.displayName !== undefined) {
      const trimmed = input.displayName.trim();
      if (trimmed.length < 2 || trimmed.length > 80 || EMOJI_REGEX.test(trimmed)) {
        throw new Error("Display name must be 2-80 characters and contain no emojis.");
      }
      updateData.displayName = trimmed;
    }

    if (input.handle !== undefined) {
      const handle = input.handle.toLowerCase().trim();
      if (
        handle.length < 3 ||
        handle.length > 30 ||
        !/^[a-z0-9_-]+$/.test(handle) ||
        RESERVED_HANDLES.has(handle)
      ) {
        throw new Error("Invalid or reserved handle.");
      }

      // Check unique
      const existing = await db
        .select({ userId: schema.profiles.userId })
        .from(schema.profiles)
        .where(eq(schema.profiles.handle, handle))
        .limit(1);

      if (existing.length > 0 && existing[0]?.userId !== userId) {
        throw new Error("This handle is already taken.");
      }

      updateData.handle = handle;
    }

    if (input.about !== undefined) {
      if (input.about && (input.about.length > 1000 || EMOJI_REGEX.test(input.about))) {
        throw new Error("About text cannot exceed 1000 characters or contain emojis.");
      }
      updateData.about = input.about || null;
    }

    if (input.showLocation !== undefined) {
      updateData.showLocation = input.showLocation;
    }

    if (input.revealPhoneAfterMatch !== undefined) {
      updateData.revealPhoneAfterMatch = input.revealPhoneAfterMatch;
    }

    if (input.locale !== undefined) {
      updateData.locale = input.locale;
    }

    if (input.theme !== undefined) {
      updateData.theme = input.theme;
    }

    await db
      .update(schema.profiles)
      .set(updateData)
      .where(eq(schema.profiles.userId, userId));
  }

  /**
   * Replaces profile links transactionally (maximum 10 links allowed).
   */
  static async updateLinks(userId: string, linksInput: ProfileLinkInput[]): Promise<void> {
    if (linksInput.length > 10) {
      throw new Error("You can configure at most 10 professional links.");
    }

    const validatedLinks = linksInput.map((l) => profileLinkSchema.parse(l));
    const db = getDb();

    await db.transaction(async (tx) => {
      await tx
        .delete(schema.profileLinks)
        .where(eq(schema.profileLinks.userId, userId));

      for (let i = 0; i < validatedLinks.length; i++) {
        const link = validatedLinks[i]!;
        await tx.insert(schema.profileLinks).values({
          userId,
          type: link.type,
          label: link.label,
          url: link.url,
          sortOrder: i,
        });
      }
    });
  }
}

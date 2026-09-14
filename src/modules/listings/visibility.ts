/**
 * Unified Listing Visibility Evaluator (Fixes B03)
 * Provides consistent visibility enforcement across listing detail views, feeds, and APIs.
 */

export interface ListingVisibilitySubject {
  id: string;
  slug?: string;
  ownerUserId: string;
  ownerStatus?: string | null;
  status: string;
  activeUntil?: Date | string | null;
}

export interface ViewerContext {
  userId?: string | null;
  role?: string | null;
  blockedUserIds?: string[];
  blockedByUserIds?: string[];
}

export interface ListingVisibilityResult {
  visible: boolean;
  reason?: string;
}

/**
 * Evaluates whether a listing should be visible to a given viewer.
 *
 * Rules:
 * 1. Owner and Platform Admins/Moderators can view any listing regardless of status or expiration.
 * 2. If the viewer has blocked the owner, or the owner has blocked the viewer, the listing is hidden.
 * 3. If the listing owner account is suspended or inactive, the listing is hidden from 3rd-parties.
 * 4. For public/anonymous and other users:
 *    - Listing must have status === 'ACTIVE'
 *    - Listing must have a valid finite activeUntil timestamp where activeUntil > now
 */
export function evaluateListingVisibility(
  listing: ListingVisibilitySubject,
  viewer?: ViewerContext
): ListingVisibilityResult {
  const isOwner = Boolean(viewer?.userId && viewer.userId === listing.ownerUserId);
  const isAdminOrMod = Boolean(
    viewer?.role &&
    (viewer.role === "ADMIN" || viewer.role === "SECURITY_ADMIN" || viewer.role === "MODERATOR")
  );

  // 1. Owner and privileged staff can always view
  if (isOwner || isAdminOrMod) {
    return { visible: true };
  }

  // 2. Enforce mutual blocking exclusions
  if (viewer?.userId) {
    if (viewer.blockedUserIds && viewer.blockedUserIds.includes(listing.ownerUserId)) {
      return { visible: false, reason: "VIEWER_BLOCKED_OWNER" };
    }
    if (viewer.blockedByUserIds && viewer.blockedByUserIds.includes(listing.ownerUserId)) {
      return { visible: false, reason: "OWNER_BLOCKED_VIEWER" };
    }
  }

  // 3. Enforce active owner account status
  if (listing.ownerStatus && listing.ownerStatus !== "ACTIVE") {
    return { visible: false, reason: "OWNER_SUSPENDED_OR_INACTIVE" };
  }

  // 4. Status check: Only ACTIVE listings are visible to general audience
  if (listing.status !== "ACTIVE") {
    return { visible: false, reason: "STATUS_NOT_ACTIVE" };
  }

  // 5. Expiration check: 3rd parties require a valid, future expiration date (Fixes B03)
  if (!listing.activeUntil) {
    return { visible: false, reason: "EXPIRED" };
  }

  const expiresAt = new Date(listing.activeUntil).getTime();
  if (isNaN(expiresAt) || Date.now() >= expiresAt) {
    return { visible: false, reason: "EXPIRED" };
  }

  return { visible: true };
}

export interface AdminUserItem {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  role: string;
  status: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  listingsCount: number;
  offersCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AdminListingItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  categoryName: string;
  categoryKey: string;
  ownerDisplayName: string;
  ownerHandle: string;
  ownerUserId: string;
  budgetMode: string;
  budgetFormatted: string;
  activationSeq: number;
  activeUntil: Date | string | null;
  createdAt: Date | string;
}

export interface AdminOfferItem {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  senderUserId: string;
  senderDisplayName: string;
  senderHandle: string;
  recipientUserId: string;
  recipientDisplayName: string;
  recipientHandle: string;
  status: string;
  rejectionReasonCode: string | null;
  budgetFormatted: string;
  estimatedDuration: string;
  createdAt: Date | string;
  resolvedAt: Date | string | null;
}

export interface AdminLogItem {
  id: string;
  category: "auth" | "business" | "audit" | "system";
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  action: string;
  actorId?: string;
  actorEmail?: string;
  targetId?: string;
  safeSummary: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
}

export interface AdminAbuseItem {
  id: string;
  reporterUserId?: string;
  reporterDisplayName?: string;
  offenderUserId?: string;
  offenderDisplayName?: string;
  targetType: "listing" | "profile" | "offer" | "message";
  targetId: string;
  reasonCode: string;
  details: string;
  flaggedTerms?: string[];
  status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  createdAt: Date | string;
}

export interface AdminThreatItem {
  id: string;
  threatType:
    | "BRUTE_FORCE"
    | "RATE_LIMIT_DDOS"
    | "INJECTION_PROBE"
    | "UNAUTHORIZED_PATH"
    | "TOKEN_FORGERY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sourceIp: string;
  targetEndpoint: string;
  attemptCount: number;
  status: "DETECTED" | "BLOCKED" | "MITIGATED" | "INVESTIGATING";
  riskScore: number;
  lastSeenAt: Date | string;
}

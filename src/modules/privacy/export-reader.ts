import { streamRecordWithJsonPayload } from "./export-json-stream";
import type pg from "pg";
import {
  acquireClientWithDeadline,
  cancelBackendPid,
  getDbPool,
  schema,
  terminateClientSafely,
} from "@/src/lib/db";
import { resolveUserEmail } from "@/src/modules/auth/email-identity";
import { decryptEnvelopeV2 } from "@/src/lib/crypto/envelope";
import { and, asc, desc, eq, getTableColumns, inArray, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { ExportError } from "./export-errors";

export interface ExportDataSnapshot {
  exportVersion: 2;
  extractedAt: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    role: string;
    status: string;
    twoFactorEnabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  profile: Record<string, unknown> | null;
  links: Array<Record<string, unknown>>;
  privateIdentity: Record<string, unknown> | null;
  listings: Array<Record<string, unknown>>;
  listingRevisions: Array<Record<string, unknown>>;
  offers: Array<Record<string, unknown>>;
  offerRevisions: Array<Record<string, unknown>>;
  engagements: Array<Record<string, unknown>>;
  endorsements: {
    authored: Array<Record<string, unknown>>;
    received: Array<Record<string, unknown>>;
  };
  categoryFollows: Array<Record<string, unknown>>;
  offerTemplates: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
  legalAcceptances: Array<Record<string, unknown>>;
  securityLog: Array<Record<string, unknown>>;
}

export const PAGE_SIZE = 500;
export const REVISION_PAGE_SIZE = 50;
export const MAX_RECORD_BYTES = 10 * 1024 * 1024; // 10 MiB limit per single record
export const METADATA_PADDING_BYTES = 4096; // 4 KiB overhead padding for surrounding JSON keys and encoding

export function serializeExportRecord<T>(record: T): string {
  const json = JSON.stringify(record);
  if (Buffer.byteLength(json) > MAX_RECORD_BYTES) {
    throw new ExportError(
      "EXPORT_RECORD_TOO_LARGE",
      `Single export record exceeded maximum supported limit of 10 MiB (${Buffer.byteLength(json)} bytes)`,
      413,
      false
    );
  }
  return json;
}

export interface StreamExportOptions {
  signal?: AbortSignal;
  onSection?: (sectionName: string) => Promise<void> | void;
  onProgress?: (info: { section: string; page: number; rowCount: number }) => Promise<void> | void;
  acquisitionTimeoutMs?: number;
  deadlineAt?: number;
  remainingDeadlineMs?: number;
  pool?: pg.Pool;
}

type LinkRow = {
  id: string;
  type: string;
  label: string;
  url: string;
  sortOrder: number;
};

type EngagementRow = typeof schema.engagements.$inferSelect & {
  matchedAtText: string;
};

type EndorsementRow = typeof schema.endorsements.$inferSelect & {
  createdAtText: string;
};

type CategoryFollowRow = {
  categoryId: string;
  createdAt: Date;
  createdAtText: string;
};

type OfferTemplateRow = typeof schema.offerTemplates.$inferSelect & {
  createdAtText: string;
};

type LegalAcceptanceRow = {
  documentKey: string;
  documentVersion: string;
  contentHash: string;
  acceptedAt: Date;
  acceptedAtText: string;
};

type SecurityEventRow = {
  id: string;
  eventType: string;
  ipAddress: string | null;
  createdAt: Date;
  createdAtText: string;
};

/**
 * Incremental, bounded-memory streaming generator for user personal data export.
 * Operates under REPEATABLE READ READ ONLY transaction isolation with statement timeout
 * and true PostgreSQL query cancellation (pg_cancel_backend) when aborted.
 * Uses index-backed keyset pagination with lossless microsecond timestamp cursors.
 */
export async function* streamUserDataExport(
  userId: string,
  options?: StreamExportOptions
): AsyncGenerator<string, { snapshotStartedAt: Date }, unknown> {
  const signal = options?.signal;
  if (signal?.aborted) {
    throw signal.reason || new ExportError("EXPORT_ABORTED", "Export attempt aborted", 400, false);
  }

  const getRemainingMs = (): number => {
    if (options?.deadlineAt) {
      return Math.max(0, options.deadlineAt - Date.now());
    }
    return options?.remainingDeadlineMs ?? 30000;
  };

  const pool = options?.pool || getDbPool();
  const remainingAtStart = getRemainingMs();
  if (remainingAtStart <= 0) {
    throw new ExportError(
      "EXPORT_TIMEOUT",
      "Total job deadline exceeded before reader start",
      504,
      false
    );
  }

  const acquisitionTimeout = Math.min(options?.acquisitionTimeoutMs ?? 10000, remainingAtStart);
  const client = await acquireClientWithDeadline(pool, acquisitionTimeout, signal);
  const pid = (client as unknown as { processID?: number }).processID;

  let inTransaction = false;
  let transactionFinished = false;
  let clientDiscarded = false;
  let forceCloseTimer: NodeJS.Timeout | null = null;
  let pendingCancelPromise: Promise<boolean> | null = null;

  const performAbortCleanup = () => {
    if (clientDiscarded) return;
    clientDiscarded = true;
    if (forceCloseTimer) {
      clearTimeout(forceCloseTimer);
      forceCloseTimer = null;
    }
    terminateClientSafely(client);
  };

  const abortHandler = () => {
    if (pid && !pendingCancelPromise) {
      // 1. Launch independent cancellation targeting the exact pool/client server
      pendingCancelPromise = cancelBackendPid(pid, { pool, client })
        .then((ok) => {
          if (!ok) {
            // Cancel was rejected or failed -> forcefully destroy local socket immediately
            performAbortCleanup();
          }
          return ok;
        })
        .catch(() => {
          performAbortCleanup();
          return false;
        });

      // 2. Abort-initiated forced local socket termination timer (max 1500ms)
      forceCloseTimer = setTimeout(() => {
        performAbortCleanup();
      }, 1500);
    } else {
      performAbortCleanup();
    }
  };

  if (signal) {
    signal.addEventListener("abort", abortHandler, { once: true });
  }

  const txDb = drizzle(client, { schema });
  const snapshotStartedAt = new Date();

  try {
    const remainingAfterAcquire = getRemainingMs();
    if (remainingAfterAcquire < 1) {
      performAbortCleanup();
      throw new ExportError(
        "EXPORT_TIMEOUT",
        "Total job deadline exceeded after reader connection acquisition",
        504,
        false
      );
    }

    const stmtTimeoutMs = Math.min(30000, Math.max(1, remainingAfterAcquire));
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;");
    inTransaction = true;
    await client.query(`SET LOCAL statement_timeout = '${stmtTimeoutMs}';`);

    if (signal?.aborted) {
      throw (
        signal.reason || new ExportError("EXPORT_ABORTED", "Export attempt aborted", 400, false)
      );
    }

    // 1. User core
    const [userRow] = await txDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    if (!userRow) {
      throw new ExportError("USER_NOT_FOUND", `User '${userId}' does not exist.`, 404, false);
    }

    let email: string;
    try {
      email = resolveUserEmail(userRow);
    } catch (err) {
      throw new ExportError(
        "EXPORT_EMAIL_DECRYPTION_FAILED",
        `Failed to decrypt user email: ${err}`,
        500,
        false
      );
    }

    const userObj = {
      id: userRow.id,
      email,
      emailVerified: Boolean(userRow.emailVerified),
      role: userRow.role,
      status: userRow.status,
      twoFactorEnabled: userRow.twoFactorEnabled,
      createdAt: userRow.createdAt.toISOString(),
      updatedAt: userRow.updatedAt.toISOString(),
    };

    yield `{\n  "exportVersion": 2,\n  "extractedAt": ${JSON.stringify(snapshotStartedAt.toISOString())},\n  "user": ${JSON.stringify(userObj, null, 2)},\n`;

    if (options?.onSection) await options.onSection("user");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 2. Profile
    const [profileRow] = await txDb
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .limit(1);

    const profileObj = profileRow
      ? {
          displayName: profileRow.displayName,
          handle: profileRow.handle,
          about: profileRow.about,
          avatarUrl: profileRow.avatarUrl,
          showLocation: profileRow.showLocation,
          revealPhoneAfterMatch: profileRow.revealPhoneAfterMatch,
          locale: profileRow.locale,
          createdAt: profileRow.createdAt.toISOString(),
          updatedAt: profileRow.updatedAt.toISOString(),
        }
      : null;

    yield `  "profile": ${profileObj ? JSON.stringify(profileObj, null, 2) : "null"},\n`;

    if (options?.onSection) await options.onSection("profile");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 3. Profile Links (Keyset pagination)
    yield `  "links": [\n`;
    let lastLinkSortOrder: number | null = null;
    let lastLinkId: string | null = null;
    let firstLink = true;
    let linkPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastLinkSortOrder !== null && lastLinkId !== null
          ? and(
              eq(schema.profileLinks.userId, userId),
              sql`(${schema.profileLinks.sortOrder}, ${schema.profileLinks.id}) > (${lastLinkSortOrder}::integer, ${lastLinkId}::uuid)`
            )
          : eq(schema.profileLinks.userId, userId);

      const linkPage: LinkRow[] = await txDb
        .select({
          id: schema.profileLinks.id,
          type: schema.profileLinks.type,
          label: schema.profileLinks.label,
          url: schema.profileLinks.url,
          sortOrder: schema.profileLinks.sortOrder,
        })
        .from(schema.profileLinks)
        .where(whereClause)
        .orderBy(asc(schema.profileLinks.sortOrder), asc(schema.profileLinks.id))
        .limit(PAGE_SIZE);

      if (linkPage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "links",
          page: ++linkPageCount,
          rowCount: linkPage.length,
        });
      }

      for (const l of linkPage) {
        const itemStr = serializeExportRecord({
          id: l.id,
          type: l.type,
          label: l.label,
          url: l.url,
          sortOrder: l.sortOrder,
        });
        yield `${firstLink ? "    " : ",\n    "}${itemStr}`;
        firstLink = false;
      }

      const last = linkPage[linkPage.length - 1]!;
      lastLinkSortOrder = last.sortOrder;
      lastLinkId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("links");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 4. Private Identity
    let privateIdentityObj: Record<string, unknown> | null = null;
    const [idRow] = await txDb
      .select()
      .from(schema.userPrivateIdentity)
      .where(eq(schema.userPrivateIdentity.userId, userId))
      .limit(1);

    if (idRow) {
      const decryptField = (encVal: string | null, col: string) => {
        if (!encVal) return null;
        try {
          return decryptEnvelopeV2(encVal, {
            table: "user_private_identity",
            primaryKey: userId,
            column: col,
          });
        } catch (err) {
          throw new ExportError(
            "EXPORT_IDENTITY_DECRYPTION_FAILED",
            `Failed to decrypt private identity column '${col}' for user '${userId}': ${err}`,
            500,
            false
          );
        }
      };

      privateIdentityObj = {
        legalFirstName: decryptField(idRow.legalFirstNameEnc, "legal_first_name_enc"),
        legalLastName: decryptField(idRow.legalLastNameEnc, "legal_last_name_enc"),
        phoneE164: decryptField(idRow.phoneE164Enc, "phone_e164_enc"),
        dateOfBirth: decryptField(idRow.dateOfBirthEnc, "date_of_birth_enc"),
        phoneVerifiedAt: idRow.phoneVerifiedAt ? idRow.phoneVerifiedAt.toISOString() : null,
        city: idRow.city,
        countryCode: idRow.countryCode,
        createdAt: idRow.createdAt.toISOString(),
        updatedAt: idRow.updatedAt.toISOString(),
      };
    }

    yield `  "privateIdentity": ${privateIdentityObj ? serializeExportRecord(privateIdentityObj) : "null"},\n`;

    if (options?.onSection) await options.onSection("privateIdentity");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 5. Listings (Keyset pagination, streaming 1 page at a time)
    yield `  "listings": [\n`;
    let lastListingCreatedAtText: string | null = null;
    let lastListingId: string | null = null;
    let firstListing = true;
    let listingPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastListingCreatedAtText !== null && lastListingId !== null
          ? and(
              eq(schema.listings.ownerUserId, userId),
              sql`(${schema.listings.createdAt}, ${schema.listings.id}) < (${lastListingCreatedAtText}::timestamptz, ${lastListingId}::uuid)`
            )
          : eq(schema.listings.ownerUserId, userId);

      const metaRows = await txDb
        .select({
          id: schema.listings.id,
          title: schema.listings.title,
          slug: schema.listings.slug,
          status: schema.listings.status,
          summary: schema.listings.summary,
          budgetMode: schema.listings.budgetMode,
          budgetMin: schema.listings.budgetMin,
          budgetMax: schema.listings.budgetMax,
          budgetCurrency: schema.listings.budgetCurrency,
          createdAt: schema.listings.createdAt,
          createdAtText: sql<string>`${schema.listings.createdAt}::text`,
          updatedAt: schema.listings.updatedAt,
          byteLen: sql<number>`octet_length(${schema.listings.scope}) + coalesce(octet_length(${schema.listings.answersJson}::text), 0)`,
        })
        .from(schema.listings)
        .where(whereClause)
        .orderBy(desc(schema.listings.createdAt), desc(schema.listings.id))
        .limit(PAGE_SIZE);

      if (metaRows.length === 0) break;

      // Validate single record size BEFORE fetching any heavy payload into memory
      for (const r of metaRows) {
        if ((Number(r.byteLen) || 0) + METADATA_PADDING_BYTES > MAX_RECORD_BYTES) {
          throw new ExportError(
            "EXPORT_RECORD_TOO_LARGE",
            `Single listing '${r.id}' exceeded maximum supported limit of 10 MiB (${r.byteLen} bytes payload)`,
            413,
            false
          );
        }
      }

      if (options?.onProgress) {
        await options.onProgress({
          section: "listings",
          page: ++listingPageCount,
          rowCount: metaRows.length,
        });
      }

      // Group into batches of at most 16 MiB payload to bound resident memory
      const MAX_PAYLOAD_GROUP_BYTES = 16 * 1024 * 1024;
      const groups: (typeof metaRows)[] = [];
      let currentGroup: typeof metaRows = [];
      let currentGroupBytes = 0;

      for (const row of metaRows) {
        const rowLen = Number(row.byteLen || 0);
        if (currentGroup.length > 0 && currentGroupBytes + rowLen > MAX_PAYLOAD_GROUP_BYTES) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupBytes = 0;
        }
        currentGroup.push(row);
        currentGroupBytes += rowLen;
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      for (const group of groups) {
        if (signal?.aborted)
          throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
        if (getRemainingMs() <= 0)
          throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded", 504, false);

        const groupIds = group.map((g) => g.id);
        const payloadRows = await txDb
          .select({
            id: schema.listings.id,
            scope: schema.listings.scope,
          })
          .from(schema.listings)
          .where(inArray(schema.listings.id, groupIds));

        const payloadMap = new Map(payloadRows.map((p) => [p.id, p.scope]));

        for (const r of group) {
          const scope = payloadMap.get(r.id) ?? "";
          const itemStr = serializeExportRecord({
            id: r.id,
            title: r.title,
            slug: r.slug,
            status: r.status,
            summary: r.summary,
            scope,
            budgetMode: r.budgetMode,
            budgetMin: r.budgetMin,
            budgetMax: r.budgetMax,
            budgetCurrency: r.budgetCurrency,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          });
          yield `${firstListing ? "    " : ",\n    "}${itemStr}`;
          firstListing = false;
        }
      }

      const last = metaRows[metaRows.length - 1]!;
      lastListingCreatedAtText = last.createdAtText;
      lastListingId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("listings");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 6. Listing Revisions (Direct JOIN keyset pagination with pre-fetch size inspection and 16 MiB payload grouping)
    yield `  "listingRevisions": [\n`;
    let lastLRevCreatedAtText: string | null = null;
    let lastLRevId: string | null = null;
    let firstLRev = true;
    let lRevPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
      if (getRemainingMs() <= 0)
        throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded", 504, false);

      const whereClause: SQL | undefined =
        lastLRevCreatedAtText !== null && lastLRevId !== null
          ? and(
              eq(schema.listings.ownerUserId, userId),
              sql`(${schema.listingRevisions.createdAt}, ${schema.listingRevisions.id}) < (${lastLRevCreatedAtText}::timestamptz, ${lastLRevId}::uuid)`
            )
          : eq(schema.listings.ownerUserId, userId);

      // Pre-fetch metadata, keyset, and payload byte length WITHOUT fetching large snapshot JSON
      const metaRows = await txDb
        .select({
          id: schema.listingRevisions.id,
          listingId: schema.listingRevisions.listingId,
          editorUserId: schema.listingRevisions.editorUserId,
          revisionNo: schema.listingRevisions.revisionNo,
          createdAt: schema.listingRevisions.createdAt,
          createdAtText: sql<string>`${schema.listingRevisions.createdAt}::text`,
          byteLen: sql<number>`octet_length(${schema.listingRevisions.snapshotJson}::text)`,
        })
        .from(schema.listingRevisions)
        .innerJoin(schema.listings, eq(schema.listingRevisions.listingId, schema.listings.id))
        .where(whereClause)
        .orderBy(desc(schema.listingRevisions.createdAt), desc(schema.listingRevisions.id))
        .limit(REVISION_PAGE_SIZE);

      if (metaRows.length === 0) break;

      // Validate single record size BEFORE fetching any payload into memory (including metadata padding)
      for (const r of metaRows) {
        if ((Number(r.byteLen) || 0) + METADATA_PADDING_BYTES > MAX_RECORD_BYTES) {
          throw new ExportError(
            "EXPORT_RECORD_TOO_LARGE",
            `Single listing revision '${r.id}' exceeded maximum supported limit of 10 MiB (${r.byteLen} bytes payload)`,
            413,
            false
          );
        }
      }

      if (options?.onProgress) {
        await options.onProgress({
          section: "listingRevisions",
          page: ++lRevPageCount,
          rowCount: metaRows.length,
        });
      }

      // Group into batches of at most 16 MiB payload to bound resident memory
      const MAX_PAYLOAD_GROUP_BYTES = 16 * 1024 * 1024;
      const groups: (typeof metaRows)[] = [];
      let currentGroup: typeof metaRows = [];
      let currentGroupBytes = 0;

      for (const row of metaRows) {
        const rowLen = Number(row.byteLen || 0);
        if (currentGroup.length > 0 && currentGroupBytes + rowLen > MAX_PAYLOAD_GROUP_BYTES) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupBytes = 0;
        }
        currentGroup.push(row);
        currentGroupBytes += rowLen;
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      for (const group of groups) {
        if (signal?.aborted)
          throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
        if (getRemainingMs() <= 0)
          throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded", 504, false);

        const groupIds = group.map((g) => g.id);
        const payloadRows = await txDb
          .select({
            id: schema.listingRevisions.id,
            snapshotJson: sql<string>`${schema.listingRevisions.snapshotJson}::text`,
          })
          .from(schema.listingRevisions)
          .where(inArray(schema.listingRevisions.id, groupIds));

        const payloadMap = new Map(payloadRows.map((p) => [p.id, p.snapshotJson]));

        for (const r of group) {
          const snapshotJson = payloadMap.get(r.id);
          if (snapshotJson === undefined) throw new Error("Export snapshot row missing");
          yield firstLRev ? "    " : ",\n    ";
          yield* streamRecordWithJsonPayload(
            {
              id: r.id,
              listingId: r.listingId,
              editorUserId: r.editorUserId,
              revisionNo: r.revisionNo,
              createdAt: r.createdAt.toISOString(),
            },
            "snapshotJson",
            snapshotJson,
            MAX_RECORD_BYTES
          );
          payloadMap.delete(r.id);
          firstLRev = false;
        }
      }

      const last = metaRows[metaRows.length - 1]!;
      lastLRevCreatedAtText = last.createdAtText;
      lastLRevId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("listingRevisions");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 7. Offers (Sent by user only)
    yield `  "offers": [\n`;
    let lastOfferCreatedAtText: string | null = null;
    let lastOfferId: string | null = null;
    let firstOffer = true;
    let offerPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastOfferCreatedAtText !== null && lastOfferId !== null
          ? and(
              eq(schema.offers.offerorUserId, userId),
              sql`(${schema.offers.createdAt}, ${schema.offers.id}) < (${lastOfferCreatedAtText}::timestamptz, ${lastOfferId}::uuid)`
            )
          : eq(schema.offers.offerorUserId, userId);

      const metaRows = await txDb
        .select({
          id: schema.offers.id,
          listingId: schema.offers.listingId,
          listingActivationSeq: schema.offers.listingActivationSeq,
          status: schema.offers.status,
          budgetCurrency: schema.offers.budgetCurrency,
          budgetMin: schema.offers.budgetMin,
          budgetMax: schema.offers.budgetMax,
          estimatedDurationValue: schema.offers.estimatedDurationValue,
          estimatedDurationUnit: schema.offers.estimatedDurationUnit,
          rejectionCode: schema.offers.rejectionCode,
          createdAt: schema.offers.createdAt,
          createdAtText: sql<string>`${schema.offers.createdAt}::text`,
          updatedAt: schema.offers.updatedAt,
          resolvedAt: schema.offers.resolvedAt,
          byteLen: sql<number>`octet_length(${schema.offers.message}) + coalesce(octet_length(${schema.offers.rejectionNote}), 0)`,
        })
        .from(schema.offers)
        .where(whereClause)
        .orderBy(desc(schema.offers.createdAt), desc(schema.offers.id))
        .limit(PAGE_SIZE);

      if (metaRows.length === 0) break;

      for (const r of metaRows) {
        if ((Number(r.byteLen) || 0) + METADATA_PADDING_BYTES > MAX_RECORD_BYTES) {
          throw new ExportError(
            "EXPORT_RECORD_TOO_LARGE",
            `Single offer '${r.id}' exceeded maximum supported limit of 10 MiB (${r.byteLen} bytes payload)`,
            413,
            false
          );
        }
      }

      if (options?.onProgress) {
        await options.onProgress({
          section: "offers",
          page: ++offerPageCount,
          rowCount: metaRows.length,
        });
      }

      const MAX_PAYLOAD_GROUP_BYTES = 16 * 1024 * 1024;
      const groups: (typeof metaRows)[] = [];
      let currentGroup: typeof metaRows = [];
      let currentGroupBytes = 0;

      for (const row of metaRows) {
        const rowLen = Number(row.byteLen || 0);
        if (currentGroup.length > 0 && currentGroupBytes + rowLen > MAX_PAYLOAD_GROUP_BYTES) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupBytes = 0;
        }
        currentGroup.push(row);
        currentGroupBytes += rowLen;
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      for (const group of groups) {
        if (signal?.aborted)
          throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
        if (getRemainingMs() <= 0)
          throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded", 504, false);

        const groupIds = group.map((g) => g.id);
        const payloadRows = await txDb
          .select({
            id: schema.offers.id,
            message: schema.offers.message,
            rejectionNote: schema.offers.rejectionNote,
          })
          .from(schema.offers)
          .where(inArray(schema.offers.id, groupIds));

        const payloadMap = new Map(
          payloadRows.map((p) => [p.id, { message: p.message, rejectionNote: p.rejectionNote }])
        );

        for (const r of group) {
          const payload = payloadMap.get(r.id);
          const itemStr = serializeExportRecord({
            id: r.id,
            listingId: r.listingId,
            listingActivationSeq: r.listingActivationSeq,
            status: r.status,
            message: payload?.message ?? "",
            budgetCurrency: r.budgetCurrency,
            budgetMin: r.budgetMin,
            budgetMax: r.budgetMax,
            estimatedDurationValue: r.estimatedDurationValue,
            estimatedDurationUnit: r.estimatedDurationUnit,
            rejectionCode: r.rejectionCode,
            rejectionNote: payload?.rejectionNote ?? null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
          });
          yield `${firstOffer ? "    " : ",\n    "}${itemStr}`;
          firstOffer = false;
        }
      }

      const last = metaRows[metaRows.length - 1]!;
      lastOfferCreatedAtText = last.createdAtText;
      lastOfferId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("offers");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 8. Offer Revisions (Direct JOIN keyset pagination with pre-fetch size inspection and 16 MiB payload grouping)
    yield `  "offerRevisions": [\n`;
    let lastORevCreatedAtText: string | null = null;
    let lastORevId: string | null = null;
    let firstORev = true;
    let oRevPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
      if (getRemainingMs() <= 0)
        throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded", 504, false);

      const whereClause: SQL | undefined =
        lastORevCreatedAtText !== null && lastORevId !== null
          ? and(
              eq(schema.offers.offerorUserId, userId),
              sql`(${schema.offerRevisions.createdAt}, ${schema.offerRevisions.id}) < (${lastORevCreatedAtText}::timestamptz, ${lastORevId}::uuid)`
            )
          : eq(schema.offers.offerorUserId, userId);

      const metaRows = await txDb
        .select({
          id: schema.offerRevisions.id,
          offerId: schema.offerRevisions.offerId,
          revisionNo: schema.offerRevisions.revisionNo,
          createdAt: schema.offerRevisions.createdAt,
          createdAtText: sql<string>`${schema.offerRevisions.createdAt}::text`,
          byteLen: sql<number>`octet_length(${schema.offerRevisions.snapshotJson}::text)`,
        })
        .from(schema.offerRevisions)
        .innerJoin(schema.offers, eq(schema.offerRevisions.offerId, schema.offers.id))
        .where(whereClause)
        .orderBy(desc(schema.offerRevisions.createdAt), desc(schema.offerRevisions.id))
        .limit(REVISION_PAGE_SIZE);

      if (metaRows.length === 0) break;

      for (const r of metaRows) {
        if ((Number(r.byteLen) || 0) + METADATA_PADDING_BYTES > MAX_RECORD_BYTES) {
          throw new ExportError(
            "EXPORT_RECORD_TOO_LARGE",
            `Single offer revision '${r.id}' exceeded maximum supported limit of 10 MiB (${r.byteLen} bytes payload)`,
            413,
            false
          );
        }
      }

      if (options?.onProgress) {
        await options.onProgress({
          section: "offerRevisions",
          page: ++oRevPageCount,
          rowCount: metaRows.length,
        });
      }

      const MAX_PAYLOAD_GROUP_BYTES = 16 * 1024 * 1024;
      const groups: (typeof metaRows)[] = [];
      let currentGroup: typeof metaRows = [];
      let currentGroupBytes = 0;

      for (const row of metaRows) {
        const rowLen = Number(row.byteLen || 0);
        if (currentGroup.length > 0 && currentGroupBytes + rowLen > MAX_PAYLOAD_GROUP_BYTES) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupBytes = 0;
        }
        currentGroup.push(row);
        currentGroupBytes += rowLen;
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      for (const group of groups) {
        if (signal?.aborted)
          throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
        if (getRemainingMs() <= 0)
          throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded", 504, false);

        const groupIds = group.map((g) => g.id);
        const payloadRows = await txDb
          .select({
            id: schema.offerRevisions.id,
            snapshotJson: sql<string>`${schema.offerRevisions.snapshotJson}::text`,
          })
          .from(schema.offerRevisions)
          .where(inArray(schema.offerRevisions.id, groupIds));

        const payloadMap = new Map(payloadRows.map((p) => [p.id, p.snapshotJson]));

        for (const r of group) {
          const snapshotJson = payloadMap.get(r.id);
          if (snapshotJson === undefined) throw new Error("Export snapshot row missing");
          yield firstORev ? "    " : ",\n    ";
          yield* streamRecordWithJsonPayload(
            {
              id: r.id,
              offerId: r.offerId,
              revisionNo: r.revisionNo,
              createdAt: r.createdAt.toISOString(),
            },
            "snapshotJson",
            snapshotJson,
            MAX_RECORD_BYTES
          );
          payloadMap.delete(r.id);
          firstORev = false;
        }
      }

      const last = metaRows[metaRows.length - 1]!;
      lastORevCreatedAtText = last.createdAtText;
      lastORevId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("offerRevisions");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 9. Engagements (where user is owner or freelancer)
    yield `  "engagements": [\n`;
    let lastEngageMatchedAtText: string | null = null;
    let lastEngageId: string | null = null;
    let firstEngage = true;
    let engagePageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const baseCond = or(
        eq(schema.engagements.ownerUserId, userId),
        eq(schema.engagements.freelancerUserId, userId)
      );
      const whereClause: SQL | undefined =
        lastEngageMatchedAtText !== null && lastEngageId !== null
          ? and(
              baseCond,
              sql`(${schema.engagements.matchedAt}, ${schema.engagements.id}) < (${lastEngageMatchedAtText}::timestamptz, ${lastEngageId}::uuid)`
            )
          : baseCond;

      const engagePage: EngagementRow[] = await txDb
        .select({
          ...getTableColumns(schema.engagements),
          matchedAtText: sql<string>`${schema.engagements.matchedAt}::text`,
        })
        .from(schema.engagements)
        .where(whereClause)
        .orderBy(desc(schema.engagements.matchedAt), desc(schema.engagements.id))
        .limit(PAGE_SIZE);

      if (engagePage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "engagements",
          page: ++engagePageCount,
          rowCount: engagePage.length,
        });
      }

      for (const e of engagePage) {
        const itemStr = serializeExportRecord({
          id: e.id,
          listingId: e.listingId,
          acceptedOfferId: e.acceptedOfferId,
          ownerUserId: e.ownerUserId,
          freelancerUserId: e.freelancerUserId,
          status: e.status,
          matchedAt: e.matchedAt.toISOString(),
          completedAt: e.completedAt ? e.completedAt.toISOString() : null,
          cancelledAt: e.cancelledAt ? e.cancelledAt.toISOString() : null,
          listingTitleSnapshot: e.listingTitleSnapshot,
          listingCategorySnapshot: e.listingCategorySnapshot,
        });
        yield `${firstEngage ? "    " : ",\n    "}${itemStr}`;
        firstEngage = false;
      }

      const last = engagePage[engagePage.length - 1]!;
      lastEngageMatchedAtText = last.matchedAtText;
      lastEngageId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("engagements");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 10. Endorsements (Authored & Received)
    yield `  "endorsements": {\n    "authored": [\n`;
    let lastAuthoredCreatedAtText: string | null = null;
    let lastAuthoredId: string | null = null;
    let firstAuthored = true;
    let authEndPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastAuthoredCreatedAtText !== null && lastAuthoredId !== null
          ? and(
              eq(schema.endorsements.authorUserId, userId),
              sql`(${schema.endorsements.createdAt}, ${schema.endorsements.id}) < (${lastAuthoredCreatedAtText}::timestamptz, ${lastAuthoredId}::uuid)`
            )
          : eq(schema.endorsements.authorUserId, userId);

      const authoredPage: EndorsementRow[] = await txDb
        .select({
          ...getTableColumns(schema.endorsements),
          createdAtText: sql<string>`${schema.endorsements.createdAt}::text`,
        })
        .from(schema.endorsements)
        .where(whereClause)
        .orderBy(desc(schema.endorsements.createdAt), desc(schema.endorsements.id))
        .limit(PAGE_SIZE);

      if (authoredPage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "endorsements.authored",
          page: ++authEndPageCount,
          rowCount: authoredPage.length,
        });
      }

      for (const e of authoredPage) {
        const itemStr = serializeExportRecord({
          id: e.id,
          engagementId: e.engagementId,
          recipientUserId: e.recipientUserId,
          content: e.content,
          projectTitleSnapshot: e.projectTitleSnapshot,
          createdAt: e.createdAt.toISOString(),
        });
        yield `${firstAuthored ? "      " : ",\n      "}${itemStr}`;
        firstAuthored = false;
      }

      const last = authoredPage[authoredPage.length - 1]!;
      lastAuthoredCreatedAtText = last.createdAtText;
      lastAuthoredId = last.id;
    }

    yield `\n    ],\n    "received": [\n`;
    let lastReceivedCreatedAtText: string | null = null;
    let lastReceivedId: string | null = null;
    let firstReceived = true;
    let recEndPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastReceivedCreatedAtText !== null && lastReceivedId !== null
          ? and(
              eq(schema.endorsements.recipientUserId, userId),
              sql`(${schema.endorsements.createdAt}, ${schema.endorsements.id}) < (${lastReceivedCreatedAtText}::timestamptz, ${lastReceivedId}::uuid)`
            )
          : eq(schema.endorsements.recipientUserId, userId);

      const receivedPage: EndorsementRow[] = await txDb
        .select({
          ...getTableColumns(schema.endorsements),
          createdAtText: sql<string>`${schema.endorsements.createdAt}::text`,
        })
        .from(schema.endorsements)
        .where(whereClause)
        .orderBy(desc(schema.endorsements.createdAt), desc(schema.endorsements.id))
        .limit(PAGE_SIZE);

      if (receivedPage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "endorsements.received",
          page: ++recEndPageCount,
          rowCount: receivedPage.length,
        });
      }

      for (const e of receivedPage) {
        const itemStr = serializeExportRecord({
          id: e.id,
          engagementId: e.engagementId,
          authorUserId: e.authorUserId,
          content: e.content,
          projectTitleSnapshot: e.projectTitleSnapshot,
          createdAt: e.createdAt.toISOString(),
        });
        yield `${firstReceived ? "      " : ",\n      "}${itemStr}`;
        firstReceived = false;
      }

      const last = receivedPage[receivedPage.length - 1]!;
      lastReceivedCreatedAtText = last.createdAtText;
      lastReceivedId = last.id;
    }
    yield `\n    ]\n  },\n`;

    if (options?.onSection) await options.onSection("endorsements");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 11. Category Follows
    yield `  "categoryFollows": [\n`;
    let lastCategoryCreatedAtText: string | null = null;
    let lastCategoryId: string | null = null;
    let firstCategory = true;
    let catPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastCategoryCreatedAtText !== null && lastCategoryId !== null
          ? and(
              eq(schema.categoryFollows.userId, userId),
              sql`(${schema.categoryFollows.createdAt}, ${schema.categoryFollows.categoryId}) < (${lastCategoryCreatedAtText}::timestamptz, ${lastCategoryId})`
            )
          : eq(schema.categoryFollows.userId, userId);

      const categoryPage: CategoryFollowRow[] = await txDb
        .select({
          categoryId: schema.categoryFollows.categoryId,
          createdAt: schema.categoryFollows.createdAt,
          createdAtText: sql<string>`${schema.categoryFollows.createdAt}::text`,
        })
        .from(schema.categoryFollows)
        .where(whereClause)
        .orderBy(desc(schema.categoryFollows.createdAt), desc(schema.categoryFollows.categoryId))
        .limit(PAGE_SIZE);

      if (categoryPage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "categoryFollows",
          page: ++catPageCount,
          rowCount: categoryPage.length,
        });
      }

      for (const cf of categoryPage) {
        const itemStr = serializeExportRecord({
          categoryId: cf.categoryId,
          createdAt: cf.createdAt.toISOString(),
        });
        yield `${firstCategory ? "    " : ",\n    "}${itemStr}`;
        firstCategory = false;
      }

      const last = categoryPage[categoryPage.length - 1]!;
      lastCategoryCreatedAtText = last.createdAtText;
      lastCategoryId = last.categoryId;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("categoryFollows");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 12. Offer Templates
    yield `  "offerTemplates": [\n`;
    let lastTemplateCreatedAtText: string | null = null;
    let lastTemplateId: string | null = null;
    let firstTemplate = true;
    let tmplPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastTemplateCreatedAtText !== null && lastTemplateId !== null
          ? and(
              eq(schema.offerTemplates.userId, userId),
              sql`(${schema.offerTemplates.createdAt}, ${schema.offerTemplates.id}) < (${lastTemplateCreatedAtText}::timestamptz, ${lastTemplateId}::uuid)`
            )
          : eq(schema.offerTemplates.userId, userId);

      const templatePage: OfferTemplateRow[] = await txDb
        .select({
          ...getTableColumns(schema.offerTemplates),
          createdAtText: sql<string>`${schema.offerTemplates.createdAt}::text`,
        })
        .from(schema.offerTemplates)
        .where(whereClause)
        .orderBy(desc(schema.offerTemplates.createdAt), desc(schema.offerTemplates.id))
        .limit(PAGE_SIZE);

      if (templatePage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "offerTemplates",
          page: ++tmplPageCount,
          rowCount: templatePage.length,
        });
      }

      for (const t of templatePage) {
        const itemStr = serializeExportRecord({
          id: t.id,
          userId: t.userId,
          name: t.name,
          message: t.message,
          budgetCurrency: t.budgetCurrency,
          budgetMin: t.budgetMin,
          budgetMax: t.budgetMax,
          estimatedDurationValue: t.estimatedDurationValue,
          estimatedDurationUnit: t.estimatedDurationUnit,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        });
        yield `${firstTemplate ? "    " : ",\n    "}${itemStr}`;
        firstTemplate = false;
      }

      const last = templatePage[templatePage.length - 1]!;
      lastTemplateCreatedAtText = last.createdAtText;
      lastTemplateId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("offerTemplates");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 13. Notifications (Two-phase pre-check and <= 16 MiB payload batching)
    yield `  "notifications": [\n`;
    let lastNotifCreatedAtText: string | null = null;
    let lastNotifId: string | null = null;
    let firstNotif = true;
    let notifPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastNotifCreatedAtText !== null && lastNotifId !== null
          ? and(
              eq(schema.notifications.userId, userId),
              sql`(${schema.notifications.createdAt}, ${schema.notifications.id}) < (${lastNotifCreatedAtText}::timestamptz, ${lastNotifId}::uuid)`
            )
          : eq(schema.notifications.userId, userId);

      // Phase 1: Pre-fetch metadata, keyset, and payload byte length WITHOUT fetching large JSON
      const metaRows = await txDb
        .select({
          id: schema.notifications.id,
          type: schema.notifications.type,
          readAt: schema.notifications.readAt,
          createdAt: schema.notifications.createdAt,
          createdAtText: sql<string>`${schema.notifications.createdAt}::text`,
          byteLen: sql<number>`octet_length(${schema.notifications.payloadJson}::text)`,
        })
        .from(schema.notifications)
        .where(whereClause)
        .orderBy(desc(schema.notifications.createdAt), desc(schema.notifications.id))
        .limit(PAGE_SIZE);

      if (metaRows.length === 0) break;

      // Validate single record size with metadata padding BEFORE fetching any payload into memory
      for (const r of metaRows) {
        if ((Number(r.byteLen) || 0) + METADATA_PADDING_BYTES > MAX_RECORD_BYTES) {
          throw new ExportError(
            "EXPORT_RECORD_TOO_LARGE",
            `Single notification record '${r.id}' exceeded maximum supported limit of 10 MiB (${r.byteLen} bytes payload)`,
            413,
            false
          );
        }
      }

      if (options?.onProgress) {
        await options.onProgress({
          section: "notifications",
          page: ++notifPageCount,
          rowCount: metaRows.length,
        });
      }

      // Phase 2: Group into batches of at most 16 MiB payload to bound resident memory
      const MAX_PAYLOAD_GROUP_BYTES = 16 * 1024 * 1024;
      const groups: (typeof metaRows)[] = [];
      let currentGroup: typeof metaRows = [];
      let currentGroupBytes = 0;

      for (const row of metaRows) {
        const rowLen = Number(row.byteLen || 0);
        if (currentGroup.length > 0 && currentGroupBytes + rowLen > MAX_PAYLOAD_GROUP_BYTES) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupBytes = 0;
        }
        currentGroup.push(row);
        currentGroupBytes += rowLen;
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }

      for (const group of groups) {
        if (signal?.aborted)
          throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
        if (getRemainingMs() <= 0)
          throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded", 504, false);

        const groupIds = group.map((g) => g.id);
        const payloadRows = await txDb
          .select({
            id: schema.notifications.id,
            payloadJson: schema.notifications.payloadJson,
          })
          .from(schema.notifications)
          .where(inArray(schema.notifications.id, groupIds));

        const payloadMap = new Map(payloadRows.map((p) => [p.id, p.payloadJson]));

        for (const n of group) {
          const payloadJson = payloadMap.get(n.id);
          const itemStr = serializeExportRecord({
            id: n.id,
            type: n.type,
            payloadJson,
            readAt: n.readAt ? n.readAt.toISOString() : null,
            createdAt: n.createdAt.toISOString(),
          });
          yield `${firstNotif ? "    " : ",\n    "}${itemStr}`;
          firstNotif = false;
        }
      }

      const last = metaRows[metaRows.length - 1]!;
      lastNotifCreatedAtText = last.createdAtText;
      lastNotifId = last.id;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("notifications");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 14. Legal Acceptances
    yield `  "legalAcceptances": [\n`;
    let lastLegalAcceptedAtText: string | null = null;
    let lastLegalDocKey: string | null = null;
    let firstLegal = true;
    let legalPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastLegalAcceptedAtText !== null && lastLegalDocKey !== null
          ? and(
              eq(schema.legalAcceptances.userId, userId),
              sql`(${schema.legalAcceptances.acceptedAt}, ${schema.legalAcceptances.documentKey}) < (${lastLegalAcceptedAtText}::timestamptz, ${lastLegalDocKey})`
            )
          : eq(schema.legalAcceptances.userId, userId);

      const legalPage: LegalAcceptanceRow[] = await txDb
        .select({
          documentKey: schema.legalAcceptances.documentKey,
          documentVersion: schema.legalAcceptances.documentVersion,
          contentHash: schema.legalAcceptances.contentHash,
          acceptedAt: schema.legalAcceptances.acceptedAt,
          acceptedAtText: sql<string>`${schema.legalAcceptances.acceptedAt}::text`,
        })
        .from(schema.legalAcceptances)
        .where(whereClause)
        .orderBy(
          desc(schema.legalAcceptances.acceptedAt),
          desc(schema.legalAcceptances.documentKey)
        )
        .limit(PAGE_SIZE);

      if (legalPage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "legalAcceptances",
          page: ++legalPageCount,
          rowCount: legalPage.length,
        });
      }

      for (const l of legalPage) {
        const itemStr = serializeExportRecord({
          documentKey: l.documentKey,
          documentVersion: l.documentVersion,
          contentHash: l.contentHash,
          acceptedAt: l.acceptedAt.toISOString(),
        });
        yield `${firstLegal ? "    " : ",\n    "}${itemStr}`;
        firstLegal = false;
      }

      const last = legalPage[legalPage.length - 1]!;
      lastLegalAcceptedAtText = last.acceptedAtText;
      lastLegalDocKey = last.documentKey;
    }
    yield `\n  ],\n`;

    if (options?.onSection) await options.onSection("legalAcceptances");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

    // 15. Security Log (Audit Events)
    yield `  "securityLog": [\n`;
    let lastSecCreatedAtText: string | null = null;
    let lastSecId: string | null = null;
    let firstSec = true;
    let secPageCount = 0;

    while (true) {
      if (signal?.aborted)
        throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);

      const whereClause: SQL | undefined =
        lastSecCreatedAtText !== null && lastSecId !== null
          ? and(
              eq(schema.securityEvents.userId, userId),
              sql`(${schema.securityEvents.createdAt}, ${schema.securityEvents.id}) < (${lastSecCreatedAtText}::timestamptz, ${lastSecId}::uuid)`
            )
          : eq(schema.securityEvents.userId, userId);

      const secPage: SecurityEventRow[] = await txDb
        .select({
          id: schema.securityEvents.id,
          eventType: schema.securityEvents.eventType,
          ipAddress: schema.securityEvents.ipAddress,
          createdAt: schema.securityEvents.createdAt,
          createdAtText: sql<string>`${schema.securityEvents.createdAt}::text`,
        })
        .from(schema.securityEvents)
        .where(whereClause)
        .orderBy(desc(schema.securityEvents.createdAt), desc(schema.securityEvents.id))
        .limit(PAGE_SIZE);

      if (secPage.length === 0) break;
      if (options?.onProgress) {
        await options.onProgress({
          section: "securityLog",
          page: ++secPageCount,
          rowCount: secPage.length,
        });
      }

      for (const s of secPage) {
        const itemStr = serializeExportRecord({
          id: s.id,
          eventType: s.eventType,
          ipAddress: s.ipAddress,
          createdAt: s.createdAt.toISOString(),
        });
        yield `${firstSec ? "    " : ",\n    "}${itemStr}`;
        firstSec = false;
      }

      const last = secPage[secPage.length - 1]!;
      lastSecCreatedAtText = last.createdAtText;
      lastSecId = last.id;
    }
    yield `\n  ]\n}\n`;

    if (options?.onSection) await options.onSection("securityLog");
    if (signal?.aborted)
      throw signal.reason || new ExportError("EXPORT_ABORTED", "Aborted", 400, false);
    if (getRemainingMs() <= 0)
      throw new ExportError("EXPORT_TIMEOUT", "Deadline exceeded before commit", 504, false);

    await client.query("COMMIT;");
    transactionFinished = true;
    return { snapshotStartedAt };
  } catch (err: unknown) {
    if (inTransaction && !transactionFinished) {
      try {
        let rollbackTimer: NodeJS.Timeout | null = null;
        await Promise.race([
          client.query("ROLLBACK;"),
          new Promise<void>((_, reject) => {
            rollbackTimer = setTimeout(() => reject(new Error("ROLLBACK_TIMEOUT")), 1000);
          }),
        ]);
        if (rollbackTimer) clearTimeout(rollbackTimer);
        transactionFinished = true;
      } catch {
        performAbortCleanup();
      }
    }
    if (signal?.aborted) {
      throw (
        signal.reason ||
        new ExportError("EXPORT_ABORTED", "Export query cancelled by abort signal", 400, false)
      );
    }
    throw err;
  } finally {
    if (forceCloseTimer) {
      clearTimeout(forceCloseTimer);
      forceCloseTimer = null;
    }
    if (signal) {
      signal.removeEventListener("abort", abortHandler);
    }
    if (pendingCancelPromise) {
      let cancelTimeout: NodeJS.Timeout | null = null;
      await Promise.race([
        pendingCancelPromise,
        new Promise<void>((resolve) => {
          cancelTimeout = setTimeout(resolve, 1500);
        }),
      ]).catch(() => {});
      if (cancelTimeout) clearTimeout(cancelTimeout);
    }

    if (signal?.aborted) {
      performAbortCleanup();
    } else {
      // Handle early generator termination (generator.return() / break in consumer)
      if (inTransaction && !transactionFinished) {
        try {
          let rollbackTimer: NodeJS.Timeout | null = null;
          await Promise.race([
            client.query("ROLLBACK;"),
            new Promise<void>((_, reject) => {
              rollbackTimer = setTimeout(() => reject(new Error("ROLLBACK_TIMEOUT")), 1000);
            }),
          ]);
          if (rollbackTimer) clearTimeout(rollbackTimer);
          transactionFinished = true;
        } catch {
          performAbortCleanup();
        }
      }
      if (!clientDiscarded) {
        client.release();
      }
    }
  }
}

/**
 * Compatibility wrapper for callers requiring a full snapshot object.
 * Assembles the snapshot by consuming the stream without duplicate querying logic.
 */
export async function extractUserDataSnapshot(
  userId: string,
  options?: StreamExportOptions
): Promise<{
  snapshot: ExportDataSnapshot;
  snapshotStartedAt: Date;
}> {
  const chunks: string[] = [];
  const generator = streamUserDataExport(userId, options);

  let genResult = await generator.next();
  while (!genResult.done) {
    chunks.push(genResult.value);
    genResult = await generator.next();
  }

  const jsonStr = chunks.join("");
  const snapshot = JSON.parse(jsonStr) as ExportDataSnapshot;
  return { snapshot, snapshotStartedAt: genResult.value.snapshotStartedAt };
}

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb, schema, acquireUserPairAdvisoryLock } from "@/src/lib/db";
import { z } from "zod";
import { inMemoryListings } from "@/src/modules/listings/service";
import { inMemorySentOffers } from "@/src/modules/offers/service";
import { NotificationService } from "@/src/modules/notifications/service";

// In-memory store exclusively for isolated unit test environments without live DB
const inMemoryReports: Array<typeof schema.reports.$inferSelect> = [];

const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

export const REPORT_REASONS = [
  "SCAM_FRAUD",
  "SPAM",
  "HARASSMENT_ABUSE",
  "ILLEGAL_ACTIVITY",
  "PRIVACY_EXPOSURE",
  "INTELLECTUAL_PROPERTY",
  "MISLEADING_CONTENT",
  "PROHIBITED_SERVICE",
  "OTHER",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REASON_MAP: Record<string, string> = {
  SPAM_OR_SCAM: "SCAM_FRAUD",
  OFF_PLATFORM_ABUSE: "HARASSMENT_ABUSE",
  IP_VIOLATION: "INTELLECTUAL_PROPERTY",
  PROHIBITED_CONTENT: "PROHIBITED_SERVICE",
};

export const createReportSchema = z.object({
  targetType: z.enum(["listing", "profile", "offer", "general", "message"]),
  targetId: z.string().min(1, "Invalid target ID"),
  reasonCode: z.string().transform((val) => (REASON_MAP[val] || val) as ReportReason),
  details: z
    .string()
    .max(2000, "Report details cannot exceed 2000 characters")
    .refine((val) => !EMOJI_REGEX.test(val), {
      message: "Emojis are strictly prohibited",
    })
    .optional()
    .nullable(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export class ModerationService {
  /**
   * Blocks a user. Prevents offers and hides personalized discovery.
   */
  static async blockUser(blockerUserId: string, blockedUserId: string) {
    if (blockerUserId === blockedUserId) {
      throw new Error("You cannot block yourself");
    }

    try {
      const db = getDb();

      return await db.transaction(async (tx) => {
        // 1. Acquire transaction-level advisory lock on symmetric user pair (Fixes B07, R02)
        await acquireUserPairAdvisoryLock(tx, blockerUserId, blockedUserId);

        // 2. Prevent blocking if there is an active engagement or open dispute
        const activeEngagements = await tx
          .select({ id: schema.engagements.id })
          .from(schema.engagements)
          .where(
            and(
              inArray(schema.engagements.status, ["MATCHED", "COMPLETION_PENDING", "DISPUTED"]),
              or(
                and(
                  eq(schema.engagements.ownerUserId, blockerUserId),
                  eq(schema.engagements.freelancerUserId, blockedUserId)
                ),
                and(
                  eq(schema.engagements.ownerUserId, blockedUserId),
                  eq(schema.engagements.freelancerUserId, blockerUserId)
                )
              )
            )
          )
          .limit(1);

        if (activeEngagements.length > 0) {
          throw new Error(
            "Aktif bir iş anlaşmanız veya uyuşmazlığınız varken bu kullanıcıyı engelleyemezsiniz."
          );
        }

        await tx
          .insert(schema.blocks)
          .values({
            blockerUserId,
            blockedUserId,
          })
          .onConflictDoNothing();

        return true;
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Aktif bir iş")) {
        throw err;
      }
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      return true;
    }
  }

  /**
   * Unblocks a previously blocked user.
   */
  static async unblockUser(blockerUserId: string, blockedUserId: string) {
    const db = getDb();

    await db
      .delete(schema.blocks)
      .where(
        and(
          eq(schema.blocks.blockerUserId, blockerUserId),
          eq(schema.blocks.blockedUserId, blockedUserId)
        )
      );

    return true;
  }

  /**
   * Checks if either user has blocked the other.
   */
  static async isBlocked(userIdA: string, userIdB: string): Promise<boolean> {
    const db = getDb();

    const rows = await db
      .select({ blockerId: schema.blocks.blockerUserId })
      .from(schema.blocks)
      .where(
        or(
          and(eq(schema.blocks.blockerUserId, userIdA), eq(schema.blocks.blockedUserId, userIdB)),
          and(eq(schema.blocks.blockerUserId, userIdB), eq(schema.blocks.blockedUserId, userIdA))
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  /**
   * Submits an abuse report against a listing, profile, or offer.
   */
  static async submitReport(reporterUserId: string, rawInput: CreateReportInput) {
    const input = createReportSchema.parse(rawInput);
    const db = getDb();
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.targetId
    );
    const isReporterUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      reporterUserId
    );

    let offenderUserId: string | undefined;
    let offenderDisplayName: string | undefined;

    if (input.targetType === "profile") {
      offenderUserId = input.targetId;
    } else if (input.targetType === "general") {
      offenderUserId = undefined;
    } else if (input.targetType === "listing") {
      const memListing = inMemoryListings.find((l) => l.id === input.targetId);
      if (memListing) {
        offenderUserId = memListing.ownerUserId;
        offenderDisplayName =
          (memListing as unknown as { ownerDisplayName?: string }).ownerDisplayName ||
          "İlan Sahibi";
      }
    } else if (input.targetType === "offer") {
      const memOffer = inMemorySentOffers.find((s) => s.offer.id === input.targetId);
      if (memOffer) {
        offenderUserId = memOffer.offer.offerorUserId;
        offenderDisplayName = "Teklif Sahibi";
      }
    }

    if (isReporterUuid && isTargetUuid) {
      try {
        if (input.targetType === "listing" && !offenderUserId) {
          const [l] = await db
            .select({ ownerUserId: schema.listings.ownerUserId })
            .from(schema.listings)
            .where(eq(schema.listings.id, input.targetId))
            .limit(1);
          if (l) offenderUserId = l.ownerUserId;
        } else if (input.targetType === "offer" && !offenderUserId) {
          const [o] = await db
            .select({ offerorUserId: schema.offers.offerorUserId })
            .from(schema.offers)
            .where(eq(schema.offers.id, input.targetId))
            .limit(1);
          if (o) offenderUserId = o.offerorUserId;
        }

        if (offenderUserId && !offenderDisplayName) {
          const [p] = await db
            .select({ displayName: schema.profiles.displayName })
            .from(schema.profiles)
            .where(eq(schema.profiles.userId, offenderUserId))
            .limit(1);
          if (p?.displayName) offenderDisplayName = p.displayName;
        }

        if (input.targetType !== "general" && offenderUserId && offenderUserId === reporterUserId) {
          throw new Error("CANNOT_REPORT_SELF");
        }

        const existingReport = await db
          .select({ id: schema.reports.id })
          .from(schema.reports)
          .where(
            and(
              eq(schema.reports.reporterUserId, reporterUserId),
              eq(schema.reports.targetId, input.targetId),
              inArray(schema.reports.status, ["OPEN", "REVIEWING"])
            )
          )
          .limit(1);

        if (existingReport.length > 0) {
          throw new Error("DUPLICATE_REPORT");
        }

        const [report] = await db
          .insert(schema.reports)
          .values({
            reporterUserId,
            targetType: input.targetType,
            targetId: input.targetId,
            reasonCode: input.reasonCode,
            details: input.details ?? null,
            status: "OPEN",
          })
          .returning();

        if (report) {
          return report;
        }
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === "CANNOT_REPORT_SELF" || err.message === "DUPLICATE_REPORT")
        ) {
          throw err;
        }
        if (process.env.NODE_ENV === "production") {
          throw err;
        }
      }
    }

    if (input.targetType !== "general" && offenderUserId && offenderUserId === reporterUserId) {
      throw new Error("CANNOT_REPORT_SELF");
    }

    const existingMock = inMemoryReports.find(
      (m) =>
        m.reporterUserId === reporterUserId &&
        m.targetId === input.targetId &&
        (m.status === "OPEN" || m.status === "REVIEWING")
    );
    if (existingMock) {
      throw new Error("DUPLICATE_REPORT");
    }

    const mockReport: typeof schema.reports.$inferSelect = {
      id: crypto.randomUUID(),
      reporterUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      reasonCode: input.reasonCode,
      details: input.details ?? null,
      status: "OPEN",
      assignedAdminId: null,
      resolvedAt: null,
      createdAt: new Date(),
    };
    inMemoryReports.unshift(mockReport);
    return mockReport;
  }

  /**
   * Retrieves reports for administrative review.
   */
  static async getReports(statusFilter?: string) {
    try {
      const db = getDb();
      const query = db.select().from(schema.reports).orderBy(desc(schema.reports.createdAt));
      const rows = await query;
      if (rows.length > 0) {
        if (!statusFilter || statusFilter.toLowerCase() === "all") return rows;
        return rows.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
    }
    let events = [...inMemoryReports];
    if (statusFilter && statusFilter.toLowerCase() !== "all") {
      events = events.filter((e) => e.status.toLowerCase() === statusFilter.toLowerCase());
    }
    return events;
  }

  /**
   * Resolves or dismisses an abuse report.
   */
  static async resolveReport(adminId: string, reportId: string, status: "RESOLVED" | "DISMISSED") {
    let reporterUserId: string | undefined;

    const report = inMemoryReports.find((r) => r.id === reportId);
    if (report) {
      report.status = status;
      if (report.reporterUserId) {
        reporterUserId = report.reporterUserId;
      }
    }

    let updatedResult: typeof schema.reports.$inferSelect | undefined;

    try {
      const db = getDb();
      const [updated] = await db
        .update(schema.reports)
        .set({
          status,
          assignedAdminId: adminId,
          resolvedAt: new Date(),
        })
        .where(eq(schema.reports.id, reportId))
        .returning();

      updatedResult = updated;
      if (updated?.reporterUserId) {
        reporterUserId = updated.reporterUserId;
      }

      try {
        await db.insert(schema.adminAuditLog).values({
          adminUserId: adminId,
          action: `REPORT_${status}`,
          targetType: "report",
          targetId: reportId,
          reasonCode: status,
          safeSummary: `Şikayet ${reportId} incelendi ve '${status}' olarak sonuçlandırıldı.`,
        });
      } catch {
        // non-blocking
      }
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      updatedResult = {
        id: reportId,
        status,
        assignedAdminId: adminId,
        resolvedAt: new Date(),
      } as unknown as typeof schema.reports.$inferSelect;
    }

    if (reporterUserId) {
      const isResolved = status === "RESOLVED";
      const titleTr = isResolved ? "Şikayetiniz İncelendi ve Çözümlendi" : "Şikayetiniz İncelendi";
      const titleEn = isResolved
        ? "Your Report Has Been Resolved"
        : "Your Report Has Been Reviewed";
      const msgTr = isResolved
        ? "Bildirdiğiniz şikayet Operis moderasyon ekibi tarafından incelendi ve gerekli tedbirler uygulandı. Güvenli topluluğumuza katkınız için teşekkür ederiz."
        : "Bildirdiğiniz şikayet Operis moderasyon ekibi tarafından incelendi ve mevcut kurallar çerçevesinde kapatıldı.";
      const msgEn = isResolved
        ? "Your report has been investigated by our moderation team and appropriate actions have been taken. Thank you for helping keep Operis safe."
        : "Your report has been investigated by our moderation team and concluded in accordance with our community guidelines.";

      try {
        await NotificationService.createNotification(
          reporterUserId,
          "MODERATION_ACTION",
          "REPORT",
          reportId,
          {
            title: titleTr,
            title_en: titleEn,
            message: msgTr,
            message_en: msgEn,
            reportId,
            status,
          }
        );
      } catch {
        // Notification failure should not fail report resolution
      }
    }

    return updatedResult;
  }
}

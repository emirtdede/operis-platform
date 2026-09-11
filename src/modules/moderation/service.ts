import { and, desc, eq, or } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { z } from "zod";
import { mockAbuseEvents } from "@/src/modules/admin/service";
import { inMemoryListings } from "@/src/modules/listings/service";
import { inMemorySentOffers } from "@/src/modules/offers/service";

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

    const db = getDb();

    await db
      .insert(schema.blocks)
      .values({
        blockerUserId,
        blockedUserId,
      })
      .onConflictDoNothing();

    return true;
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
    const isTargetUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.targetId);
    const isReporterUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reporterUserId);

    let offenderUserId: string | undefined;
    let offenderDisplayName: string | undefined;

    if (input.targetType === "profile" || input.targetType === "general") {
      offenderUserId = input.targetId;
    } else if (input.targetType === "listing") {
      const memListing = inMemoryListings.find((l) => l.id === input.targetId);
      if (memListing) {
        offenderUserId = memListing.ownerUserId;
        offenderDisplayName =
          (memListing as unknown as { ownerDisplayName?: string }).ownerDisplayName || "İlan Sahibi";
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

        const [report] = await db
          .insert(schema.reports)
          .values({
            reporterUserId,
            targetType: input.targetType === "general" ? "profile" : input.targetType,
            targetId: input.targetId,
            reasonCode: input.reasonCode,
            details: input.details ?? null,
            status: "OPEN",
          })
          .returning();

        if (report) {
          mockAbuseEvents.unshift({
            id: report.id,
            reporterUserId,
            reporterDisplayName: "Kullanıcı",
            offenderUserId,
            offenderDisplayName: offenderDisplayName || "Kullanıcı",
            targetType:
              input.targetType === "general"
                ? "profile"
                : (input.targetType as "listing" | "profile" | "offer" | "message"),
            targetId: input.targetId,
            reasonCode: input.reasonCode,
            details: input.details ?? "",
            status: "OPEN",
            createdAt: report.createdAt,
          });

          return report;
        }
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          throw err;
        }
      }
    }

    const mockReport = {
      id: `report_${Date.now()}`,
      reporterUserId,
      targetType: input.targetType,
      targetId: input.targetId,
      reasonCode: input.reasonCode,
      details: input.details ?? null,
      status: "OPEN",
      createdAt: new Date(),
      assignedAdminId: null,
      resolvedAt: null,
    };
    mockAbuseEvents.unshift({
      id: mockReport.id,
      reporterUserId,
      reporterDisplayName: "Kullanıcı",
      offenderUserId,
      offenderDisplayName: offenderDisplayName || "Kullanıcı",
      targetType:
        input.targetType === "general"
          ? "profile"
          : (input.targetType as "listing" | "profile" | "offer" | "message"),
      targetId: input.targetId,
      reasonCode: input.reasonCode,
      details: input.details ?? "",
      status: "OPEN",
      createdAt: mockReport.createdAt,
    });
    return mockReport as unknown as typeof schema.reports.$inferSelect;
  }

  /**
   * Retrieves reports for administrative review.
   */
  static async getReports(statusFilter?: string) {
    try {
      const db = getDb();
      const query = db.select().from(schema.reports).orderBy(desc(schema.reports.createdAt));
      const rows = await query;
      if (!statusFilter || statusFilter === "all") return rows;
      return rows.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      let events = [...mockAbuseEvents];
      if (statusFilter && statusFilter !== "all") {
        events = events.filter((e) => e.status.toLowerCase() === statusFilter.toLowerCase());
      }
      return events.map((e) => ({
        id: e.id,
        reporterUserId: e.reporterUserId,
        targetType: e.targetType,
        targetId: e.targetId,
        reasonCode: e.reasonCode,
        details: e.details,
        status: e.status,
        createdAt: e.createdAt,
        assignedAdminId: null,
        resolvedAt: null,
      })) as unknown as (typeof schema.reports.$inferSelect)[];
    }
  }

  /**
   * Resolves or dismisses an abuse report.
   */
  static async resolveReport(adminId: string, reportId: string, status: "RESOLVED" | "DISMISSED") {
    const report = mockAbuseEvents.find((r) => r.id === reportId);
    if (report) {
      report.status = status;
    }

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

      return updated;
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      return {
        id: reportId,
        status,
        assignedAdminId: adminId,
        resolvedAt: new Date(),
      } as unknown as typeof schema.reports.$inferSelect;
    }
  }
}

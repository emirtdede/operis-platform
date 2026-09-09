import { and, desc, eq, or } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { z } from "zod";

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

export const createReportSchema = z.object({
  targetType: z.enum(["listing", "profile", "offer"]),
  targetId: z.string().uuid("Invalid target ID"),
  reasonCode: z.enum(REPORT_REASONS),
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
          and(
            eq(schema.blocks.blockerUserId, userIdA),
            eq(schema.blocks.blockedUserId, userIdB)
          ),
          and(
            eq(schema.blocks.blockerUserId, userIdB),
            eq(schema.blocks.blockedUserId, userIdA)
          )
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  /**
   * Submits an abuse report against a listing, profile, or offer.
   */
  static async submitReport(
    reporterUserId: string,
    rawInput: CreateReportInput
  ) {
    const input = createReportSchema.parse(rawInput);
    const db = getDb();

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

    return report;
  }

  /**
   * Retrieves reports for administrative review.
   */
  static async getReports(statusFilter?: string) {
    const db = getDb();

    const query = db
      .select()
      .from(schema.reports)
      .orderBy(desc(schema.reports.createdAt));

    const rows = await query;
    if (!statusFilter || statusFilter === "all") return rows;

    return rows.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
  }

  /**
   * Resolves or dismisses an abuse report.
   */
  static async resolveReport(
    adminId: string,
    reportId: string,
    status: "RESOLVED" | "DISMISSED"
  ) {
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
  }
}

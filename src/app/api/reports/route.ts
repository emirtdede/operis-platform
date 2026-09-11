import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";
import { EMOJI_REGEX } from "@/src/lib/security/content-moderator";
import { ModerationService, ReportReason } from "@/src/modules/moderation/service";
import { inMemoryListings } from "@/src/modules/listings/service";

const createReportSchema = (isEn: boolean) =>
  z.object({
    targetType: z.enum(["listing", "profile", "offer", "general"]),
    targetIdentifier: z
      .string()
      .min(1, isEn ? "Target identifier or URL is required." : "Hedef kimliği veya bağlantısı zorunludur."),
    reasonCode: z
      .string()
      .min(1, isEn ? "Please select a reason for reporting." : "Lütfen bir bildirim nedeni seçiniz."),
    details: z
      .string()
      .min(10, isEn ? "Please provide at least 10 characters of explanation." : "Lütfen en az 10 karakterlik detaylı bir açıklama yazınız.")
      .max(2000, isEn ? "Explanation cannot exceed 2000 characters." : "Açıklama en fazla 2000 karakter olabilir.")
      .refine((val) => !EMOJI_REGEX.test(val), {
        message: isEn ? "Emojis are not permitted in report descriptions." : "Bildirim açıklamasında emoji kullanılamaz.",
      }),
    locale: z.enum(["tr", "en"]).optional(),
  });

const REASON_MAP: Record<string, string> = {
  SPAM_OR_SCAM: "SCAM_FRAUD",
  OFF_PLATFORM_ABUSE: "HARASSMENT_ABUSE",
  IP_VIOLATION: "INTELLECTUAL_PROPERTY",
  PROHIBITED_CONTENT: "PROHIBITED_SERVICE",
};

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  const limitCheck = checkRateLimit(`report:${ip}`, 5, 10 * 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEnHeader
        ? "Too many reports submitted. Please try again later."
        : "Kısa sürede çok fazla bildirim iletildi. Lütfen daha sonra tekrar deneyiniz."
    );
  }

  let isEn = isEnHeader;
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEnHeader ? "Unauthorized. Please sign in." : "Giriş yapmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const body = await req.json();
    isEn = body?.locale === "en" || isEnHeader;
    const data = createReportSchema(isEn).parse(body);

    const cleanIdentifier = data.targetIdentifier.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      cleanIdentifier
    );

    let targetId: string | null = null;
    const db = getDb();

    if (isUuid) {
      targetId = cleanIdentifier;
    } else {
      // Resolve slug or handle from database
      if (data.targetType === "listing") {
        const slug = cleanIdentifier.split("/").filter(Boolean).pop() || cleanIdentifier;
        const [listing] = await db
          .select({ id: schema.listings.id })
          .from(schema.listings)
          .where(eq(schema.listings.slug, slug))
          .limit(1);
        if (listing) {
          targetId = listing.id;
        }
      } else if (data.targetType === "profile") {
        const rawHandle = cleanIdentifier.split("/").filter(Boolean).pop() || cleanIdentifier;
        const handle = rawHandle.replace(/^@/, "");
        const [user] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .innerJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
          .where(or(eq(schema.profiles.handle, handle), eq(schema.users.email, cleanIdentifier)))
          .limit(1);
        if (user) {
          targetId = user.id;
        }
      }
    }

    if (!targetId && process.env.NODE_ENV !== "production") {
      if (data.targetType === "listing") {
        const inMem = inMemoryListings.find(
          (l) => l.id === cleanIdentifier || l.slug === cleanIdentifier
        );
        if (inMem) targetId = inMem.id;
      } else if (data.targetType === "profile") {
        const rawHandle = cleanIdentifier.split("/").filter(Boolean).pop() || cleanIdentifier;
        const handle = rawHandle.replace(/^@/, "").toLowerCase();
        if (handle === "demokullanici" || handle === "usr_mock_demir_yildiz") {
          targetId = "usr_mock_demir_yildiz";
        } else if (handle === "mehmetkaan" || handle === "usr_mock_mehmet_kaan") {
          targetId = "usr_mock_mehmet_kaan";
        } else if (handle === "selinyilmaz" || handle === "usr_mock_selin_yilmaz") {
          targetId = "usr_mock_selin_yilmaz";
        }
      }
    }

    if (!targetId) {
      if (data.targetType === "general") {
        targetId = session.userId;
      } else {
        return NextResponse.json(
          {
            error: isEn
              ? "Reported target not found. Please provide a valid project link or username."
              : "Bildirilen hedef bulunamadı. Lütfen geçerli bir ilan bağlantısı veya kullanıcı adı giriniz.",
          },
          { status: 400 }
        );
      }
    }

    const canonicalReason = (REASON_MAP[data.reasonCode] || data.reasonCode) as ReportReason;

    try {
      await ModerationService.submitReport(session.userId, {
        targetType: data.targetType,
        targetId: targetId || cleanIdentifier,
        reasonCode: canonicalReason,
        details: `[Hedef: ${data.targetIdentifier}] ${data.details}`,
      });
    } catch (dbErr) {
      if (process.env.NODE_ENV === "production") {
        console.error("Failed to persist report:", dbErr);
        return NextResponse.json(
          {
            error: isEn
              ? "Database error while saving report."
              : "Bildirim kaydedilirken bir veritabanı hatası oluştu.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: isEn
          ? "Your report has been submitted to Operis security team. It will be reviewed promptly."
          : "Bildiriminiz Operis güvenlik ekibine başarıyla iletildi. En kısa sürede incelenecektir.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid form data." : "Form verileri geçersiz.")
        : isEn ? "Failed to submit report." : "Bildirim iletilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

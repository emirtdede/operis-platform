import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { schema } from "@/src/lib/db";
import { verifyPhoneOtpAsync, PhoneVerificationError } from "@/src/modules/auth/verification";

import {
  checkDualRateLimitAsync,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";
import { SecurityAuditService } from "@/src/modules/security/audit-service";

const createVerifyPhoneSchema = (isEn: boolean) =>
  z.object({
    code: z
      .string()
      .regex(
        /^\d{6}$/,
        isEn
          ? "Please enter a 6-digit verification code."
          : "Lütfen 6 haneli doğrulama kodunu giriniz."
      ),
    challengeId: z
      .string()
      .uuid(
        isEn
          ? "Valid verification challenge ID is required."
          : "Geçerli bir doğrulama oturum kimliği (challengeId) zorunludur."
      ),
    locale: z.enum(["tr", "en"]).optional(),
  });

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEnHeader ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const limitCheck = await checkDualRateLimitAsync("auth:verify-phone", session.userId, ip, {
      userLimit: 5,
      ipLimit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!limitCheck.success) {
      if (limitCheck.isBlocked || limitCheck.reset >= 86400) {
        return NextResponse.json(
          {
            error: isEnHeader
              ? "Access denied: IP address is blocked."
              : "Erişim engellendi: IP adresiniz engellenmiştir.",
          },
          { status: 403 }
        );
      }
      return rateLimitExceededResponse(
        limitCheck.reset,
        isEnHeader
          ? "Too many verification attempts. Please try again later."
          : "Çok fazla doğrulama denemesi yapıldı. Lütfen daha sonra tekrar deneyiniz."
      );
    }

    const body = await req.json();
    const isEn = body?.locale === "en" || isEnHeader;
    const { code, challengeId } = createVerifyPhoneSchema(isEn).parse(body);

    const now = new Date();
    const isValid = await verifyPhoneOtpAsync(session.userId, code, {
      challengeId,
      autoConsume: true,
      expectedPurpose: "INITIAL_VERIFICATION",
      onSuccessTx: async (tx) => {
        await tx
          .update(schema.userPrivateIdentity)
          .set({
            phoneVerifiedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.userPrivateIdentity.userId, session.userId));
      },
    });

    if (!isValid) {
      return NextResponse.json(
        {
          error: isEn
            ? "Invalid or expired SMS verification code."
            : "Geçersiz veya süresi dolmuş SMS doğrulama kodu.",
        },
        { status: 400 }
      );
    }

    // Audit log
    SecurityAuditService.logEvent({
      userId: session.userId,
      eventType: "PHONE_VERIFIED",
      ipAddress: ip,
      riskMetadata: {
        action: "INITIAL_PHONE_VERIFICATION",
      },
    }).catch(() => {});

    if (session.userId === DEFAULT_USER.id) {
      DEFAULT_USER.phoneVerified = true;
    }

    return NextResponse.json({
      success: true,
      message: isEn
        ? "Your phone number has been successfully verified."
        : "Telefon numaranız başarıyla doğrulandı.",
    });
  } catch (err: unknown) {
    const isEn = req.headers.get("x-locale") === "en";
    if (err instanceof PhoneVerificationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: err.issues[0]?.message || (isEn ? "Invalid code format." : "Geçersiz kod biçimi."),
        },
        { status: 400 }
      );
    }
    const isDbUnavailable =
      err instanceof Error &&
      (err.message.includes("database") ||
        err.message.includes("connection") ||
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("SECURITY_DATABASE_UNAVAILABLE"));

    if (isDbUnavailable) {
      return NextResponse.json(
        {
          error: isEn
            ? "Database service temporarily unavailable."
            : "Veritabanı servisine geçici olarak erişilemiyor.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: isEn ? "Failed to verify phone number." : "Telefon doğrulanamadı." },
      { status: 400 }
    );
  }
}

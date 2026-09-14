import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import { hashPhoneBlindIndex, generateOtpCode } from "@/src/lib/crypto";
import { storePhoneOtpAsync, consumePhoneOtpAsync } from "@/src/modules/auth/verification";
import { smsProvider } from "@/src/lib/sms";
import {
  checkDualRateLimitAsync,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

const requestChangeSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Phone must be in valid E.164 international format (e.g. +905551234567)"
    ),
});

export async function POST(req: Request) {
  const isEn = req.headers.get("x-locale") === "en";
  const ip = getClientIp(req);

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const rateLimit = await checkDualRateLimitAsync("account:phone:request", session.userId, ip, {
      userLimit: 5,
      ipLimit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.success) {
      if (rateLimit.isBlocked || rateLimit.reset >= 86400) {
        return NextResponse.json(
          {
            error: isEn
              ? "Access denied: IP address is blocked."
              : "Erişim engellendi: IP adresiniz engellenmiştir.",
          },
          { status: 403 }
        );
      }
      return rateLimitExceededResponse(
        rateLimit.reset,
        isEn
          ? "Too many phone change attempts. Please wait 15 minutes."
          : "Çok fazla telefon değiştirme denemesi yapıldı. Lütfen 15 dakika bekleyiniz."
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = requestChangeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: isEn
            ? "Invalid phone number. Must be in E.164 international format (e.g. +905551234567)."
            : "Geçersiz telefon numarası. Uluslararası E.164 formatında olmalıdır (Örn: +905551234567).",
        },
        { status: 400 }
      );
    }

    const { phone } = parseResult.data;
    const db = getDb();
    const phoneHmac = hashPhoneBlindIndex(phone);

    // Verify uniqueness via blind index
    try {
      const existing = await db
        .select({ userId: schema.userPrivateIdentity.userId })
        .from(schema.userPrivateIdentity)
        .where(eq(schema.userPrivateIdentity.phoneHmac, phoneHmac))
        .limit(1);

      if (existing.length > 0 && existing[0]?.userId !== session.userId) {
        return NextResponse.json(
          {
            error: isEn
              ? "This phone number is already registered to another account."
              : "Bu telefon numarası başka bir hesap tarafından kullanılmaktadır.",
          },
          { status: 400 }
        );
      }
    } catch (err: unknown) {
      if (
        process.env.NODE_ENV === "production" &&
        err instanceof Error &&
        (err.message.includes("database") ||
          err.message.includes("connection") ||
          err.message.includes("ECONNREFUSED"))
      ) {
        return NextResponse.json(
          {
            error: isEn
              ? "Database service temporarily unavailable."
              : "Veritabanı servisine geçici olarak erişilemiyor.",
          },
          { status: 503 }
        );
      }
    }

    const otpCode = generateOtpCode();

    // 1. Store verification challenge in database first (B12 atomic ordering)
    const challengeId = await storePhoneOtpAsync(session.userId, otpCode, {
      pendingPhone: phone,
      purpose: "PHONE_CHANGE",
    });

    // 2. Dispatch SMS
    const smsRes = await smsProvider
      .sendOtp({
        phoneE164: phone,
        code: otpCode,
        locale: isEn ? "en" : "tr",
        idempotencyKey: `phone_chg_${session.userId}_${Date.now()}`,
      })
      .catch((err) => ({
        success: false,
        error: err instanceof Error ? err.message : "SMS provider failure",
      }));

    if (!smsRes.success) {
      // Invalidate the challenge if SMS failed delivery
      await consumePhoneOtpAsync(session.userId, challengeId);
      return NextResponse.json(
        {
          error: isEn
            ? "Failed to deliver SMS verification code. Please try again later."
            : "SMS doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyiniz.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      challengeId,
      message: isEn
        ? "Verification code sent via SMS. Please enter the 6-digit code."
        : "Doğrulama kodu SMS ile iletildi. Lütfen 6 haneli kodu giriniz.",
    });
  } catch (err: unknown) {
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
      {
        error: isEn ? "Phone change request failed." : "Telefon değiştirme isteği başarısız oldu.",
      },
      { status: 400 }
    );
  }
}

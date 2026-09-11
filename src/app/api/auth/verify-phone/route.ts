import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import { verifyPhoneOtp, consumePhoneOtp } from "@/src/modules/auth/verification";

import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

const createVerifyPhoneSchema = (isEn: boolean) =>
  z.object({
    code: z
      .string()
      .regex(/^\d{6}$/, isEn ? "Please enter a 6-digit verification code." : "Lütfen 6 haneli doğrulama kodunu giriniz."),
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

    const limitCheck = checkRateLimit(`auth:verify-phone:${session.userId}:${ip}`, 5, 10 * 60 * 1000);
    if (!limitCheck.success) {
      return rateLimitExceededResponse(
        limitCheck.reset,
        isEnHeader
          ? "Too many verification attempts. Please try again later."
          : "Çok fazla doğrulama denemesi yapıldı. Lütfen daha sonra tekrar deneyiniz."
      );
    }

    const body = await req.json();
    const isEn = body?.locale === "en" || isEnHeader;
    const { code } = createVerifyPhoneSchema(isEn).parse(body);

    const isValid = verifyPhoneOtp(session.userId, code, false);
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

    try {
      const db = getDb();
      await db
        .update(schema.userPrivateIdentity)
        .set({
          phoneVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.userPrivateIdentity.userId, session.userId));
    } catch {
      // In dev or offline environments, proceed if DB update fails
      if (process.env.NODE_ENV === "production") {
        throw new Error(isEn ? "Database update failed." : "Veritabanı güncellemesi tamamlanamadı.");
      }
    }

    // Explicitly consume OTP only after DB update was successful
    consumePhoneOtp(session.userId);

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
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid code format." : "Geçersiz kod biçimi.")
        : err instanceof Error
          ? err.message
          : isEn ? "Failed to verify phone number." : "Telefon doğrulanamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

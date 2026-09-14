import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { schema } from "@/src/lib/db";
import { encryptEnvelopeV2, hashPhoneBlindIndex } from "@/src/lib/crypto";
import {
  verifyPhoneOtpAsync,
  getStoredPhoneOtpMetadata,
  PhoneVerificationError,
} from "@/src/modules/auth/verification";
import { SecurityAuditService } from "@/src/modules/security/audit-service";
import {
  checkDualRateLimitAsync,
  rateLimitExceededResponse,
  getClientIp,
} from "@/src/lib/security/rate-limit";

const verifyChangeSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in valid E.164 international format"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
  challengeId: z.string().uuid("Valid verification challenge ID is required."),
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

    const rateLimit = await checkDualRateLimitAsync("account:phone:verify", session.userId, ip, {
      userLimit: 5,
      ipLimit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.success) {
      if (rateLimit.reset >= 86400) {
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
          ? "Too many verification attempts. Please wait a moment."
          : "Çok fazla doğrulama denemesi yapıldı. Lütfen biraz bekleyiniz."
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = verifyChangeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: isEn
            ? "Invalid phone number or 6-digit verification code."
            : "Geçersiz telefon numarası veya 6 haneli doğrulama kodu.",
        },
        { status: 400 }
      );
    }

    const { phone, code, challengeId } = parseResult.data;

    // Check pending phone match from metadata
    const metadata = getStoredPhoneOtpMetadata(session.userId);
    if (metadata?.pendingPhone && metadata.pendingPhone !== phone) {
      return NextResponse.json(
        {
          error: isEn
            ? "Phone number does not match the verification request."
            : "Doğrulanan numara kod talep edilen telefonla eşleşmiyor.",
        },
        { status: 400 }
      );
    }

    // Encrypt new phone with Envelope v2 and AAD context binding, and compute blind index
    const phoneE164Enc = encryptEnvelopeV2(phone, {
      table: "user_private_identity",
      primaryKey: session.userId,
      column: "phone_e164_enc",
    });
    const phoneHmac = hashPhoneBlindIndex(phone);
    const now = new Date();

    const isValid = await verifyPhoneOtpAsync(session.userId, code, {
      challengeId,
      autoConsume: true,
      expectedPurpose: "PHONE_CHANGE",
      targetPhone: phone,
      onSuccessTx: async (tx) => {
        await tx
          .update(schema.userPrivateIdentity)
          .set({
            phoneE164Enc,
            phoneHmac,
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
            ? "Invalid or expired verification code. Please try again."
            : "Geçersiz veya süresi dolmuş doğrulama kodu. Lütfen tekrar deneyiniz.",
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
        action: "PHONE_NUMBER_CHANGED",
        newPhoneHmacPrefix: phoneHmac.slice(0, 8),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: isEn
        ? "Phone number updated and verified successfully."
        : "Telefon numaranız başarıyla güncellendi ve doğrulandı.",
    });
  } catch (err: unknown) {
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
      { error: isEn ? "Phone verification failed." : "Telefon doğrulanamadı." },
      { status: 400 }
    );
  }
}

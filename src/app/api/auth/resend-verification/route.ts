import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import { createEmailVerificationToken, storePhoneOtp } from "@/src/modules/auth/verification";
import { generateOtpCode, decryptPii } from "@/src/lib/crypto";
import { emailProvider } from "@/src/lib/email";
import { smsProvider } from "@/src/lib/sms";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

const resendSchema = z.object({
  type: z.enum(["email", "phone"]),
  email: z.string().email().optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = resendSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: isEnHeader
            ? "Invalid request parameters."
            : "Geçersiz istek parametreleri.",
        },
        { status: 400 }
      );
    }

    const { type, email, locale } = parseResult.data;
    const isEn = locale === "en" || isEnHeader;
    const session = await getSession();

    const rateKey = `auth:resend:${session?.userId || email || ip}`;
    const limitCheck = checkRateLimit(rateKey, 1, 60 * 1000);
    if (!limitCheck.success) {
      return rateLimitExceededResponse(
        limitCheck.reset,
        isEn
          ? "Please wait at least 60 seconds before requesting another verification code."
          : "Lütfen yeni bir doğrulama kodu istemeden önce en az 60 saniye bekleyin."
      );
    }

    if (type === "email") {
      let targetEmail = email;
      let targetUserId = session?.userId;

      if (!targetEmail && targetUserId) {
        // Find email from session
        if (targetUserId === DEFAULT_USER.id) {
          targetEmail = DEFAULT_USER.email;
        } else {
          const db = getDb();
          const [user] = await db
            .select({ id: schema.users.id, email: schema.users.email, emailVerified: schema.users.emailVerified })
            .from(schema.users)
            .where(eq(schema.users.id, targetUserId))
            .limit(1);

          if (user) {
            if (user.emailVerified) {
              return NextResponse.json({
                success: true,
                message: isEn
                  ? "Your email address is already verified."
                  : "E-posta adresiniz zaten doğrulanmış.",
              });
            }
            targetEmail = user.email;
          }
        }
      } else if (targetEmail && !targetUserId) {
        // Look up by email
        const db = getDb();
        const [user] = await db
          .select({ id: schema.users.id, email: schema.users.email, emailVerified: schema.users.emailVerified })
          .from(schema.users)
          .where(eq(schema.users.email, targetEmail))
          .limit(1);

        if (user) {
          if (user.emailVerified) {
            return NextResponse.json({
              success: true,
              message: isEn
                ? "Your email address is already verified."
                : "E-posta adresiniz zaten doğrulanmış.",
            });
          }
          targetUserId = user.id;
        } else {
          // Do not reveal email absence, return generic success
          return NextResponse.json({
            success: true,
            message: isEn
              ? "If an account exists with this email, a verification link has been sent."
              : "Bu e-posta ile kayıtlı bir hesap varsa, doğrulama bağlantısı gönderildi.",
          });
        }
      }

      if (!targetEmail || !targetUserId) {
        return NextResponse.json(
          {
            error: isEn
              ? "Email address or active session is required."
              : "E-posta adresi veya aktif oturum gereklidir.",
          },
          { status: 400 }
        );
      }

      const emailToken = createEmailVerificationToken(targetUserId, targetEmail);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8000";
      const verificationUrl = `${appUrl}/api/auth/verify-email?token=${emailToken}`;

      const res = await emailProvider.send({
        to: targetEmail,
        template: "verify_email",
        locale: isEn ? "en" : "tr",
        variables: {
          token: emailToken,
          verificationUrl,
          subject: isEn ? "Verify your Operis email" : "Operis e-posta adresinizi doğrulayın",
          body: isEn
            ? `Please verify your email by clicking: ${verificationUrl}`
            : `Lütfen e-posta adresinizi doğrulamak için tıklayın: ${verificationUrl}`,
        },
        idempotencyKey: `email_resend_${targetUserId}_${Date.now()}`,
      });

      if (!res.success && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            error: isEn
              ? "Failed to deliver verification email. Please try again."
              : "Doğrulama e-postası iletilemedi. Lütfen tekrar deneyin.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: isEn
          ? "Verification email has been sent successfully."
          : "Doğrulama e-postası başarıyla gönderildi.",
      });
    }

    if (type === "phone") {
      if (!session?.userId) {
        return NextResponse.json(
          {
            error: isEn
              ? "Sign in required to verify phone number."
              : "Telefon doğrulaması için oturum açmış olmanız gerekmektedir.",
          },
          { status: 401 }
        );
      }

      if (session.userId === DEFAULT_USER.id) {
        const otpCode = generateOtpCode();
        storePhoneOtp(session.userId, otpCode);
        return NextResponse.json({
          success: true,
          message: isEn
            ? "Verification code has been sent via SMS (Demo Mode: 123456)."
            : "Doğrulama kodu SMS ile gönderildi (Demo Mod: 123456).",
        });
      }

      const db = getDb();
      const [identity] = await db
        .select({
          phoneE164Enc: schema.userPrivateIdentity.phoneE164Enc,
          phoneVerifiedAt: schema.userPrivateIdentity.phoneVerifiedAt,
        })
        .from(schema.userPrivateIdentity)
        .where(eq(schema.userPrivateIdentity.userId, session.userId))
        .limit(1);

      if (!identity) {
        return NextResponse.json(
          {
            error: isEn
              ? "User identity record not found."
              : "Kullanıcı kimlik kaydı bulunamadı.",
          },
          { status: 404 }
        );
      }

      if (identity.phoneVerifiedAt) {
        return NextResponse.json({
          success: true,
          message: isEn
            ? "Your phone number is already verified."
            : "Telefon numaranız zaten doğrulanmış.",
        });
      }

      let phoneE164 = "";
      try {
        phoneE164 = decryptPii(identity.phoneE164Enc);
      } catch (decErr) {
        console.error("PII decrypt error during SMS resend:", decErr);
        return NextResponse.json(
          {
            error: isEn
              ? "Unable to read phone number securely."
              : "Telefon numarası güvenli şekilde okunamadı.",
          },
          { status: 500 }
        );
      }

      const otpCode = generateOtpCode();
      storePhoneOtp(session.userId, otpCode);

      const res = await smsProvider.sendOtp({
        phoneE164,
        code: otpCode,
        locale: isEn ? "en" : "tr",
        idempotencyKey: `sms_resend_${session.userId}_${Date.now()}`,
      });

      if (!res.success && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          {
            error: isEn
              ? "Failed to deliver SMS verification code. Please try again."
              : "SMS doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.",
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: isEn
          ? "Verification code has been sent via SMS."
          : "Doğrulama kodu SMS ile iletildi.",
      });
    }

    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  } catch (err: unknown) {
    const isEn = isEnHeader;
    const message = err instanceof Error ? err.message : isEn ? "An unexpected error occurred." : "Beklenmeyen bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

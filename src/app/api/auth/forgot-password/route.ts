import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { createPasswordResetToken } from "@/src/modules/auth/password-reset";
import { EmailAdapter } from "@/src/lib/email";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

const createForgotPasswordSchema = (isEn: boolean) =>
  z.object({
    email: z
      .string()
      .email(isEn ? "Please enter a valid email address." : "Geçerli bir e-posta adresi giriniz."),
    locale: z.enum(["tr", "en"]).optional(),
  });

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  const limitCheck = checkRateLimit(`auth:forgot-pwd:${ip}`, 3, 15 * 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEnHeader
        ? "Too many password reset requests. Please try again later."
        : "Kısa sürede çok fazla şifre sıfırlama isteği gönderildi. Lütfen daha sonra tekrar deneyiniz."
    );
  }

  try {
    const body = await req.json();
    const isEnCandidate = body?.locale === "en" || isEnHeader;
    const { email, locale: requestedLocale } = createForgotPasswordSchema(isEnCandidate).parse(body);
    const cleanEmail = email.toLowerCase().trim();

    let resetToken: string | null = null;
    let userLocale: "tr" | "en" = requestedLocale ?? "tr";

    try {
      const db = getDb();
      const userRows = await db
        .select({
          id: schema.users.id,
          passwordHash: schema.users.passwordHash,
          profileLocale: schema.profiles.locale,
        })
        .from(schema.users)
        .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
        .where(eq(schema.users.email, cleanEmail))
        .limit(1);

      const user = userRows[0];
      if (user && user.passwordHash) {
        resetToken = createPasswordResetToken(cleanEmail, user.passwordHash);
        if (requestedLocale) {
          userLocale = requestedLocale;
        } else if (user.profileLocale === "en" || user.profileLocale === "tr") {
          userLocale = user.profileLocale;
        }
      } else if (
        process.env.NODE_ENV !== "production" &&
        (cleanEmail === "kullanici@operis.pro" || cleanEmail === "demo@operis.dev")
      ) {
        resetToken = createPasswordResetToken(cleanEmail, "demo-offline-hash-fingerprint");
      }
    } catch {
      // If database is offline or unreachable in dev/test, generate token for demo accounts
      if (
        process.env.NODE_ENV !== "production" &&
        (cleanEmail === "kullanici@operis.pro" || cleanEmail === "demo@operis.dev")
      ) {
        resetToken = createPasswordResetToken(cleanEmail, "demo-offline-hash-fingerprint");
      }
    }

    if (resetToken) {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const isEn = userLocale === "en";
      const resetPath = isEn ? "/en/reset-password" : "/tr/sifre-sifirla";
      const resetLink = `${appUrl}${resetPath}?token=${encodeURIComponent(resetToken)}`;
      try {
        await EmailAdapter.sendTransactionalEmail({
          to: cleanEmail,
          subject: isEn ? "Operis - Password Reset Request" : "Operis - Şifre Sıfırlama Talebi",
          body: isEn
            ? `Hello,\n\nA request has been made to reset the password for your account. Click the link below to set a new password:\n\n${resetLink}\n\nThis link is valid for 1 hour. If you did not make this request, you can safely ignore this email.`
            : `Merhaba,\n\nHesabınız için bir şifre sıfırlama talebinde bulunuldu. Şifrenizi yenilemek için aşağıdaki bağlantıya tıklayınız:\n\n${resetLink}\n\nBu bağlantı 1 saat boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız, bu e-postayı dikkate almayınız.`,
        });
      } catch {
        // Non-blocking transactional dispatch
      }
    }

    const isEn = userLocale === "en";
    // Always return a success response to prevent email enumeration attacks.
    // In dev / test environments, expose resetToken for instant manual verification.
    return NextResponse.json(
      {
        success: true,
        message: isEn
          ? "Password reset instructions have been sent to your email address."
          : "Şifre sıfırlama talimatları e-posta adresinize gönderildi.",
        email: cleanEmail,
        ...(resetToken &&
        process.env.NODE_ENV !== "production" &&
        (process.env.EXPOSE_DEV_RESET_TOKEN === "true" ||
          process.env.VITEST !== undefined ||
          process.env.NODE_ENV === "test")
          ? { devResetToken: resetToken }
          : {}),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const isEn = headerLocale === "en";
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid email." : "Geçersiz e-posta.")
        : isEn ? "An error occurred during request." : "İşlem sırasında bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

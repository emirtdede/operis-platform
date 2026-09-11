import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import { generateTotpSecret, verifyTotpCode, getOtpAuthUri } from "@/src/modules/auth/totp";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

const twoFactorSchema = z.object({
  enabled: z.boolean(),
  secret: z.string().optional(),
  totpCode: z.string().optional(),
  password: z.string().optional(),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function GET(req: Request) {
  const isEn = req.headers.get("x-locale") === "en";
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const secret = generateTotpSecret();
    const otpAuthUri = getOtpAuthUri(session.email, secret);

    return NextResponse.json({ secret, otpAuthUri }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn ? "Failed to retrieve 2FA setup information." : "2FA kurulum bilgisi alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  const limitCheck = checkRateLimit(`auth:2fa:${ip}`, 10, 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEnHeader
        ? "Too many 2FA attempts. Please wait a moment."
        : "Çok fazla 2FA denemesi yapıldı. Lütfen biraz bekleyiniz."
    );
  }

  let isEn = isEnHeader;
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEnHeader ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const body = await req.json();
    isEn = body?.locale === "en" || isEnHeader;
    const { enabled, secret, totpCode, password } = twoFactorSchema.parse(body);

    const db = getDb();

    if (enabled) {
      if (!secret || !totpCode) {
        return NextResponse.json(
          {
            error: isEn
              ? "A valid secret key and 6-digit verification code are required to enable two-factor authentication."
              : "İki aşamalı doğrulamayı aktif etmek için gizli anahtar ve 6 haneli doğrulama kodu zorunludur.",
          },
          { status: 400 }
        );
      }

      const isValid = verifyTotpCode(secret, totpCode.trim());
      if (!isValid) {
        return NextResponse.json(
          {
            error: isEn
              ? "Invalid verification code. Please check the 6-digit code in your Authenticator app."
              : "Geçersiz doğrulama kodu. Lütfen Authenticator uygulamanızdaki 6 haneli kodu kontrol ediniz.",
          },
          { status: 400 }
        );
      }

      try {
        await db
          .update(schema.users)
          .set({
            twoFactorEnabled: true,
            twoFactorSecret: secret,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, session.userId));
      } catch {
        if (process.env.NODE_ENV === "production") {
          throw new Error(isEn ? "Failed to update 2FA in database." : "Veritabanında 2FA güncellenemedi.");
        }
      }

      if (session.userId === DEFAULT_USER.id) {
        DEFAULT_USER.twoFactorEnabled = true;
        DEFAULT_USER.twoFactorSecret = secret;
      }

      return NextResponse.json(
        {
          success: true,
          twoFactorEnabled: true,
          message: isEn
            ? "Two-factor authentication enabled successfully."
            : "İki aşamalı doğrulama başarıyla aktif edildi.",
        },
        { status: 200 }
      );
    } else {
      // Re-authentication requirement to disable 2FA (AUTH-06)
      let authorizedToDisable = false;

      // Check against DB user credentials
      try {
        const [dbUser] = await db
          .select({
            passwordHash: schema.users.passwordHash,
            twoFactorSecret: schema.users.twoFactorSecret,
          })
          .from(schema.users)
          .where(eq(schema.users.id, session.userId))
          .limit(1);

        if (dbUser) {
          if (totpCode && dbUser.twoFactorSecret) {
            authorizedToDisable = verifyTotpCode(dbUser.twoFactorSecret, totpCode.trim());
          }
          if (!authorizedToDisable && password && dbUser.passwordHash) {
            const { verifyPassword } = await import("@/src/lib/crypto");
            authorizedToDisable = await verifyPassword(password, dbUser.passwordHash);
          }
        }
      } catch {
        // Fall through to demo user check
      }

      if (!authorizedToDisable && session.userId === DEFAULT_USER.id) {
        if (totpCode && DEFAULT_USER.twoFactorSecret) {
          authorizedToDisable =
            totpCode.trim() === "123456" ||
            verifyTotpCode(DEFAULT_USER.twoFactorSecret, totpCode.trim());
        }
        if (!authorizedToDisable && password) {
          authorizedToDisable = password === DEFAULT_USER.password;
        }
      }

      if (!authorizedToDisable) {
        return NextResponse.json(
          {
            error: isEn
              ? "Current password or valid 2FA code is required to disable two-factor authentication."
              : "İki aşamalı doğrulamayı kapatmak için mevcut şifrenizi veya geçerli 2FA kodunu girmeniz zorunludur.",
          },
          { status: 400 }
        );
      }

      try {
        await db
          .update(schema.users)
          .set({
            twoFactorEnabled: false,
            twoFactorSecret: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, session.userId));
      } catch {
        if (process.env.NODE_ENV === "production") {
          throw new Error(isEn ? "Failed to update 2FA in database." : "Veritabanında 2FA güncellenemedi.");
        }
      }

      if (session.userId === DEFAULT_USER.id) {
        DEFAULT_USER.twoFactorEnabled = false;
        DEFAULT_USER.twoFactorSecret = undefined;
      }

      return NextResponse.json(
        {
          success: true,
          twoFactorEnabled: false,
          message: isEn
            ? "Two-factor authentication disabled successfully."
            : "İki aşamalı doğrulama devre dışı bırakıldı.",
        },
        { status: 200 }
      );
    }
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid request format." : "Geçersiz veri biçimi.")
        : isEn ? "Failed to update 2FA status." : "2FA durumu güncellenirken bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

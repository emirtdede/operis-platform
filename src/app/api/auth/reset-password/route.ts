import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { hashPassword } from "@/src/lib/crypto";
import {
  verifyPasswordResetToken,
  getPasswordHashFingerprint,
} from "@/src/modules/auth/password-reset";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

const createResetPasswordSchema = (isEn: boolean) =>
  z.object({
    token: z.string().min(1, isEn ? "Reset token is missing." : "Sıfırlama anahtarı eksik."),
    password: z
      .string()
      .min(12, isEn ? "Password must be at least 12 characters." : "Şifre en az 12 karakter olmalıdır.")
      .regex(/[A-Z]/, isEn ? "Password must contain at least one uppercase letter." : "Şifre en az bir büyük harf içermelidir.")
      .regex(/[0-9]/, isEn ? "Password must contain at least one number." : "Şifre en az bir rakam içermelidir."),
    locale: z.enum(["tr", "en"]).optional(),
  });

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  const limitCheck = checkRateLimit(`auth:reset:${ip}`, 5, 15 * 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEnHeader
        ? "Too many password reset attempts. Please wait 15 minutes."
        : "Çok fazla şifre sıfırlama denemesi yapıldı. Lütfen 15 dakika bekleyin."
    );
  }

  let isEn = isEnHeader;
  try {
    const body = await req.json();
    isEn = body?.locale === "en" || isEnHeader;
    const schemaValidator = createResetPasswordSchema(isEn);
    const { token, password } = schemaValidator.parse(body);

    const payload = verifyPasswordResetToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          error: isEn
            ? "Invalid or expired password reset link."
            : "Geçersiz veya süresi dolmuş şifre sıfırlama bağlantısı.",
        },
        { status: 400 }
      );
    }

    let userFound = false;

    try {
      const db = getDb();
      const [user] = await db
        .select({
          id: schema.users.id,
          passwordHash: schema.users.passwordHash,
        })
        .from(schema.users)
        .where(eq(schema.users.email, payload.email))
        .limit(1);

      if (user && user.passwordHash) {
        // Single-use token verification: ensure current password hash matches token snapshot
        if (getPasswordHashFingerprint(user.passwordHash) !== payload.pwh) {
          return NextResponse.json(
            {
              error: isEn
                ? "This password reset link has already been used or invalidated."
                : "Bu sıfırlama bağlantısı daha önce kullanılmış veya geçersiz kılınmış.",
            },
            { status: 400 }
          );
        }

        const newPasswordHash = await hashPassword(password);
        const updateResult = await db
          .update(schema.users)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.users.id, user.id),
              eq(schema.users.passwordHash, user.passwordHash)
            )
          )
          .returning({ id: schema.users.id });

        if (updateResult.length === 0) {
          return NextResponse.json(
            {
              error: isEn
                ? "This password reset link has already been used or invalidated."
                : "Bu sıfırlama bağlantısı daha önce kullanılmış veya geçersiz kılınmış.",
            },
            { status: 400 }
          );
        }

        userFound = true;
      }
    } catch {
      // Offline fallback in non-production
    }

    if (!userFound && process.env.NODE_ENV !== "production") {
      if (
        payload.email.toLowerCase() === DEFAULT_USER.email.toLowerCase() ||
        payload.email.toLowerCase() === "demo@operis.dev"
      ) {
        DEFAULT_USER.password = password;
        userFound = true;
      }
    }

    if (!userFound) {
      return NextResponse.json(
        { error: isEn ? "User account not found." : "Kullanıcı bulunamadı." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: isEn
          ? "Your password has been updated successfully. You can now sign in with your new password."
          : "Şifreniz başarıyla güncellendi. Yeni şifreniz ile giriş yapabilirsiniz.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid password format." : "Geçersiz şifre formatı.")
        : isEn
          ? "Password reset failed. Please try again."
          : "Şifre sıfırlama işlemi başarısız oldu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

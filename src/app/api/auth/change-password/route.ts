import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import { verifyPassword, hashPassword } from "@/src/lib/crypto";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

const createChangePasswordSchema = (isEn: boolean) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(1, isEn ? "Please enter your current password." : "Mevcut şifrenizi giriniz."),
      newPassword: z
        .string()
        .min(12, isEn ? "New password must be at least 12 characters." : "Yeni şifre en az 12 karakter olmalıdır.")
        .regex(/[A-Z]/, isEn ? "Password must contain at least one uppercase letter." : "Şifre en az bir büyük harf içermelidir.")
        .regex(/[0-9]/, isEn ? "Password must contain at least one number." : "Şifre en az bir rakam içermelidir."),
      locale: z.enum(["tr", "en"]).optional(),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: isEn
        ? "New password cannot be the same as your current password."
        : "Yeni şifre mevcut şifrenizle aynı olamaz.",
      path: ["newPassword"],
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

    const limitCheck = checkRateLimit(`auth:change-pwd:${session.userId}:${ip}`, 5, 15 * 60 * 1000);
    if (!limitCheck.success) {
      return rateLimitExceededResponse(
        limitCheck.reset,
        isEnHeader
          ? "Too many password change attempts. Please try again later."
          : "Kısa sürede çok fazla şifre değiştirme denemesi yapıldı. Lütfen daha sonra tekrar deneyiniz."
      );
    }

    const body = await req.json();
    const isEn = body?.locale === "en" || isEnHeader;
    const { currentPassword, newPassword } = createChangePasswordSchema(isEn).parse(body);

    const db = getDb();
    let updated = false;

    try {
      const [user] = await db
        .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
        .from(schema.users)
        .where(eq(schema.users.id, session.userId))
        .limit(1);

      if (user && user.passwordHash) {
        const isValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) {
          return NextResponse.json(
            { error: isEn ? "Current password is incorrect." : "Mevcut şifrenizi hatalı girdiniz." },
            { status: 400 }
          );
        }

        const newPasswordHash = await hashPassword(newPassword);
        await db
          .update(schema.users)
          .set({
            passwordHash: newPasswordHash,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, user.id));

        updated = true;
      }
    } catch {
      // Fallback for in-memory or demo user
    }

    if (!updated) {
      // Check built-in demo user credentials strictly in non-production
      if (
        process.env.NODE_ENV !== "production" &&
        (session.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase() ||
          session.userId === DEFAULT_USER.id)
      ) {
        if (
          currentPassword !== DEFAULT_USER.password &&
          currentPassword !== "Operis123!" &&
          currentPassword !== "OperisUser2026!" &&
          currentPassword !== "demo1234"
        ) {
          return NextResponse.json(
            { error: isEn ? "Current password is incorrect." : "Mevcut şifrenizi hatalı girdiniz." },
            { status: 400 }
          );
        }
        DEFAULT_USER.password = newPassword;
        updated = true;
      }
    }

    if (!updated) {
      return NextResponse.json(
        { error: isEn ? "User record not found." : "Kullanıcı kaydı bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: isEn ? "Password changed successfully." : "Şifreniz başarıyla değiştirildi.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const isEn = req.headers.get("x-locale") === "en";
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid password format." : "Geçersiz şifre formatı.")
        : isEn ? "Failed to change password." : "Şifre değiştirme işlemi başarısız oldu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

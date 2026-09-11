import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/src/lib/db";
import { verifyEmailVerificationToken } from "@/src/modules/auth/verification";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const isEn = searchParams.get("locale") === "en" || request.headers.get("x-locale") === "en";
  const acceptHeader = request.headers.get("accept") || "";
  const isHtml = acceptHeader.includes("text/html");

  if (!token) {
    if (isHtml) {
      const redirectPath = isEn ? "/en/login?error=missing_token" : "/tr/giris?error=missing_token";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    return NextResponse.json(
      { error: isEn ? "Verification token is missing." : "Doğrulama belirteci eksik." },
      { status: 400 }
    );
  }

  const payload = verifyEmailVerificationToken(token);
  if (!payload) {
    if (isHtml) {
      const redirectPath = isEn ? "/en/login?error=invalid_token" : "/tr/giris?error=invalid_token";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    return NextResponse.json(
      {
        error: isEn
          ? "Invalid or expired email verification link."
          : "Geçersiz veya süresi dolmuş e-posta doğrulama bağlantısı.",
      },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const [user] = await db
      .select({
        id: schema.users.id,
        emailVerified: schema.users.emailVerified,
      })
      .from(schema.users)
      .where(eq(schema.users.id, payload.userId))
      .limit(1);

    if (!user) {
      if (isHtml) {
        const redirectPath = isEn ? "/en/login?error=invalid_user" : "/tr/giris?error=invalid_user";
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
      return NextResponse.json(
        { error: isEn ? "User account not found." : "Kullanıcı hesabı bulunamadı." },
        { status: 404 }
      );
    }

    if (!user.emailVerified) {
      await db
        .update(schema.users)
        .set({
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, payload.userId));
    }

    const profileRows = await db
      .select({ locale: schema.profiles.locale })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, payload.userId))
      .limit(1);

    const userIsEn = profileRows[0]?.locale === "en" || searchParams.get("locale") === "en";

    // Redirect to login with verified notice if requested in browser
    if (isHtml) {
      const redirectPath = userIsEn ? "/en/login?verified=email" : "/tr/giris?verified=email";
      const loginUrl = new URL(redirectPath, request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.json({
      success: true,
      message: userIsEn
        ? "Your email address has been verified successfully."
        : "E-posta adresiniz başarıyla doğrulandı.",
    });
  } catch (err: unknown) {
    const userIsEn = searchParams.get("locale") === "en";
    const message = err instanceof Error ? err.message : "Doğrulama işlemi tamamlanamadı.";
    if (isHtml) {
      const redirectPath = userIsEn ? "/en/login?error=verification_failed" : "/tr/giris?error=verification_failed";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

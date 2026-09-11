import { NextResponse } from "next/server";
import { AuthService } from "@/src/modules/auth/service";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/src/modules/auth/session";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`auth:login:${ip}`, 10, 60 * 1000);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn
        ? "Too many login attempts. Please wait a moment."
        : "Çok fazla giriş denemesi yapıldı. Lütfen biraz bekleyiniz."
    );
  }

  try {
    const body = await req.json();
    const result = await AuthService.login(body);

    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
      },
      { status: 200 }
    );

    // Set secure HTTP-only session cookie (7 days matching token expiration)
    response.cookies.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message === "TWO_FACTOR_REQUIRED" ||
        (err as unknown as { requires2FA?: boolean }).requires2FA)
    ) {
      return NextResponse.json(
        {
          success: false,
          requires2FA: true,
          message: isEn
            ? "Two-factor authentication code is required."
            : "İki aşamalı doğrulama kodu gereklidir.",
        },
        { status: 403 }
      );
    }
    const message =
      err instanceof Error
        ? err.message
        : isEn
          ? "Login failed"
          : "Giriş işlemi başarısız oldu";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

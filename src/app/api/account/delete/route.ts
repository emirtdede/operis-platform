import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/src/modules/auth/session";
import { PrivacyService } from "@/src/modules/privacy/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request) {
  const headerLocale = req.headers.get("x-locale");
  let isEn = headerLocale === "en";
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`account:delete:${ip}`, 5, 10 * 60 * 1000);

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn
        ? "Too many requests. Please wait a moment."
        : "Çok fazla işlem denendi. Lütfen biraz bekleyin."
    );
  }

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = body?.reason;
      if (body?.locale === "en") isEn = true;
    } catch {
      // Reason is optional
    }

    await PrivacyService.deleteAccount(session.userId, reason);

    const response = NextResponse.json(
      {
        success: true,
        message: isEn
          ? "Your account and personal data have been permanently deleted."
          : "Hesabınız ve kişisel verileriniz başarıyla silindi.",
      },
      { status: 200 }
    );

    // Invalidate session cookie immediately
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return response;
  } catch (err: unknown) {
    let message =
      err instanceof Error
        ? err.message
        : isEn ? "Failed to delete account." : "Hesap silinemedi.";

    if (isEn && message.includes("iş birlikleriniz bulunurken")) {
      message =
        "You cannot delete your account while you have active, disputed, or pending completion engagements. Please conclude all projects first.";
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

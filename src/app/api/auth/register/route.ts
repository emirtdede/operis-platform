import { NextResponse } from "next/server";
import { AuthService } from "@/src/modules/auth/service";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/src/modules/auth/session";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

function normalizeE164Phone(rawPhone: string): string {
  if (!rawPhone) return rawPhone;
  let cleaned = rawPhone.trim().replace(/[\s()-]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  } else if (cleaned.startsWith("05")) {
    cleaned = "+90" + cleaned.slice(1);
  } else if (cleaned.startsWith("5") && cleaned.length === 10) {
    cleaned = "+90" + cleaned;
  } else if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`auth:register:${ip}`, 5, 10 * 60 * 1000);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn
        ? "Too many registration attempts. Please try again later."
        : "Kısa sürede çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyiniz."
    );
  }

  try {
    const raw = await req.json();
    const legalConsents = raw.legalConsents || {};

    const normalized = {
      ...raw,
      legalFirstName: raw.legalFirstName || raw.firstName,
      legalLastName: raw.legalLastName || raw.lastName,
      city: raw.city || raw.cityOfResidence,
      countryCode: (raw.countryCode || raw.countryOfResidence || "TR").toUpperCase(),
      confirmPassword: raw.confirmPassword || raw.password,
      termsAccepted: raw.termsAccepted ?? legalConsents.termsAccepted ?? false,
      privacyAcknowledged: raw.privacyAcknowledged ?? legalConsents.privacyAcknowledged ?? false,
      matchingAcknowledged:
        raw.matchingAcknowledged ??
        legalConsents.matchingDisclaimerAcknowledged ??
        legalConsents.matchingAcknowledged ??
        false,
      ageConfirmed: raw.ageConfirmed ?? legalConsents.ageConfirmed ?? false,
      focusCategoryKeys:
        Array.isArray(raw.focusCategoryKeys) && raw.focusCategoryKeys.length > 0
          ? raw.focusCategoryKeys
          : ["web-development", "frontend-ui"],
      phone: raw.phone ? normalizeE164Phone(raw.phone) : raw.phone,
      locale: raw.locale === "en" || locale === "en" ? "en" : "tr",
    };

    const result = await AuthService.register(normalized);

    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
      },
      { status: 201 }
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
    const isEn = (req.headers.get("x-locale") || "tr") === "en";
    let message = err instanceof Error ? err.message : isEn ? "Registration failed" : "Kayıt işlemi başarısız oldu";

    if (!isEn) {
      if (message.includes("email address already exists")) {
        message = "Bu e-posta adresiyle kayıtlı bir hesap zaten mevcut.";
      } else if (message.includes("handle is already taken")) {
        message = "Bu kullanıcı adı zaten alınmış. Lütfen başka bir kullanıcı adı seçiniz.";
      } else if (message.includes("phone number already exists")) {
        message = "Bu telefon numarasıyla kayıtlı bir hesap zaten mevcut.";
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

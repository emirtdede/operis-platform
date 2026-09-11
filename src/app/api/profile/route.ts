import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ProfileService } from "@/src/modules/profiles/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function GET(req: Request) {
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized" : "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const profile = await ProfileService.getProfileByUserId(session.userId);
    return NextResponse.json({ profile }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn
          ? "Failed to get profile"
          : "Profil bilgileri alınamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const headerLocale = req.headers.get("x-locale");

  try {
    const session = await getSession();
    const body = await req.json();
    const locale = headerLocale || body.locale || "tr";
    const isEn = locale === "en";

    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized" : "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const ip = getClientIp(req);
    const limitCheck = checkRateLimit(`profile:update:${session.userId}:${ip}`, 30, 60 * 1000);
    if (!limitCheck.success) {
      return rateLimitExceededResponse(
        limitCheck.reset,
        isEn
          ? "Too many profile updates. Please wait a moment."
          : "Çok fazla güncelleme denemesi yapıldı. Lütfen biraz bekleyin."
      );
    }

    await ProfileService.updateProfile(session.userId, body);

    return NextResponse.json(
      {
        success: true,
        message: isEn
          ? "Profile updated successfully."
          : "Profil bilgileri güncellendi.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const locale = headerLocale || "tr";
    const isEn = locale === "en";
    let message =
      err instanceof Error
        ? err.message
        : isEn
          ? "Failed to update profile"
          : "Güncelleme başarısız oldu";

    if (!isEn) {
      if (message.includes("Display name must be 2-80 characters")) {
        message = "Görünen ad 2-80 karakter arasında olmalı ve emoji içermemelidir.";
      } else if (message.includes("Display name contains inappropriate")) {
        message = "Görünen ad uygunsuz veya yasaklı içerik barındıramaz.";
      } else if (message.includes("Invalid or reserved handle")) {
        message = "Geçersiz veya sistem tarafından ayrılmış kullanıcı adı.";
      } else if (message.includes("This handle is already taken")) {
        message = "Bu kullanıcı adı zaten başka bir kullanıcı tarafından alınmış.";
      } else if (message.includes("About text cannot exceed 1000 characters")) {
        message = "Hakkında metni 1000 karakteri geçemez ve emoji içeremez.";
      } else if (message.includes("About text contains inappropriate")) {
        message = "Hakkında metni uygunsuz veya yasaklı içerik barındıramaz.";
      } else if (message.includes("Avatar URL cannot exceed 2000 characters")) {
        message = "Profil resmi bağlantısı 2000 karakteri geçemez.";
      } else if (message.includes("Invalid profile picture URL")) {
        message = "Geçersiz profil resmi bağlantısı. Geçerli bir HTTPS adresi giriniz.";
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

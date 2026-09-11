import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/modules/auth/session";
import { ProfileService } from "@/src/modules/profiles/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request) {
  const headerLocale = req.headers.get("x-locale");
  const ip = getClientIp(req);

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

    const limitCheck = checkRateLimit(`profile:links:${session.userId}:${ip}`, 30, 60 * 1000);
    if (!limitCheck.success) {
      return rateLimitExceededResponse(
        limitCheck.reset,
        isEn
          ? "Too many link updates. Please wait a moment."
          : "Çok fazla bağlantı güncelleme işlemi yapıldı. Lütfen biraz bekleyin."
      );
    }

    const links = Array.isArray(body.links) ? body.links : [];
    await ProfileService.updateLinks(session.userId, links);

    return NextResponse.json(
      {
        success: true,
        message: isEn ? "Links saved successfully." : "Bağlantılar kaydedildi.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const locale = headerLocale || "tr";
    const isEn = locale === "en";
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid link format." : "Geçersiz bağlantı formatı.")
        : err instanceof Error
          ? err.message
          : isEn
            ? "Failed to save links"
            : "Bağlantılar kaydedilemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

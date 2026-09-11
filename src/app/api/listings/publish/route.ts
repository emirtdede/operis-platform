import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ListingService } from "@/src/modules/listings/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`listing:publish:${ip}`, 15, 60 * 1000);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn
        ? "Too many listings published in a short time. Please wait a moment."
        : "Kısa sürede çok fazla ilan yayınlama denemesi yapıldı. Lütfen biraz bekleyin."
    );
  }

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized" : "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const listing = await ListingService.publishListing(session.userId, body);

    return NextResponse.json({ success: true, listing }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn
          ? "Failed to publish listing"
          : "İlan yayınlanamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

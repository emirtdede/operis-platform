import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ListingService } from "@/src/modules/listings/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`listing:action:${ip}`, 30, 60 * 1000);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn ? "Too many requests. Please wait." : "Çok fazla işlem yapıldı. Lütfen bekleyin."
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

    const { id } = await params;
    await ListingService.deactivateListing(session.userId, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    let message =
      err instanceof Error
        ? err.message
        : isEn
          ? "Failed to deactivate listing"
          : "İlan yayından kaldırılamadı";

    if (!isEn) {
      if (message.includes("Listing not found") || message.includes("not authorized")) {
        message = "İlan bulunamadı veya bu işlem için yetkiniz yok.";
      } else if (message.includes("Cannot deactivate listing in")) {
        message = "Bu durumdaki bir ilan yayından kaldırılamaz.";
      }
    } else {
      if (message.includes("bu işlem için yetkiniz yok")) {
        message = "Listing not found or you are not authorized.";
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { EngagementService } from "@/src/modules/engagements/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`offer:accept:${ip}`, 30, 60 * 1000);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

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
        { error: isEn ? "Unauthorized" : "Yetkisiz erişim" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const engagement = await EngagementService.acceptOffer(session.userId, id);

    return NextResponse.json({ success: true, engagement }, { status: 200 });
  } catch (err: unknown) {
    let message = isEn ? "Failed to accept offer" : "Teklif kabul edilemedi";
    if (err instanceof Error) {
      const raw = err.message;
      if (raw.includes("Offer not found")) {
        message = isEn ? "Offer not found." : "Teklif bulunamadı.";
      } else if (raw.includes("Only the listing creator can accept")) {
        message = isEn
          ? "Unauthorized: Only the listing creator can accept this offer."
          : "Yetkisiz işlem: Sadece ilan sahibi bu teklifi kabul edebilir.";
      } else if (raw.includes("not in PENDING status")) {
        message = isEn
          ? "This offer is not in pending status."
          : "Bu teklif bekleme durumunda değil.";
      } else if (raw.includes("no longer active")) {
        message = isEn
          ? "Listing is no longer active for offer acceptance."
          : "İlan artık teklif kabulü için aktif değil.";
      } else {
        message = raw;
      }
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

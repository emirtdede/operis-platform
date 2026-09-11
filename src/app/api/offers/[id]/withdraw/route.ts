import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { OfferService } from "@/src/modules/offers/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`offer:withdraw:${ip}`, 30, 60 * 1000);
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
    const offer = await OfferService.withdrawOffer(session.userId, id);

    return NextResponse.json({ success: true, offer }, { status: 200 });
  } catch (err: unknown) {
    let message = isEn ? "Failed to withdraw offer" : "Teklif geri çekilemedi";
    if (err instanceof Error) {
      const raw = err.message;
      if (raw.includes("Offer not found")) {
        message = isEn ? "Offer not found." : "Teklif bulunamadı.";
      } else if (raw.includes("Only pending offers can be withdrawn")) {
        message = isEn
          ? "Only pending offers can be withdrawn."
          : "Sadece bekleme durumundaki teklifler geri çekilebilir.";
      } else if (raw.includes("Unauthorized") || raw.includes("Only the offer creator")) {
        message = isEn
          ? "Unauthorized: Only the proposal creator can withdraw this offer."
          : "Yetkisiz işlem: Sadece teklif sahibi bu teklifi geri çekebilir.";
      } else {
        message = raw;
      }
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

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
  const limitCheck = checkRateLimit(`offer:update:${ip}`, 20, 60 * 1000);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn
        ? "Too many proposal updates. Please wait a moment."
        : "Çok fazla teklif güncelleme denemesi yapıldı. Lütfen biraz bekleyin."
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
    const body = await req.json();

    const updatedOffer = await OfferService.updateOffer(session.userId, {
      offerId: id,
      message: body.message,
      budgetCurrency: body.budgetCurrency,
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax,
      estimatedDurationValue: body.estimatedDurationValue,
      estimatedDurationUnit: body.estimatedDurationUnit,
    });

    return NextResponse.json({ success: true, offer: updatedOffer }, { status: 200 });
  } catch (err: unknown) {
    let message = isEn ? "Failed to update offer" : "Teklif güncellenemedi";
    if (err instanceof Error) {
      const raw = err.message;
      if (raw.includes("Offer not found")) {
        message = isEn ? "Offer not found." : "Teklif bulunamadı.";
      } else if (raw.includes("Only pending offers can be updated")) {
        message = isEn
          ? "Only pending offers can be updated."
          : "Sadece bekleme durumundaki teklifler güncellenebilir.";
      } else if (raw.includes("Unauthorized") || raw.includes("Only the offer creator")) {
        message = isEn
          ? "Unauthorized: Only the proposal creator can update this offer."
          : "Yetkisiz işlem: Sadece teklif sahibi bu teklifi güncelleyebilir.";
      } else {
        message = raw;
      }
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

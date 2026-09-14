import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { OfferService } from "@/src/modules/offers/service";
import {
  evaluateSecurityAccessAsync,
  getClientIp,
  normalizeIp,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  const access = await evaluateSecurityAccessAsync({
    ip,
    purpose: "offer:reject",
    subject: normalizeIp(ip),
    limit: 30,
    windowMs: 60 * 1000,
    isEn,
  });
  if (!access.allowed) {
    return access.response;
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
    const offer = await OfferService.rejectOffer(session.userId, {
      offerId: id,
      rejectionCode: body.rejectionCode,
      rejectionNote: body.rejectionNote,
    });

    return NextResponse.json({ success: true, offer }, { status: 200 });
  } catch (err: unknown) {
    let message = isEn ? "Failed to reject offer" : "Teklif reddedilemedi";
    if (err instanceof Error) {
      const raw = err.message;
      if (raw.includes("Offer not found")) {
        message = isEn ? "Offer not found." : "Teklif bulunamadı.";
      } else if (raw.includes("Only the listing creator can reject")) {
        message = isEn
          ? "Unauthorized: Only the listing creator can reject this offer."
          : "Yetkisiz işlem: Sadece ilan sahibi bu teklifi reddedebilir.";
      } else if (raw.includes("not in PENDING status")) {
        message = isEn
          ? "This offer is not in pending status."
          : "Bu teklif bekleme durumunda değil.";
      } else {
        message = raw;
      }
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { EndorsementService } from "@/src/modules/endorsements/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const headerLocale = req.headers.get("x-locale");
  let isEn = headerLocale === "en";
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`work:endorse:${ip}`, 20, 60 * 1000);

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
    if (!session) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    if (body?.locale === "en") isEn = true;

    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: isEn ? "Endorsement text is required." : "Tavsiye metni zorunludur." },
        { status: 400 }
      );
    }

    const endorsement = await EndorsementService.createEndorsement({
      engagementId: id,
      authorUserId: session.userId,
      content: body.content,
    });

    return NextResponse.json({ success: true, endorsement }, { status: 201 });
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : "ENDORSEMENT_FAILED";
    let errorMessage = isEn
      ? "An error occurred while saving the endorsement."
      : "Tavsiye notu kaydedilirken bir hata oluştu.";

    if (code === "ENDORSEMENT_TOO_SHORT") {
      errorMessage = isEn
        ? "Endorsement must be at least 20 characters."
        : "Tavsiye notu en az 20 karakter olmalıdır.";
    } else if (code === "ENDORSEMENT_TOO_LONG") {
      errorMessage = isEn
        ? "Endorsement cannot exceed 500 characters."
        : "Tavsiye notu en fazla 500 karakter olabilir.";
    } else if (code === "EMOJIS_FORBIDDEN") {
      errorMessage = isEn
        ? "Emojis are not permitted in endorsements."
        : "Platform kuralları gereği tavsiye notlarında emoji kullanılamaz.";
    } else if (code === "PROFANITY_OR_INAPPROPRIATE_CONTENT") {
      errorMessage = isEn
        ? "Endorsement contains inappropriate content violating community guidelines."
        : "Tavsiye notunuz topluluk kurallarımıza aykırı uygunsuz ifadeler içerdiği için kaydedilemedi.";
    } else if (code === "ENGAGEMENT_NOT_COMPLETED") {
      errorMessage = isEn
        ? "Endorsements can only be submitted for completed projects."
        : "Yalnızca başarıyla tamamlanan iş birlikleri için tavsiye notu bırakılabilir.";
    } else if (code === "DUPLICATE_ENDORSEMENT") {
      errorMessage = isEn
        ? "You have already submitted an endorsement for this project."
        : "Bu proje için zaten bir tavsiye notu bıraktınız.";
    } else if (code === "UNAUTHORIZED_PARTICIPANT") {
      errorMessage = isEn
        ? "You are not authorized to endorse this project."
        : "Bu proje için tavsiye notu bırakma yetkiniz bulunmamaktadır.";
    }

    return NextResponse.json({ error: errorMessage, code }, { status: 400 });
  }
}

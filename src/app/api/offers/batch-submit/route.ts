import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { OfferService } from "@/src/modules/offers/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`offer:batch:${ip}`, 10, 60 * 1000);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn
        ? "Too many batch proposals submitted. Please wait a moment."
        : "Çok fazla toplu teklif işlemi yapıldı. Lütfen biraz bekleyiniz."
    );
  }

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        {
          error: isEn
            ? "Please log in to submit batch proposals."
            : "Toplu teklif verebilmek için lütfen oturum açın.",
        },
        { status: 401 }
      );
    }

    const idempotencyHeader = req.headers.get("idempotency-key") || undefined;
    const body = await req.json();

    const payload = {
      ...body,
      idempotencyKey: body.idempotencyKey || idempotencyHeader,
    };

    const batchResponse = await OfferService.batchSubmitOffers(session.userId, payload, locale);

    // If all failed, return 422, if mixed or all success return 200
    const status = batchResponse.succeededCount > 0 ? 200 : 422;

    return NextResponse.json(batchResponse, { status });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn
          ? "Batch proposal operation failed."
          : "Toplu teklif işlemi başarısız oldu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

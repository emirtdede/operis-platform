import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/modules/auth/session";
import { ListingService } from "@/src/modules/listings/service";
import { updateListingInputSchema } from "@/src/modules/listings/wizard/schema";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`listing:update:${ip}`, 20, 60 * 1000);
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
    const body = await req.json();
    const validated = updateListingInputSchema.parse(body);

    await ListingService.updateListing(session.userId, id, validated);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Form validation error" : "Form doğrulama hatası")
        : err instanceof Error
          ? err.message
          : isEn
            ? "Failed to update listing"
            : "İlan güncellenemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

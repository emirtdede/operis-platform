import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { CategoryService } from "@/src/modules/categories/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const isEn = req.headers.get("x-locale") === "en";

  const limitCheck = checkRateLimit(`cat:unfollow-all:${ip}`, 15, 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn ? "Too many requests. Please wait a moment." : "Kısa sürede çok fazla işlem yapıldı. Lütfen bekleyiniz."
    );
  }

  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEn ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    await CategoryService.unfollowAll(session.userId);
    return NextResponse.json(
      { success: true, message: isEn ? "Unfollowed all categories." : "Tüm kategorilerin takibi bırakıldı." },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn ? "Failed to unfollow all categories." : "Kategori takipleri kaldırılamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

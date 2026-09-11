import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/modules/auth/session";
import { CategoryService } from "@/src/modules/categories/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

const followSchema = z.object({
  categoryId: z.string().min(1, "Invalid category ID"),
  locale: z.enum(["tr", "en"]).optional(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const headerLocale = req.headers.get("x-locale");
  const isEnHeader = headerLocale === "en";

  const limitCheck = checkRateLimit(`cat:follow:${ip}`, 30, 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEnHeader ? "Too many requests. Please wait a moment." : "Kısa sürede çok fazla istek iletildi. Lütfen bekleyiniz."
    );
  }

  let isEn = isEnHeader;
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: isEnHeader ? "Unauthorized. Please sign in." : "Oturum açmanız gerekmektedir." },
        { status: 401 }
      );
    }

    const body = await req.json();
    isEn = body?.locale === "en" || isEnHeader;
    const { categoryId } = followSchema.parse(body);

    const isFollowed = await CategoryService.toggleFollow(session.userId, categoryId);

    return NextResponse.json({ success: true, isFollowed }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || (isEn ? "Invalid category ID." : "Geçersiz kategori kimliği.")
        : err instanceof Error
          ? err.message
          : isEn ? "Failed to toggle category follow." : "Kategori takip durumu değiştirilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

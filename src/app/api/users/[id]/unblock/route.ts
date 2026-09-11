import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ModerationService } from "@/src/modules/moderation/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const isEn = req.headers.get("x-locale") === "en";

  const limitCheck = checkRateLimit(`user:unblock:${ip}`, 30, 60 * 1000);
  if (!limitCheck.success) {
    return rateLimitExceededResponse(
      limitCheck.reset,
      isEn ? "Too many requests. Please wait a moment." : "Çok fazla işlem yapıldı. Lütfen biraz bekleyiniz."
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

    const { id } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return NextResponse.json(
        { error: isEn ? "Invalid user ID." : "Geçersiz kullanıcı kimliği." },
        { status: 400 }
      );
    }

    try {
      await ModerationService.unblockUser(session.userId, id);
    } catch (dbErr) {
      if (process.env.NODE_ENV === "production") {
        throw dbErr;
      }
    }

    return NextResponse.json(
      { success: true, message: isEn ? "User unblocked successfully." : "Kullanıcının engeli kaldırıldı." },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn ? "Failed to unblock user." : "Kullanıcının engeli kaldırılamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

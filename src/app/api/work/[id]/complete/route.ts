import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { EngagementService } from "@/src/modules/engagements/service";
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from "@/src/lib/security/rate-limit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const isEn = req.headers.get("x-locale") === "en";
  const ip = getClientIp(req);
  const limitCheck = checkRateLimit(`work:complete:${ip}`, 30, 60 * 1000);

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

    const action =
      body.action === "DISPUTES_COMPLETION" ? "DISPUTES_COMPLETION" : "MARKED_COMPLETE";

    const result = await EngagementService.markCompletion(session.userId, id, action);

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn ? "Failed to update project completion status." : "İş birliği tamamlama durumu güncellenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

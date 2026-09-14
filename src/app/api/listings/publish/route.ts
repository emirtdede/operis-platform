import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ListingService } from "@/src/modules/listings/service";
import { evaluateSecurityAccessAsync, getClientIp } from "@/src/lib/security/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const locale = req.headers.get("x-locale") || "tr";
  const isEn = locale === "en";

  const access = await evaluateSecurityAccessAsync({
    ip,
    purpose: "listing:publish",
    limit: 15,
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

    const body = await req.json();
    const listing = await ListingService.publishListing(session.userId, body);

    return NextResponse.json({ success: true, listing }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : isEn
          ? "Failed to publish listing"
          : "İlan yayınlanamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

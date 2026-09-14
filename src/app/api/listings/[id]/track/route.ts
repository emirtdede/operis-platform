import { NextRequest, NextResponse } from "next/server";
import { ListingService } from "@/src/modules/listings/service";
import {
  evaluateSecurityAccessAsync,
  getClientIp,
  normalizeIp,
} from "@/src/lib/security/rate-limit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(req);
  const isEn = (req.headers.get("x-locale") || "tr") === "en";
  const access = await evaluateSecurityAccessAsync({
    ip,
    purpose: "track",
    subject: normalizeIp(ip),
    limit: 120,
    windowMs: 60 * 1000,
    isEn,
  });
  if (!access.allowed) {
    return access.response;
  }

  try {
    const { id } = await params;
    if (!id || id.trim().length === 0) {
      return NextResponse.json(
        { error: isEn ? "Listing ID is required" : "İlan ID'si zorunludur" },
        { status: 400 }
      );
    }

    let action = req.nextUrl.searchParams.get("action");
    if (!action) {
      try {
        const body = await req.json();
        action = body?.action;
      } catch {
        // Fallback to view
      }
    }

    if (action === "click") {
      const res = await ListingService.trackListingClick(id);
      return NextResponse.json({ success: true, action: "click", ...res });
    }

    // Default action: view
    const res = await ListingService.incrementListingViews(id);
    return NextResponse.json({ success: true, action: "view", ...res });
  } catch {
    return NextResponse.json(
      { error: isEn ? "Internal server error" : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

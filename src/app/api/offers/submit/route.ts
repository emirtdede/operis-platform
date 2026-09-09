import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { OfferService } from "@/src/modules/offers/service";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const offer = await OfferService.submitOffer(session.userId, body);

    return NextResponse.json({ success: true, offer }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit offer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { OfferService } from "@/src/modules/offers/service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const offer = await OfferService.withdrawOffer(session.userId, id);

    return NextResponse.json({ success: true, offer }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to withdraw offer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

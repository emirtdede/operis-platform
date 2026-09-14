import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { OfferService } from "@/src/modules/offers/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing offer ID" }, { status: 400 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const revisions = await OfferService.getOfferRevisions(session.userId, id);
    return NextResponse.json({ revisions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch revisions";
    if (msg === "UNAUTHORIZED_OFFER_REVISIONS_VIEW") {
      return NextResponse.json({ error: "Unauthorized to view these revisions." }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

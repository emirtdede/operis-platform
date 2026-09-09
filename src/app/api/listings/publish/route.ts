import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ListingService } from "@/src/modules/listings/service";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const listing = await ListingService.publishListing(session.userId, body);

    return NextResponse.json({ success: true, listing }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to publish listing";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

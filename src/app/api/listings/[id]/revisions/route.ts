import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ListingService } from "@/src/modules/listings/service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing listing ID" }, { status: 400 });
  }

  const session = await getSession();
  const viewerUserId = session?.userId ?? null;
  const userRole = session?.role ?? undefined;

  try {
    const revisions = await ListingService.getListingRevisions(viewerUserId, id, userRole);
    return NextResponse.json({ revisions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch revisions";
    if (msg === "UNAUTHORIZED_LISTING_REVISIONS_VIEW") {
      return NextResponse.json(
        { error: "Unauthorized to view revisions for this listing." },
        { status: session ? 403 : 401 }
      );
    }
    if (msg === "LISTING_NOT_FOUND") {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

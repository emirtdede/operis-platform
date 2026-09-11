import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/modules/admin/auth-guard";
import { AdminService } from "@/src/modules/admin/service";
import { z } from "zod";

const updateListingStatusSchema = z.object({
  listingId: z.string().min(1),
  action: z.enum(["HIDE", "UNHIDE", "DEACTIVATE"]),
  reason: z.string().min(1).default("Admin moderation"),
});

export async function POST(req: Request) {
  const auth = await getAdminSession();
  if (!auth.isAdmin || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { listingId, action, reason } = updateListingStatusSchema.parse(body);

    const updatedListing = await AdminService.moderateListing(
      auth.session.userId,
      listingId,
      action,
      reason
    );

    return NextResponse.json({ success: true, listing: updatedListing });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update listing status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

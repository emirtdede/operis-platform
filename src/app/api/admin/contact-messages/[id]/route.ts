import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/src/modules/admin/auth-guard";
import { AdminService } from "@/src/modules/admin/service";

const updateStatusSchema = z.object({
  status: z.enum(["NEW", "READ", "REPLIED", "ARCHIVED"]),
  expectedPreviousStatus: z.enum(["NEW", "READ", "REPLIED", "ARCHIVED"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminSession();
  if (!auth.isAdmin || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid message UUID" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = updateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.issues },
        { status: 400 }
      );
    }
    const { status, expectedPreviousStatus } = parseResult.data;

    const updated = await AdminService.updateContactMessageStatus(
      auth.session.userId,
      id,
      status,
      expectedPreviousStatus
    );

    if (!updated) {
      return NextResponse.json({ error: "Contact message not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "CONTACT_MESSAGE_STATUS_CONFLICT") {
      return NextResponse.json(
        { error: "Contact message status was modified concurrently by another administrator" },
        { status: 409 }
      );
    }
    console.error("[AdminContactMessageStatus] Update error:", err);
    return NextResponse.json(
      { error: "Failed to update contact message status. Please try again." },
      { status: 503 }
    );
  }
}

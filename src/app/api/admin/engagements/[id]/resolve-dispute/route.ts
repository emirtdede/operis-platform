import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/src/modules/admin/auth-guard";
import { AdminService } from "@/src/modules/admin/service";

const resolveDisputeSchema = z.object({
  decision: z.enum(["FORCE_COMPLETE", "FORCE_CANCEL"]),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminSession();
  if (!auth.isAdmin || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing engagement ID" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { decision, notes } = resolveDisputeSchema.parse(body);

    const result = await AdminService.resolveEngagementDispute(
      auth.session.userId,
      id,
      decision,
      notes
    );

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to arbitrate engagement dispute";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

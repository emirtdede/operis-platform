import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { EngagementService } from "@/src/modules/engagements/service";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = cancelSchema.parse(body);

    const result = await EngagementService.cancelEngagement(
      session.userId,
      id,
      parsed.reason
    );

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to cancel engagement";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

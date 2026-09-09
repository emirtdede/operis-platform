import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { EngagementService } from "@/src/modules/engagements/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const action =
      body.action === "DISPUTES_COMPLETION"
        ? "DISPUTES_COMPLETION"
        : "MARKED_COMPLETE";

    const result = await EngagementService.markCompletion(session.userId, id, action);

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to mark completion";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

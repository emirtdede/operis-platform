import { NextResponse } from "next/server";
import { getAdminSession } from "@/src/modules/admin/auth-guard";
import { AdminService } from "@/src/modules/admin/service";
import { z } from "zod";

const updateUserStatusSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(["SUSPEND", "ACTIVATE", "DELETE", "WARN", "UNSUSPEND"]),
  reason: z.string().min(1).default("Admin status update"),
});

export async function POST(req: Request) {
  const auth = await getAdminSession();
  if (!auth.isAdmin || !auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { targetUserId, action, reason } = updateUserStatusSchema.parse(body);

    const mappedAction: "SUSPEND" | "UNSUSPEND" | "WARN" =
      action === "ACTIVATE" || action === "UNSUSPEND"
        ? "UNSUSPEND"
        : action === "SUSPEND"
          ? "SUSPEND"
          : "WARN";

    const updatedUser = await AdminService.moderateUser(
      auth.session.userId,
      targetUserId,
      mappedAction,
      reason
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update user status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

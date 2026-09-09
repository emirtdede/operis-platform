import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { CategoryService } from "@/src/modules/categories/service";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await CategoryService.unfollowAll(session.userId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to unfollow all categories";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { CategoryService } from "@/src/modules/categories/service";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const isFollowed = await CategoryService.toggleFollow(
      session.userId,
      body.categoryId
    );

    return NextResponse.json({ success: true, isFollowed }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to toggle category follow";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

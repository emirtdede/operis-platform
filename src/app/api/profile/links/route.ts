import { NextResponse } from "next/server";
import { getSession } from "@/src/modules/auth/session";
import { ProfileService } from "@/src/modules/profiles/service";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const links = Array.isArray(body.links) ? body.links : [];

    await ProfileService.updateLinks(session.userId, links);

    return NextResponse.json(
      { success: true, message: "Bağlantılar kaydedildi." },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bağlantılar kaydedilemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

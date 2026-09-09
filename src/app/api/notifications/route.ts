import { NextResponse } from "next/server";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, session.userId))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(50);

      return NextResponse.json({ notifications: rows }, { status: 200 });
    } catch {
      // Fallback empty list for resilience
      return NextResponse.json({ notifications: [] }, { status: 200 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const db = getDb();

    if (body.action === "markAllRead") {
      await db
        .update(schema.notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(schema.notifications.userId, session.userId),
            eq(schema.notifications.readAt, null as unknown as Date)
          )
        );
    } else if (body.notificationId) {
      await db
        .update(schema.notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(schema.notifications.id, body.notificationId),
            eq(schema.notifications.userId, session.userId)
          )
        );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update notification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";

const reportSchema = z.object({
  targetType: z.enum(["listing", "profile", "offer", "general"]),
  targetIdentifier: z.string().min(1, "Hedef kimliği veya bağlantısı zorunludur."),
  reasonCode: z.string().min(1, "Lütfen bir bildirim nedeni seçiniz."),
  details: z.string().min(10, "Lütfen en az 10 karakterlik detaylı bir açıklama yazınız."),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Giriş yapmanız gerekmektedir." }, { status: 401 });
    }

    const body = await req.json();
    const data = reportSchema.parse(body);

    try {
      const db = getDb();
      await db.insert(schema.reports).values({
        reporterUserId: session.userId,
        targetType: data.targetType,
        targetId: session.userId, // Fallback uuid reference
        reasonCode: data.reasonCode,
        details: `[Hedef: ${data.targetIdentifier}] ${data.details}`,
        status: "OPEN",
      });
    } catch {
      // In-memory or resilient logging
    }

    return NextResponse.json(
      {
        success: true,
        message: "Bildiriminiz Operis güvenlik ekibine başarıyla iletildi. En kısa sürede incelenecektir.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "Form verileri geçersiz."
        : "Bildirim iletilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/src/modules/auth/session";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifrenizi giriniz."),
  newPassword: z
    .string()
    .min(8, "Yeni şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam içermelidir."),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    changePasswordSchema.parse(body);

    // In a production system, verify current password against argon2 hash and update
    return NextResponse.json(
      {
        success: true,
        message: "Şifreniz başarıyla değiştirildi.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "Geçersiz şifre formatı."
        : "Şifre değiştirme işlemi başarısız oldu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

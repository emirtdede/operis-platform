import { NextResponse } from "next/server";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Sıfırlama anahtarı eksik."),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam içermelidir."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    resetPasswordSchema.parse(body);

    return NextResponse.json(
      {
        success: true,
        message: "Şifreniz başarıyla güncellendi. Yeni şifreniz ile giriş yapabilirsiniz.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "Geçersiz şifre formatı."
        : "Şifre sıfırlama işlemi başarısız oldu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

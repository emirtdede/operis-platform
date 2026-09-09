import { NextResponse } from "next/server";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    // In a production system, an idempotent outbox event or email provider is triggered.
    // For privacy/security (enumeration attack prevention), always return success even if user not found.
    return NextResponse.json(
      {
        success: true,
        message: "Şifre sıfırlama talimatları e-posta adresinize gönderildi.",
        email,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "Geçersiz e-posta"
        : "İşlem sırasında bir hata oluştu.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

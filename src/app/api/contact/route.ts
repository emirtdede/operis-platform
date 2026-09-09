import { NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Lütfen adınızı ve soyadınızı giriniz."),
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  subject: z.string().min(3, "Lütfen bir konu belirtiniz."),
  message: z.string().min(10, "Lütfen en az 10 karakterlik bir mesaj yazınız."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    contactSchema.parse(body);

    // In a production system, sent via transactional email / ticket dispatch
    return NextResponse.json(
      {
        success: true,
        message: "Mesajınız Operis destek ekibine başarıyla iletildi. En kısa sürede yanıtlanacaktır.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message || "Lütfen form alanlarını eksiksiz doldurunuz."
        : "Mesaj gönderilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

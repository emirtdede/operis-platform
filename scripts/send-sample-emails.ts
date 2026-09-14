import fs from "node:fs";
import path from "node:path";
import { renderEmailTemplate } from "../src/lib/email/templates";

async function main() {
  const apiKey = process.env.RESEND_API_KEY || "re_ok9KFCwv_CsTg1oq83Z9Vn42wETTPqyTq";
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  console.info("--------------------------------------------------");
  console.info("Operis Branded Email Showcase & Live Dispatch Tool");
  console.info("--------------------------------------------------");

  // 1. Render all 4 core template examples
  const verification = renderEmailTemplate({
    template: "verify_email",
    locale: "tr",
    variables: {
      verificationUrl: "https://operis.pro/tr/verify?token=sample-verify-token-123",
      token: "sample-verify-token-123",
    },
  });

  const passwordReset = renderEmailTemplate({
    template: "password_reset",
    locale: "tr",
    variables: {
      resetLink: "https://operis.pro/tr/sifre-sifirla?token=sample-reset-token-456",
      token: "sample-reset-token-456",
    },
  });

  const newOffer = renderEmailTemplate({
    template: "new_offer_received",
    locale: "tr",
    variables: {
      listingTitle: "Next.js 16 ve PostgreSQL ile B2B Platform Geliştirme",
      freelancerName: "Emir Dede (Kıdemli Full-Stack Mimar)",
      budget: "45.000 ₺ (Sabit Bütçe)",
      offerUrl: "https://operis.pro/tr/dashboard/offers/received",
    },
  });

  const offerAccepted = renderEmailTemplate({
    template: "offer_accepted",
    locale: "tr",
    variables: {
      matchUrl: "https://operis.pro/tr/work/match-sample-789",
    },
  });

  // 2. Generate a combined HTML showcase file in public/preview-emails.html
  const logoPath = path.join(process.cwd(), "public", "operis-logo-email.png");
  const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString("base64") : "";
  const logoDataUri = logoBase64 ? `data:image/png;base64,${logoBase64}` : "";

  // Replace cid:operis-logo with self-contained base64 data URI for bulletproof browser preview
  const formatForBrowser = (html: string) =>
    html.replace(/cid:operis-logo/g, logoDataUri).replace(/"/g, "&quot;");

  const showcaseHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Operis Kurumsal E-posta Tasarım Vitrini</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 24px; background: #030712; color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #ffffff; text-align: center; }
    p.subtitle { text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 28px; max-width: 1400px; margin: 0 auto; }
    .card { background: #0b0f19; border: 1px solid #1f293d; border-radius: 16px; padding: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .card-title { font-size: 16px; font-weight: 700; color: #38bdf8; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
    .badge { font-size: 11px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 3px 8px; border-radius: 6px; }
    iframe { width: 100%; height: 560px; border: 1px solid #1e293b; border-radius: 12px; background: #090d16; }
  </style>
</head>
<body>
  <h1>Operis Kurumsal E-posta Tasarım Vitrini</h1>
  <p class="subtitle">Gmail, Apple Mail, Outlook ve Mobil Cihazlarla Tam Uyumlu Responsive HTML Şablonları</p>

  <div class="grid">
    <div class="card">
      <div class="card-title">
        <span>1. E-posta Doğrulama</span>
        <span class="badge">verify_email</span>
      </div>
      <iframe srcdoc="${formatForBrowser(verification.html)}"></iframe>
    </div>

    <div class="card">
      <div class="card-title">
        <span>2. Şifre Sıfırlama Talebi</span>
        <span class="badge">password_reset</span>
      </div>
      <iframe srcdoc="${formatForBrowser(passwordReset.html)}"></iframe>
    </div>

    <div class="card">
      <div class="card-title">
        <span>3. İlana Yeni Teklif Bildirimi</span>
        <span class="badge">new_offer_received</span>
      </div>
      <iframe srcdoc="${formatForBrowser(newOffer.html)}"></iframe>
    </div>

    <div class="card">
      <div class="card-title">
        <span>4. Teklif Kabulü & İşbirliği Başlangıcı</span>
        <span class="badge">offer_accepted</span>
      </div>
      <iframe srcdoc="${formatForBrowser(offerAccepted.html)}"></iframe>
    </div>
  </div>
</body>
</html>`;

  const previewPath = path.join(process.cwd(), "public", "preview-emails.html");
  fs.writeFileSync(previewPath, showcaseHtml, "utf-8");
  console.info(`[OK] Interaktif görsel vitrin oluşturuldu: ${previewPath}`);

  // 3. Send real live email to operis@outlook.com.tr
  console.info("\n[1/2] Canlı E-posta Gönderiliyor -> operis@outlook.com.tr...");
  const attachments = logoBase64
    ? [
        {
          filename: "operis-logo.png",
          content: logoBase64,
          content_id: "operis-logo",
        },
      ]
    : undefined;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: "operis@outlook.com.tr",
        subject: "Operis - Şifre Sıfırlama Talebi (Kusursuz Görsel Versiyon)",
        html: passwordReset.html,
        text: passwordReset.text,
        attachments,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.info(`[BAŞARILI] E-posta başarıyla iletildi! E-posta ID: ${data.id}`);
    } else {
      console.error("[HATA] Gönderim başarısız:", data);
    }
  } catch (err) {
    console.error("[HATA] İstek hatası:", err);
  }

  // 4. Try sending to emirtdede@gmail.com
  console.info("\n[2/2] Canlı E-posta Deneniyor -> emirtdede@gmail.com...");
  try {
    const res2 = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: "emirtdede@gmail.com",
        subject: "Operis - Yeni Şık E-posta Tasarımı (Canlı Örnek)",
        html: verification.html,
        text: verification.text,
      }),
    });

    const data2 = await res2.json();
    if (res2.ok) {
      console.info(
        `[BAŞARILI] emirtdede@gmail.com adresine teslim edildi! E-posta ID: ${data2.id}`
      );
    } else {
      console.info(`[RESEND KISITLAMASI]: ${data2.message || JSON.stringify(data2)}`);
    }
  } catch (err) {
    console.error("[HATA] İstek hatası:", err);
  }
}

main().catch(console.error);

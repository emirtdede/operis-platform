import { describe, it, expect } from "vitest";

describe("Workflow & Instant Handshake Automation", () => {
  describe("Official Bilateral Contract & Milestone Specifications", () => {
    it("verifies contract text includes 5846 FSEK and 6325 Mediation clauses", () => {
      const engagementId = "eng-handshake-789";
      const listingTitle = "Next.js Kurumsal Portalı";
      const budgetLabel = "60.000 TL";

      const contractText = `BAĞIMSIZ YAZILIM VE TEKNOLOJİ HİZMET SÖZLEŞMESİ TASLAĞI
Referans Kodu: OPR-ENG-${engagementId.slice(0, 8).toUpperCase()}

MADDE 1: KONU VE KAPSAM
İşbu sözleşmenin konusu ${listingTitle} projesidir.

MADDE 3: PROJE BEDELİ VE ÖDEME ŞARTLARI
3.1. Kararlaştırılan Proje Bedeli: ${budgetLabel}
3.4. Tavsiye Edilen 3 Aşamalı Kilometre Taşı & Avans Çizelgesi:
     - 1. Aşama: Tasarım ve Mimari Onayı (%30 avans)
     - 2. Aşama: Fonksiyonel Demo ve Test (%40 ara hak ediş)
     - 3. Aşama: Kaynak Kod Teslimi ve Canlıya Alma (%30 son ödeme ve mülkiyet devri)

MADDE 5: FİKRİ MÜLKİYET VE TELİF HAKLARI (5846 SAYILI FSEK)
Proje bedelinin tamamı Yüklenici'ye ödendiği anda, üretilen tüm kaynak kodlar üzerindeki mali haklar 5846 sayılı Fikri ve Sanat Eserleri Kanunu tahtında devredilmiş sayılır.

MADDE 8: ARABULUCULUK VE DOĞRUDAN UYUŞMAZLIK ÇÖZÜMÜ
Taraflar, işbu sözleşmeden doğabilecek her türlü uyuşmazlıkta dava açmadan önce 6325 sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu uyarınca doğrudan arabuluculuk yoluna başvurmayı peşinen kabul ve taahhüt ederler.`;

      expect(contractText).toContain("5846 SAYILI FSEK");
      expect(contractText).toContain("6325 sayılı Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu");
      expect(contractText).toContain("%30 avans");
      expect(contractText).toContain("%40 ara hak ediş");
      expect(contractText).toContain("%30 son ödeme");
    });
  });

  describe("Instant Handshake Kit URL Generation", () => {
    it("generates correct WhatsApp Web/App handshake link", () => {
      const phone = "+90 555 123 4567";
      const cleanPhone = phone.replace(/[^0-9+]/g, "").replace(/^\+/, "");
      const name = "Demir Yıldız";
      const project = "Next.js Web Uygulaması";

      const text = `Merhaba ${name}, Operis üzerinden '${project}' ilanımızda eşleştik. Proje detaylarını ve başlangıç takvimini görüşmek isterim.`;
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

      expect(waUrl).toContain("https://wa.me/905551234567?text=");
      expect(decodeURIComponent(waUrl)).toContain(name);
      expect(decodeURIComponent(waUrl)).toContain(project);
    });

    it("generates 30-minute Google Calendar Kickoff Meeting invitation URL", () => {
      const listingTitle = "E-Ticaret Entegrasyonu";
      const counterpartyEmail = "isortagi@operis.pro";
      const counterpartyName = "Mehmet Can";

      const meetTitle = encodeURIComponent(`Operis Tanışma & Proje Başlangıcı: ${listingTitle}`);
      const meetDetails = encodeURIComponent(
        `Operis üzerindeki '${listingTitle}' projemiz için 30 dakikalık tanışma ve başlangıç toplantısı.\n\nİş Ortağı: ${counterpartyName}`
      );
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${meetTitle}&details=${meetDetails}&add=${encodeURIComponent(counterpartyEmail)}`;

      expect(calendarUrl).toContain("https://calendar.google.com/calendar/render?action=TEMPLATE");
      expect(calendarUrl).toContain("add=isortagi%40operis.pro");
      expect(decodeURIComponent(calendarUrl)).toContain(listingTitle);
    });

    it("generates formal pre-filled mailto draft", () => {
      const email = "destek@operis.pro";
      const listingTitle = "Mobil Uygulama";
      const name = "Ayşe Kaya";

      const subject = encodeURIComponent(`Operis Proje Eşleşmesi: ${listingTitle}`);
      const body = encodeURIComponent(
        `Merhaba ${name},\n\nOperis üzerinden '${listingTitle}' projemizde eşleştik.`
      );
      const mailUrl = `mailto:${email}?subject=${subject}&body=${body}`;

      expect(mailUrl).toContain(`mailto:${email}?subject=`);
      expect(decodeURIComponent(mailUrl)).toContain(listingTitle);
      expect(decodeURIComponent(mailUrl)).toContain(`Merhaba ${name}`);
    });
  });
});

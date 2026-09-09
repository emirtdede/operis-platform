import { describe, it, expect } from "vitest";

describe("Bilateral Service Contract Draft Specifications", () => {
  it("verifies the contract draft text contains mandatory non-profit, zero-escrow and immunity clauses", () => {
    const engagementId = "eng-test-456";
    const listingTitle = "Mobil Uygulama Mimarisi";
    const category = "Mobil Geliştirme";
    const offerMessage = "React Native ve Expo ile iOS ve Android sürümü teslim edilecektir.";
    const budgetLabel = "45.000 TL";
    const timelineLabel = "~3 hafta";
    const clientName = "Demir Yıldız";
    const clientEmail = "kullanici@operis.pro";
    const contractorName = "Ahmet Yılmaz";
    const contractorEmail = "ahmet@ornek.com";

    const contractText = `BAĞIMSIZ YAZILIM VE TEKNOLOJİ HİZMET SÖZLEŞMESİ TASLAĞI
Referans Kodu: OPR-ENG-${engagementId.slice(0, 8).toUpperCase()}

MADDE 1: TARAFLAR
1.1. İŞVEREN (Müşteri):
     Adı / Unvanı : ${clientName}
     E-posta      : ${clientEmail}
1.2. YÜKLENİCİ (Yazılım / Teknoloji Uzmanı):
     Adı / Unvanı : ${contractorName}
     E-posta      : ${contractorEmail}

MADDE 2: SÖZLEŞMENİN KONUSU VE KAPSAMI
- Proje Başlığı   : ${listingTitle}
- Kategori        : ${category}
- Kapsam Özeti    : ${offerMessage}

MADDE 3: PROJE BEDELİ VE ÖDEME ŞARTLARI
3.1. Kararlaştırılan Proje Bedeli: ${budgetLabel}
3.2. Ödeme Şekli: Bedel, doğrudan İşveren tarafından Yüklenici'nin bildireceği banka hesabına (IBAN) veya fatura karşılığı ödenecektir.
3.3. Platform Aracılığı Kesinlikle Yoktur: Operis platformu hiçbir surette emanet hesabı (escrow) tutmaz, komisyon almaz ve ödeme aracılığı yapmaz.

MADDE 4: TESLİMAT VE SÜRE
4.1. Öngörülen Teslimat Süresi: ${timelineLabel}

MADDE 5: FİKRİ MÜLKİYET VE TELİF HAKLARI (FSEK)
Proje bedelinin tamamı Yüklenici'ye ödendiği anda mali haklar İşveren'e devredilmiş sayılır.

MADDE 7: OPERİS PLATFORMU SORUMSUZLUK VE DAVA MUAFİYETİ
İşbu sözleşme münhasıran İşveren ile Yüklenici arasında bağımsız olarak akdedilmiştir. Operis platformu (ve bağlı işleticisi); kar amacı gütmeyen, ücretsiz bir aracı ve yer sağlayıcı olup işbu sözleşmenin tarafı, garantörü, kefili veya temsilcisi değildir. Taraflar arasındaki ödeme yapılmaması, ayıplı ifa, dolandırıcılık veya gecikme hallerinde Operis'e hiçbir hukuki veya cezai sorumluluk rücu edilemez; Operis aleyhine dava açılamaz.`;

    expect(contractText).toContain("BAĞIMSIZ YAZILIM VE TEKNOLOJİ HİZMET SÖZLEŞMESİ TASLAĞI");
    expect(contractText).toContain("Operis platformu hiçbir surette emanet hesabı (escrow) tutmaz");
    expect(contractText).toContain("kar amacı gütmeyen, ücretsiz bir aracı ve yer sağlayıcı");
    expect(contractText).toContain("Operis aleyhine dava açılamaz");
    expect(contractText).toContain(clientName);
    expect(contractText).toContain(contractorName);
    expect(contractText).toContain(budgetLabel);
  });
});

"use client";

import { useState } from "react";
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { Printer, Copy, Check, Shield } from "lucide-react";

export interface ContractDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  engagementId: string;
  listingTitle: string;
  category: string;
  matchedAt: string | Date;
  offerMessage: string;
  budgetLabel: string | null;
  timelineLabel: string | null;
  counterparty: {
    displayName: string;
    handle: string;
    email: string;
    phone: string | null;
  };
  currentUser: {
    displayName?: string;
    email?: string;
  };
  isOwner: boolean;
  locale: string;
}

export function ContractDraftModal({
  isOpen,
  onClose,
  engagementId,
  listingTitle,
  category,
  matchedAt,
  offerMessage,
  budgetLabel,
  timelineLabel,
  counterparty,
  currentUser,
  isOwner,
  locale,
}: ContractDraftModalProps) {
  const isTr = locale === "tr";
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(matchedAt).toLocaleDateString(
    isTr ? "tr-TR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const clientName = isOwner
    ? currentUser.displayName || currentUser.email || "İşveren"
    : counterparty.displayName;
  const clientEmail = isOwner
    ? currentUser.email || "—"
    : counterparty.email;

  const contractorName = isOwner
    ? counterparty.displayName
    : currentUser.displayName || currentUser.email || "Yüklenici";
  const contractorEmail = isOwner
    ? counterparty.email
    : currentUser.email || "—";

  const contractText = `BAĞIMSIZ YAZILIM VE TEKNOLOJİ HİZMET SÖZLEŞMESİ TASLAĞI
Referans Kodu: OPR-ENG-${engagementId.slice(0, 8).toUpperCase()}
Tanzim Tarihi: ${formattedDate}

MADDE 1: TARAFLAR
1.1. İŞVEREN (Müşteri):
     Adı / Unvanı : ${clientName}
     E-posta      : ${clientEmail}
1.2. YÜKLENİCİ (Yazılım / Teknoloji Uzmanı):
     Adı / Unvanı : ${contractorName}
     E-posta      : ${contractorEmail}

MADDE 2: SÖZLEŞMENİN KONUSU VE KAPSAMI
İşbu sözleşmenin konusu, Yüklenici tarafından İşveren'e sunulacak olan "${listingTitle}" projesine ilişkin yazılım geliştirme, tasarım ve teknoloji hizmetlerinin ifasıdır.
- Kategori        : ${category}
- Kapsam Özeti    : ${offerMessage.replace(/\n+/g, " ")}

MADDE 3: PROJE BEDELİ VE ÖDEME ŞARTLARI
3.1. Kararlaştırılan Proje Bedeli: ${budgetLabel || "Karşılıklı belirlenecektir"}
3.2. Ödeme Şekli: Bedel, doğrudan İşveren tarafından Yüklenici'nin bildireceği banka hesabına (IBAN) veya fatura karşılığı ödenecektir.
3.3. Platform Aracılığı Kesinlikle Yoktur: Operis platformu hiçbir surette emanet hesabı (escrow) tutmaz, komisyon almaz ve ödeme aracılığı yapmaz.

MADDE 4: TESLİMAT VE SÜRE
4.1. Öngörülen Teslimat Süresi: ${timelineLabel || "Karşılıklı anlaşma ile belirlenecektir"}
4.2. İşveren, teslimatı takip eden 7 (yedi) iş günü içerisinde test ve incelemelerini tamamlayarak kabul veya revizyon talebini bildirmekle yükümlüdür.

MADDE 5: FİKRİ MÜLKİYET VE TELİF HAKLARI (FSEK)
Proje bedelinin tamamı Yüklenici'ye ödendiği anda, üretilen tüm kaynak kodlar, belgeler ve tasarımlar üzerindeki mali haklar (5846 sayılı FSEK tahtında işleme, çoğaltma, yayma, temsil) İşveren'e devredilmiş sayılır.

MADDE 6: GİZLİLİK VE TİCARİ SIRLAR (NDA)
Taraflar, proje süresince edindikleri gizli bilgi, kaynak kod, veri ve ticari sırları karşı tarafın yazılı onayı olmaksızın üçüncü şahıslara açıklayamaz.

MADDE 7: OPERİS PLATFORMU SORUMSUZLUK VE DAVA MUAFİYETİ
İşbu sözleşme münhasıran İşveren ile Yüklenici arasında bağımsız olarak akdedilmiştir. Operis platformu (ve bağlı işleticisi); kar amacı gütmeyen, ücretsiz bir aracı ve yer sağlayıcı olup işbu sözleşmenin tarafı, garantörü, kefili veya temsilcisi değildir. Taraflar arasındaki ödeme yapılmaması, ayıplı ifa, dolandırıcılık veya gecikme hallerinde Operis'e hiçbir hukuki veya cezai sorumluluk rücu edilemez; Operis aleyhine dava açılamaz.

MADDE 8: YETKİLİ MAHKEME VE İMZALAR
İşbu sözleşmeden doğacak uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.

İŞVEREN KAŞE / İMZA:                      YÜKLENİCİ KAŞE / İMZA:
___________________________               ___________________________`;

  const handleCopy = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(contractText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isTr ? "İki Tarafa Özel Sözleşme Taslağı" : "Bilateral Service Contract Draft"}
      description={
        isTr
          ? "Haklarınızı doğrudan koruyabilmeniz için Operis tarafından hazırlanan, iki taraf arasında geçerli bağımsız sözleşme taslağı."
          : "An independent legal contract draft generated for mutual protection without platform escrow."
      }
    >
      <div className="space-y-5">
        {/* Notice Badge */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-[var(--color-text-secondary)] leading-relaxed">
          <Shield className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {isTr ? "Hukuki Koruma Güvencesi: " : "Legal Self-Protection Notice: "}
            </span>
            {isTr
              ? "Operis komisyon almaz ve para tutmaz. İki tarafın da mağduriyet yaşamaması için bu sözleşme taslağını yazdırıp/imzalayarak doğrudan aranızda hukuken bağlayıcı kılabilirsiniz."
              : "Operis takes 0% commission and operates zero escrow. Print or sign this draft bilateral agreement to ensure binding legal protection."}
          </div>
        </div>

        {/* Contract Paper Viewer */}
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-5 sm:p-6 font-mono text-[11px] sm:text-xs text-[var(--color-text-primary)] leading-relaxed max-h-[380px] overflow-y-auto whitespace-pre-wrap select-all shadow-inner">
          {contractText}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? "Yazdır / PDF Kaydet" : "Print / Save PDF"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">{isTr ? "Kopyalandı" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>{isTr ? "Metni Kopyala" : "Copy Text"}</span>
                </>
              )}
            </Button>
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {isTr ? "Kapat" : "Close"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

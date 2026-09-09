import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";

import { ShieldCheck, Hash, CheckCircle2 } from "lucide-react";
import { LegalService } from "@/src/modules/legal/service";
import { Locale } from "@/src/lib/i18n/config";
import { Badge } from "@/src/components/ui/badge";

import {
  TR_TO_INTERNAL_LEGAL_SLUG,
  getLocalizedLegalPath,
} from "@/src/lib/i18n/routes";

const VALID_LEGAL_SLUGS = [
  "terms",
  "privacy",
  "matching-disclaimer",
  "acceptable-use",
  "cookies",
  "contact",
  "kullanim-kosullari",
  "gizlilik-ve-kvkk",
  "eslestirme-ve-sorumluluk-reddi",
  "kabul-edilebilir-kullanim",
  "cerez-politikasi",
  "iletisim",
];

export function generateStaticParams() {
  return VALID_LEGAL_SLUGS.map((slug) => ({ slug }));
}

const TITLES: Record<string, { tr: string; en: string }> = {
  terms: { tr: "Kullanım Koşulları", en: "Terms of Service" },
  privacy: { tr: "Gizlilik ve KVKK Aydınlatma Metni", en: "Privacy Notice" },
  "matching-disclaimer": {
    tr: "Eşleştirme ve Sorumluluk Reddi Beyanı",
    en: "Matching & Disclaimer Notice",
  },
  "acceptable-use": {
    tr: "Kabul Edilebilir Kullanım Politikası",
    en: "Acceptable Use Policy",
  },
  cookies: { tr: "Çerez Politikası", en: "Cookie Policy" },
  contact: {
    tr: "Kurumsal Bilgiler ve İletişim",
    en: "Corporate & Legal Contact",
  },
};

const PLAIN_SUMMARIES: Record<string, { tr: { title: string; bullets: string[] }; en: { title: string; bullets: string[] } }> = {
  terms: {
    tr: {
      title: "Özetle: Kullanım Koşulları Sizin İçin Ne Anlama Geliyor?",
      bullets: [
        "%0 Komisyon: Platform, yapılan iş birliklerinden veya ödemelerden hiçbir komisyon kesintisi yapmaz.",
        "Doğrudan Ticari Anlaşma: Sözleşme, teslimat şartları ve ödeme kanalları tamamen işveren ve yazılımcı arasındadır.",
        "7 Günlük Tazelik Kuralı: İlanlar maksimum 7 gün aktiftir; terk edilen projeler otomatik olarak pasife alınır.",
      ],
    },
    en: {
      title: "In Brief: What Terms of Service Mean for You",
      bullets: [
        "0% Commission: The platform never deducts any fee or percentage from your project earnings.",
        "Direct Commercial Autonomy: Contracts, milestones, and payment methods are agreed directly between counterparties.",
        "7-Day Freshness Window: Projects remain active for 7 days, ensuring search results stay clutter-free and current.",
      ],
    },
  },
  privacy: {
    tr: {
      title: "Özetle: Verileriniz Nasıl Korunuyor?",
      bullets: [
        "Verileriniz Asla Satılmaz: Kişisel bilgileriniz üçüncü taraf reklamcılara veya veri toplayıcılara asla aktarılmaz.",
        "Şifreli Teklifler: İlettiğiniz proje teklifleri AES-256 ile korunur ve rakipleriniz tarafından asla görülemez.",
        "Kademeli İletişim Açıklığı: Telefon ve e-posta bilgileriniz yalnızca karşılıklı eşleşme gerçekleştiğinde iki taraf arasında açılır.",
      ],
    },
    en: {
      title: "In Brief: How Your Privacy Is Guaranteed",
      bullets: [
        "Zero Data Selling: Your personal data is never monetized or distributed to third-party ad networks.",
        "Encrypted Proposals: Your offers are protected by AES-256 encryption and cannot be viewed by competitors.",
        "Bilateral Reveal: Direct phone and email channels unlock strictly between counterparties upon mutual match.",
      ],
    },
  },
  "matching-disclaimer": {
    tr: {
      title: "Özetle: Eşleştirme ve Sorumluluk Modeli",
      bullets: [
        "Keşif Ağı Rolü: Platform, nitelikli yazılımcı ve işverenleri doğrudan buluşturan tarafsız bir keşif ortamıdır.",
        "Escrow / Emanet Yoktur: Platform para toplamaz, tutmaz veya aracı ödeme sistemi işletmez.",
        "Doğrudan Hukuki Bağımsızlık: Taraflar kendi fatura, vergi ve hizmet sözleşmelerini bağımsız olarak yürütür.",
      ],
    },
    en: {
      title: "In Brief: Operational & Matching Disclaimer",
      bullets: [
        "Discovery Venue: We act solely as a technology matching and discovery venue connecting talent directly.",
        "Zero Escrow Custody: We never touch, process, or hold transaction funds in escrow accounts.",
        "Direct Accountability: Counterparties independently manage contracts, taxes, and invoicing.",
      ],
    },
  },
  "acceptable-use": {
    tr: {
      title: "Özetle: Kabul Edilebilir Kullanım İlkeleri",
      bullets: [
        "Dürüst ve Profesyonel İletişim: Sahte profil, taciz veya spam teklif iletimi kesinlikle yasaktır.",
        "Teklif Bütünlüğü: Açık iletişim bilgisi yaymak veya fiyat manipülasyonu yapmak yasaktır.",
        "Hızlı Moderasyon: Kötüye kullanım bildirimleri 24 saat içerisinde denetlenir ve ihlaller kalıcı olarak engellenir.",
      ],
    },
    en: {
      title: "In Brief: Community & Usage Standards",
      bullets: [
        "Professional Conduct: Fake identities, harassment, and spam proposals are strictly prohibited.",
        "Proposal Integrity: Publicly leaking contact details or attempting price manipulation is banned.",
        "Rapid Moderation: Abuse reports are audited promptly; violations result in permanent suspension.",
      ],
    },
  },
  cookies: {
    tr: {
      title: "Özetle: Çerez Politikası",
      bullets: [
        "Yalnızca Zorunlu Çerezler: Oturumunuzu güvende tutmak ve tercihlerinizi (tema, dil) saklamak için kullanılır.",
        "İzleme Çerezi Yok: Harici üçüncü taraf reklam ve profil çıkarma izleyicileri kullanılmaz.",
        "Şeffaf Kontrol: Tarayıcı ayarlarınızdan çerezleri dilediğiniz an silebilirsiniz.",
      ],
    },
    en: {
      title: "In Brief: Cookie Policy",
      bullets: [
        "Strictly Essential Cookies: Used only to authenticate your session and preserve preferences (theme, language).",
        "Zero Third-Party Trackers: No third-party behavioral ad trackers or profiling cookies are deployed.",
        "User Control: You can clear or manage cookies anytime through your browser settings.",
      ],
    },
  },
  contact: {
    tr: {
      title: "Özetle: Kurumsal Bilgiler ve Destek",
      bullets: [
        "Yasal Şirket Bilgileri: Operis Teknoloji Anonim Şirketi tüzel kişiliği altında faaliyet gösterilir.",
        "Resmi Destek Kanalları: Hukuki talepleriniz ve güvenlik bildirimleriniz için resmi kanallarımız 7/24 açıktır.",
        "Veri Sorumlusu İletişimi: KVKK / GDPR başvurularınız yasal süreler içerisinde yanıtlanır.",
      ],
    },
    en: {
      title: "In Brief: Corporate Identity & Support",
      bullets: [
        "Registered Entity: Operated under Operis Teknoloji Anonim Şirketi.",
        "Official Channels: Security disclosures and legal inquiries are monitored 24/7.",
        "Data Protection Officer: KVKK & GDPR rights requests are resolved within statutory timeframes.",
      ],
    },
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const isTr = locale === "tr";
  const internalKey = TR_TO_INTERNAL_LEGAL_SLUG[slug] ?? slug;

  const titleObj = TITLES[internalKey] ?? { tr: "Yasal Belge", en: "Legal Document" };
  const docTitle = isTr ? titleObj.tr : titleObj.en;

  const title = isTr
    ? `${docTitle} — Yasal Şeffaflık & Uyum`
    : `${docTitle} — Legal & Compliance`;
  const description = isTr
    ? `Operis ${docTitle} mevzuat ve uyum dokümanı.`
    : `Operis ${docTitle} legal and regulatory compliance document.`;

  return {
    title,
    description,
    alternates: {
      canonical: getLocalizedLegalPath(internalKey, locale as Locale),
      languages: {
        tr: getLocalizedLegalPath(internalKey, "tr"),
        en: getLocalizedLegalPath(internalKey, "en"),
      },
    },
    openGraph: {
      title,
      description,
      url: getLocalizedLegalPath(internalKey, locale as Locale),
      siteName: "Operis",
      locale: isTr ? "tr_TR" : "en_US",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!VALID_LEGAL_SLUGS.includes(slug)) {
    notFound();
  }

  setRequestLocale(locale);
  const isTr = locale === "tr";
  const internalKey = TR_TO_INTERNAL_LEGAL_SLUG[slug] ?? slug;

  let doc;
  try {
    doc = LegalService.getDocument(internalKey, locale as Locale, "v1");
  } catch {
    notFound();
  }

  const titleObj = TITLES[internalKey] ?? { tr: "Yasal Belge", en: "Legal Document" };
  const docTitle = isTr ? titleObj.tr : titleObj.en;

  const legalDocUrl = `https://operis.pro${getLocalizedLegalPath(internalKey, locale as Locale)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: docTitle,
        description: isTr
          ? `Operis ${docTitle} mevzuata uyum dokümanı.`
          : `Operis ${docTitle} compliance document.`,
        url: legalDocUrl,
        inLanguage: locale,
        publisher: {
          "@type": "Organization",
          name: "Operis Teknoloji Anonim Şirketi",
          url: "https://operis.pro",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: isTr ? "Ana Sayfa" : "Home",
            item: `https://operis.pro/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: isTr ? "Yasal & Şeffaflık" : "Legal & Compliance",
            item: legalDocUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: docTitle,
            item: legalDocUrl,
          },
        ],
      },
    ],
  };

  const navDocKeys = [
    "terms",
    "privacy",
    "matching-disclaimer",
    "acceptable-use",
    "cookies",
    "contact",
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="border-b border-[var(--color-border-subtle)] pb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" size="md">{doc.version}</Badge>
          <span className="text-xs font-mono text-[var(--color-text-tertiary)] flex items-center gap-1">
            <Hash className="h-3 w-3" aria-hidden="true" />
            <span>SHA-256: {doc.hash.slice(0, 16)}...</span>
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {docTitle}
        </h1>

        {/* Quick Document Navigation Pills */}
        <nav aria-label={isTr ? "Yasal Dokümanlar" : "Legal Documents"} className="flex flex-wrap gap-2 pt-2">
          {navDocKeys.map((key) => {
            const active = key === internalKey;
            const label = isTr ? TITLES[key]?.tr : TITLES[key]?.en;
            return (
              <Link
                key={key}
                href={getLocalizedLegalPath(key, locale as Locale)}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                  active
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400 font-semibold"
                    : "border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Plain Language Executive Summary */}
      {PLAIN_SUMMARIES[internalKey] && (
        <section
          aria-label={isTr ? "Yönetici Özeti" : "Executive Summary"}
          className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 sm:p-8 space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-400" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)]">
              {isTr ? PLAIN_SUMMARIES[internalKey].tr.title : PLAIN_SUMMARIES[internalKey].en.title}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {(isTr ? PLAIN_SUMMARIES[internalKey].tr.bullets : PLAIN_SUMMARIES[internalKey].en.bullets).map(
              (bullet, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{bullet}</span>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Document Content */}
      <article className="relative overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-12 leading-relaxed text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap font-sans space-y-4 shadow-xl">
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-500/5 blur-3xl" />
        {doc.content}
      </article>

      {/* Statutory Footer Disclaimer */}
      <aside className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/70 backdrop-blur-md p-4 text-xs text-[var(--color-text-tertiary)] leading-relaxed flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isTr
            ? "Yürürlükteki mevzuatın izin verdiği azami ölçüde, bu metin taraflar arasındaki hukuki ve operasyonel sınırları belirler. Tüm hakları saklıdır."
            : "To the maximum extent permitted by applicable law, this document establishes the governing operational terms. All rights reserved."}
        </p>
      </aside>
    </main>
  );
}

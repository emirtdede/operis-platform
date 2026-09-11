import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Palette } from "lucide-react";
import { BrandKitClient } from "@/src/components/brand/brand-kit-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr
    ? "Marka Kılavuzu & Medya Kiti — Resmi Varlıklar | Operis"
    : "Brand Guidelines & Media Kit — Official Assets | Operis";
  const description = isTr
    ? "Operis'in resmi vektör logoları, O-stream sembolü, optik kalibrasyon standartları, renk paleti ve marka kullanım kuralları."
    : "Official vector logos, calibrated O-stream symbol, optical kerning standards, color tokens, and brand usage rules for Operis.";

  const url = isTr ? "https://operis.pro/tr/marka" : "https://operis.pro/en/brand";

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        tr: "/tr/marka",
        en: "/en/brand",
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Operis",
      locale: isTr ? "tr_TR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BrandPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTr = locale === "tr";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: isTr ? "Operis Marka ve Tasarım Kılavuzu" : "Operis Brand Guidelines & Media Kit",
    description: isTr
      ? "Operis tescilli vektör logo varlıkları, renk paleti ve kullanım standartları."
      : "Official vector assets, color palette, and design guidelines for Operis.",
    publisher: {
      "@type": "Organization",
      name: "Operis Teknoloji Anonim Şirketi",
      url: "https://operis.pro",
      logo: "https://operis.pro/operis-logo-acik.svg",
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Header Section */}
      <header className="text-center space-y-4 max-w-3xl mx-auto pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-xs font-semibold text-blue-400 shadow-sm">
          <Palette className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "Resmi Marka & Medya Kiti" : "Official Brand & Media Kit"}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {isTr ? "Operis Marka Kılavuzu" : "Operis Brand Identity"}
        </h1>

        <p className="text-sm sm:text-base text-[var(--color-text-secondary)] leading-relaxed">
          {isTr
            ? "Bağımsız yazılım mühendisleri ve teknoloji ekipleri için tasarlanan Operis markasının resmi vektörel logoları, optik kalibrasyon kuralları ve renk standartları."
            : "Official vector logos, optical calibration rules, design tokens, and media guidelines built for the Operis peer-to-peer technology network."}
        </p>
      </header>

      {/* Interactive Brand Client Component */}
      <BrandKitClient locale={locale} />
    </main>
  );
}

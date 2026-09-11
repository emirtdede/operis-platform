import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: isTr ? "Hakkımızda & Manifestomuz | Operis" : "About Us & Manifesto | Operis",
    description: isTr
      ? "Operis'in bağımsız mühendisler ve teknoloji ekipleri için kurduğu komisyonsuz, şeffaf eşleştirme manifestosu."
      : "The Operis manifesto: empowering verified engineers and modern teams through direct, 0% cut matching.",
    alternates: {
      canonical: isTr ? "/tr/hakkimizda" : "/en/about",
      languages: {
        tr: "/tr/hakkimizda",
        en: "/en/about",
      },
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTr = locale === "tr";

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      {/* Manifesto Hero */}
      <section className="text-center space-y-6 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-semibold text-blue-400 shadow-sm">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "Operis Manifestosu" : "The Operis Manifesto"}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--color-text-primary)] leading-tight">
          {isTr
            ? "Mühendislerin Kazancına Ortak Olmayan Bağımsız Teknoloji Ağı"
            : "Direct Technology Discovery Without the Middleman Cut"}
        </h1>
        <p className="text-base text-[var(--color-text-secondary)] leading-relaxed">
          {isTr
            ? "Geleneksel platformların yüksek komisyon kesintilerini, ödeme rehinlerini ve yapay kısıtlamalarını reddediyoruz. Yazılım mühendisliği güvene, şeffaflığa ve doğrudan iletişime dayanır."
            : "We reject arbitrary platform fees, escrow lock-ins, and artificial walls. Modern software development thrives on trust, transparency, and direct collaboration."}
        </p>
      </section>

      {/* Core Principles */}
      <section className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] text-center">
          {isTr ? "Neden Farklıyız? Üç Temel Taahhüdümüz" : "Our Three Core Commitments"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div id="zero-commission" className="scroll-mt-24 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {isTr ? "%0 Komisyon Özgürlüğü" : "0% Platform Cut"}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "Teklif ettiğiniz veya anlaştığınız bütçenin %100'ü size aittir. Operis asla kazancınızdan kesinti yapmaz."
                : "Keep 100% of your earnings. No hidden charges or commission deductions."}
            </p>
          </div>

          <div id="freshness-radar" className="scroll-mt-24 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {isTr ? "1 Haftalık Canlılık" : "1-Week Freshness"}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "Radarımızdaki tüm ilanlar 1 haftalık yaşam döngüsüne tabidir. Terk edilmiş veya bayat projelerle zaman kaybetmezsiniz."
                : "All postings live strictly for 1 week. No stale or abandoned projects cluttering your feed."}
            </p>
          </div>

          <div id="encrypted-offers" className="scroll-mt-24 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-6 sm:p-7 space-y-3">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              {isTr ? "Birebir Şifreli Teklifler" : "Encrypted Proposals"}
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "Teklifleriniz rakiplere kapalıdır. Değerinizi kırarak değil, teknik vizyonunuzla öne çıkarsınız."
                : "Proposals are encrypted and visible only to the project owner. No public race-to-the-bottom."}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/60 p-8 sm:p-12 text-center space-y-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {isTr
            ? "Yeni Nesil Teknoloji Ağına Katılın"
            : "Join the Next Generation Matching Network"}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] max-w-xl mx-auto">
          {isTr
            ? "İster projeniz için bağımsız uzman arayın, ister mühendis olarak yeni nesil projelere doğrudan teklif verin."
            : "Connect directly with verified software talent or post your next big technology milestone."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={isTr ? "/tr/kayit" : "/en/register"}>
            <Button variant="primary" size="lg" className="gap-2">
              <span>{isTr ? "Hemen Hesap Oluştur" : "Create Account"}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <Link href={isTr ? "/tr/ilanlar" : "/en/listings"}>
            <Button variant="secondary" size="lg">
              {isTr ? "İlanları Keşfet" : "Browse Listings"}
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

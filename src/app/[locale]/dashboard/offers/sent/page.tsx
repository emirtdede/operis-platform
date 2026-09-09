import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Send, ShieldCheck, Compass, LogIn } from "lucide-react";
import { getSession } from "@/src/modules/auth/session";
import { OfferService } from "@/src/modules/offers/service";
import { SentOffersDashboard, SentOfferItem } from "@/src/components/dashboard/sent-offers-dashboard";
import { Button } from "@/src/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr
    ? "Verdiğim Teklifler — Durum Takibi"
    : "My Sent Proposals — Track Status";
  const description = isTr
    ? "Projeler için ilettiğiniz gizli teklifleri, beklemedeki durumları ve kabul edilen eşleşmeleri takip edin."
    : "Track your private proposals, pending statuses, and accepted matches across projects.";

  return {
    title,
    description,
    alternates: {
      canonical: isTr ? "/tr/panel/teklifler/gonderilen" : "/en/dashboard/offers/sent",
      languages: {
        tr: "/tr/panel/teklifler/gonderilen",
        en: "/en/dashboard/offers/sent",
      },
    },
    openGraph: {
      title,
      description,
      url: isTr ? "/tr/panel/teklifler/gonderilen" : "/en/dashboard/offers/sent",
      siteName: "Operis",
      locale: isTr ? "tr_TR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function SentOffersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isTr = locale === "tr";
  const session = await getSession();

  let initialOffers: SentOfferItem[] = [];

  if (session?.userId) {
    try {
      const rows = await OfferService.getSentOffers(session.userId);
      initialOffers = rows.map((r) => ({
        id: r.offer.id,
        listingId: r.listing.id,
        listingSlug: r.listing.slug,
        listingTitle: r.listing.title,
        status: r.offer.status,
        message: r.offer.message,
        budgetCurrency: r.offer.budgetCurrency,
        budgetMin: r.offer.budgetMin,
        budgetMax: r.offer.budgetMax,
        estimatedDurationValue: r.offer.estimatedDurationValue,
        estimatedDurationUnit: r.offer.estimatedDurationUnit,
        createdAt: r.offer.createdAt,
        updatedAt: r.offer.updatedAt,
      }));
    } catch {
      initialOffers = [];
    }
  }

  const sentOffersUrl = isTr
    ? "https://operis.pro/tr/panel/teklifler/gonderilen"
    : "https://operis.pro/en/dashboard/offers/sent";

  const jsonLd = {
    "@context": "https://schema.org",
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
        name: isTr ? "İlanlar" : "Projects",
        item: `https://operis.pro${isTr ? "/tr/akis" : "/en/feed"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: isTr ? "Gönderilen Teklifler" : "Sent Offers",
        item: sentOffersUrl,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {isTr ? "Gönderilen Tekliflerim" : "My Sent Offers"}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Projeler için verdiğiniz tekliflerin güncel durumlarını buradan izleyebilirsiniz."
              : "Review and manage all proposals you have submitted to project owners."}
          </p>
        </div>

        <Link href={isTr ? "/tr/akis" : "/en/feed"}>
          <Button variant="shimmer" size="sm" className="gap-2">
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>{isTr ? "Yeni İlanları Keşfet" : "Browse Projects"}</span>
          </Button>
        </Link>
      </header>

      {/* Sent Offers Lifecycle Guidance Banner */}
      <section
        aria-label={isTr ? "Teklif Durumları Rehberi" : "Proposal Status Guide"}
        className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <Send className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--color-text-primary)] block">
              {isTr ? "Teklif Durumları ve Haklarınız" : "Proposal Lifecycles & Rights"}
            </span>
            <p>
              {isTr
                ? "Teklifleriniz rakiplere kapalıdır. 'Beklemede' olan teklifinizi istediğiniz zaman güncelleyebilir veya geri çekebilirsiniz. İlan sahibi teklifinizi kabul ettiğinde eşleşme alanına yönlendirilirsiniz."
                : "Your offers are strictly confidential. You may update or withdraw any 'Pending' proposal at any time. Once accepted, you will receive direct contact channels in the workspace."}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 self-end sm:self-center">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "%100 Kazanç" : "100% Take-Home"}</span>
        </div>
      </section>

      {/* Auth Prompt if Guest */}
      {!session && (
        <section
          aria-label={isTr ? "Giriş Hatırlatması" : "Sign In Reminder"}
          className="relative overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 p-8 sm:p-12 text-center space-y-5 backdrop-blur-xl shadow-xl"
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
            <LogIn className="h-7 w-7" aria-hidden="true" />
          </div>

          <div className="relative z-10 max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {isTr ? "Tekliflerinizi İzlemek İçin Giriş Yapın" : "Sign In to Track Your Proposals"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "Daha önce projelere ilettiğiniz tekliflerin durumunu görmek için lütfen oturum açın."
                : "Please log in to your account to review the status of your submitted proposals."}
            </p>
          </div>
          <div className="relative z-10 pt-1">
            <Link href={isTr ? "/tr/giris" : "/en/login"}>
              <Button variant="primary" size="md" className="gap-2 shadow-lg shadow-blue-500/20">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "Giriş Yap" : "Log In"}</span>
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Sent Offers Dashboard */}
      <section aria-label={isTr ? "Gönderilen Teklif Listesi" : "Sent Offer List"}>
        <SentOffersDashboard initialOffers={initialOffers} locale={locale} />
      </section>
    </main>
  );
}


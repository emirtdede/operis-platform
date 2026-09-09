import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Clock, ShieldCheck, PlusCircle, LogIn } from "lucide-react";
import { getSession } from "@/src/modules/auth/session";
import { ListingService } from "@/src/modules/listings/service";
import { OwnerListingsDashboard, OwnerListingItem } from "@/src/components/dashboard/owner-listings-dashboard";
import { Button } from "@/src/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr
    ? "Yayınladığım İlanlar & Yaşam Döngüsü"
    : "My Published Listings & Lifecycle";
  const description = isTr
    ? "Yayınladığınız teknoloji proje ilanlarını yönetin, teklifleri inceleyin ve 7 günlük yaşam döngüsünü yenileyin."
    : "Manage your published technology project listings, review incoming proposals, and renew 7-day lifecycles.";

  return {
    title,
    description,
    alternates: {
      canonical: isTr ? "/tr/panel/ilanlarim" : "/en/dashboard/listings",
      languages: {
        tr: "/tr/panel/ilanlarim",
        en: "/en/dashboard/listings",
      },
    },
    openGraph: {
      title,
      description,
      url: isTr ? "/tr/panel/ilanlarim" : "/en/dashboard/listings",
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

export default async function DashboardListingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isTr = locale === "tr";
  const session = await getSession();

  let initialListings: OwnerListingItem[] = [];

  if (session?.userId) {
    try {
      const rows = await ListingService.getOwnerListings(session.userId);
      initialListings = rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        status: r.status,
        budgetMode: r.budgetMode,
        budgetCurrency: r.budgetCurrency,
        budgetMin: r.budgetMin,
        budgetMax: r.budgetMax,
        firstPublishedAt: r.firstPublishedAt,
        lastActivatedAt: r.lastActivatedAt,
        activeUntil: r.activeUntil,
        activationSeq: r.activationSeq,
      }));
    } catch {
      initialListings = [];
    }
  }

  const dashboardUrl = isTr
    ? "https://operis.pro/tr/panel/ilanlarim"
    : "https://operis.pro/en/dashboard/listings";

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
        name: isTr ? "İlanlarım" : "My Listings",
        item: dashboardUrl,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {isTr ? "İlanlarım" : "My Listings"}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Yayınladığınız projelerin 7 günlük durumlarını, teklifleri ve eşleşmeleri yönetin."
              : "Manage your 7-day listing lifecycles, incoming offers, and matched projects."}
          </p>
        </div>

        <Link href={isTr ? "/tr/ilanlar/yeni" : "/en/listings/new"}>
          <Button variant="shimmer" size="sm" className="gap-2">
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>{isTr ? "Yeni İlan Yayınla" : "Post New Listing"}</span>
          </Button>
        </Link>
      </header>

      {/* 7-Day Lifecycle Guidance Banner */}
      <section
        aria-label={isTr ? "İlan Yönetim Rehberi" : "Listing Management Guide"}
        className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--color-text-primary)] block">
              {isTr ? "7 Günlük Canlılık ve Yenileme Kuralı" : "7-Day Freshness & Renewal Policy"}
            </span>
            <p>
              {isTr
                ? "İlanlarınız 168 saat boyunca radarımızda aktiftir. Süresi dolan ilanlar silinmez; 'Pasif / Süresi Dolanlar' sekmesinden tek tıkla 7 gün daha ücretsiz yeniden başlatabilirsiniz."
                : "Projects stay active on our freshness radar for 168 hours. Expired listings are never deleted; reactivate them anytime for another 7 days with a single click at zero cost."}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 self-end sm:self-center">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "%0 Komisyon" : "0% Platform Cut"}</span>
        </div>
      </section>

      {/* Auth Prompt if Guest */}
      {!session && (
        <section
          aria-label={isTr ? "Giriş Hatırlatması" : "Sign In Reminder"}
          className="relative overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 p-8 sm:p-12 text-center space-y-5 backdrop-blur-xl shadow-xl"
        >
          <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative z-10 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-sm">
            <LogIn className="h-7 w-7" aria-hidden="true" />
          </div>

          <div className="relative z-10 max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {isTr ? "İlanlarınızı Yönetmek İçin Giriş Yapın" : "Sign In to Manage Your Listings"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "Daha önce yayınladığınız veya taslak halindeki projelerinizi görüntülemek için lütfen hesabınıza oturum açın."
                : "Please log in to your account to view and manage your published projects and incoming proposals."}
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

      {/* Listings Table / Cards */}
      <section aria-label={isTr ? "İlan Yönetimi" : "Listing Management"}>
        <OwnerListingsDashboard initialListings={initialListings} locale={locale} />
      </section>
    </main>
  );
}


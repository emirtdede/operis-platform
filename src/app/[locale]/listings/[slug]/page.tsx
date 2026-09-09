import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import {
  Clock,
  Calendar,
  Layers,
  ArrowLeft,
  Lock,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { FeedService } from "@/src/modules/listings/feed/service";
import { AvatarInitials } from "@/src/components/ui/avatar-initials";
import { Badge } from "@/src/components/ui/badge";
import { ListingDetailActions } from "@/src/components/listings/listing-detail-actions";
import {
  getLocalizedListingPath,
  getLocalizedProfilePath,
  getLocalizedRoute,
} from "@/src/lib/i18n/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const isTr = locale === "tr";
  const data = await FeedService.getListingBySlug(slug);

  if (!data) {
    return {
      title: isTr ? "İlan Bulunamadı" : "Listing Not Found",
    };
  }

  const { listing } = data;
  const title = isTr
    ? `${listing.title} — Proje Detayı`
    : `${listing.title} — Project Overview`;
  const description = listing.summary;

  return {
    title,
    description,
    alternates: {
      canonical: getLocalizedListingPath(slug, locale),
      languages: {
        tr: getLocalizedListingPath(slug, "tr"),
        en: getLocalizedListingPath(slug, "en"),
      },
    },
    openGraph: {
      title,
      description,
      url: getLocalizedListingPath(slug, locale),
      siteName: "Operis",
      locale: isTr ? "tr_TR" : "en_US",
      type: "article",
      publishedTime: listing.firstPublishedAt?.toISOString(),
      expirationTime: listing.activeUntil?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: listing.status === "ACTIVE",
      follow: true,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const isTr = locale === "tr";
  const data = await FeedService.getListingBySlug(slug);

  if (!data) {
    notFound();
  }

  const { listing, category, ownerProfile } = data;

  // Calculate remaining days
  const now = new Date();
  const until = listing.activeUntil ? new Date(listing.activeUntil) : null;
  const isCurrentlyActive =
    listing.status === "ACTIVE" && until !== null && until.getTime() > now.getTime();
  const diffDays = until
    ? Math.max(0, Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Format first published date
  const firstDate = listing.firstPublishedAt
    ? new Date(listing.firstPublishedAt)
    : new Date(listing.createdAt);
  const formattedFirstDate = new Intl.DateTimeFormat(isTr ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(firstDate);

  // Format budget
  let budgetLabel = isTr ? "Belirtilmedi" : "Not specified";
  if (listing.budgetMin && listing.budgetMax) {
    budgetLabel = `${parseFloat(listing.budgetMin).toLocaleString(isTr ? "tr-TR" : "en-US")} – ${parseFloat(listing.budgetMax).toLocaleString(isTr ? "tr-TR" : "en-US")} ${listing.budgetCurrency ?? ""}`;
  } else if (listing.budgetMin) {
    budgetLabel = `${isTr ? "Min" : "From"} ${parseFloat(listing.budgetMin).toLocaleString(isTr ? "tr-TR" : "en-US")} ${listing.budgetCurrency ?? ""}`;
  } else if (listing.budgetMode === "NEGOTIABLE") {
    budgetLabel = isTr ? "Görüşülebilir" : "Negotiable";
  }

  // Format timeline
  let timelineLabel: string | null = null;
  if (listing.timelineValue && listing.timelineUnit) {
    const unitLabel =
      listing.timelineUnit === "DAYS"
        ? isTr ? "gün" : "days"
        : listing.timelineUnit === "WEEKS"
        ? isTr ? "hafta" : "weeks"
        : isTr ? "ay" : "months";
    timelineLabel = `~${listing.timelineValue} ${unitLabel}`;
  }

  const localizedProfilePath = getLocalizedProfilePath(ownerProfile.handle, locale);
  const localizedListingUrl = `https://operis.pro${getLocalizedListingPath(slug, locale)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "JobPosting",
        title: listing.title,
        description: listing.scope || listing.summary,
        datePosted: listing.firstPublishedAt?.toISOString() || new Date(listing.createdAt).toISOString(),
        validThrough: listing.activeUntil?.toISOString(),
        employmentType: "CONTRACTOR",
        hiringOrganization: {
          "@type": "Organization",
          name: ownerProfile.displayName,
          sameAs: `https://operis.pro${localizedProfilePath}`,
        },
        jobLocationType: "TELECOMMUTE",
        baseSalary: listing.budgetMin
          ? {
              "@type": "MonetaryAmount",
              currency: listing.budgetCurrency || "TRY",
              value: {
                "@type": "QuantitativeValue",
                minValue: parseFloat(listing.budgetMin),
                maxValue: listing.budgetMax ? parseFloat(listing.budgetMax) : undefined,
                unitText: "PROJECT",
              },
            }
          : undefined,
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
            name: isTr ? "İlanlar" : "Listings",
            item: `https://operis.pro${getLocalizedRoute("listings", locale)}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: listing.title,
            item: localizedListingUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
        <Link
          href={getLocalizedRoute("listings", locale)}
          className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isTr ? "Tüm İlanlara Dön" : "Back to Listings"}</span>
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--color-text-secondary)] font-medium">{category.key}</span>
      </nav>

      {/* Main Glass Hero Card */}
      <article className="relative overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-8 sm:p-10 backdrop-blur-xl shadow-2xl space-y-8">
        {/* Top Status Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Badge variant="secondary" size="md" className="font-medium bg-blue-500/10 text-blue-400 border-blue-500/20">
            {category.key}
          </Badge>

          <div className="flex items-center gap-3 text-xs">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-cyan-400 font-medium">
              <span className={`h-2 w-2 rounded-full ${isCurrentlyActive ? "bg-cyan-400 animate-pulse" : "bg-red-500"}`} />
              <span>
                {isCurrentlyActive
                  ? isTr
                    ? `${diffDays} gün aktif`
                    : `Active for ${diffDays} days`
                  : isTr
                  ? "Süresi doldu"
                  : "Expired"}
              </span>
            </div>

            {listing.activationSeq > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isTr ? `${listing.activationSeq}. Yayım Döngüsü` : `Cycle #${listing.activationSeq}`}</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Summary */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)] leading-tight">
            {listing.title}
          </h1>
          <p className="text-base text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
            {listing.summary}
          </p>
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/60 p-5 text-xs">
          <div className="space-y-1">
            <span className="text-[var(--color-text-tertiary)] block">
              {isTr ? "Proje Bütçesi" : "Project Budget"}
            </span>
            <span className="font-mono text-base font-bold text-emerald-400 block">
              {budgetLabel}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[var(--color-text-tertiary)] block">
              {isTr ? "Tahmini Süre" : "Target Timeline"}
            </span>
            <span className="font-semibold text-base text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-cyan-400" aria-hidden="true" />
              <span>{timelineLabel ?? (isTr ? "Belirtilmedi" : "Flexible")}</span>
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[var(--color-text-tertiary)] block">
              {isTr ? "Yayım Tarihi" : "Publication Date"}
            </span>
            <span className="font-semibold text-sm text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-400" aria-hidden="true" />
              <span>{formattedFirstDate}</span>
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[var(--color-text-tertiary)] block">
              {isTr ? "İlan Sahibi" : "Posted By"}
            </span>
            <Link
              href={getLocalizedProfilePath(ownerProfile.handle, locale)}
              className="font-semibold text-sm text-[var(--color-text-primary)] hover:text-blue-400 transition-colors flex items-center gap-2"
            >
              <AvatarInitials name={ownerProfile.displayName} size="sm" />
              <span className="truncate">{ownerProfile.displayName}</span>
            </Link>
          </div>
        </div>

        {/* Action Container with Reactive Buttons */}
        <div className="pt-2">
          <ListingDetailActions
            listingId={listing.id}
            listingTitle={listing.title}
            ownerUserId={listing.ownerUserId}
            isOwner={false}
            isActive={isCurrentlyActive}
            locale={locale}
          />
        </div>
      </article>

      {/* Scope / Requirements Section */}
      <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 p-8 sm:p-10 backdrop-blur-xl space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
          <Layers className="h-4 w-4 text-blue-500" aria-hidden="true" />
          <span>{isTr ? "Proje Kapsamı ve Teknik Gereksinimler" : "Project Scope & Technical Requirements"}</span>
        </div>
        <div className="prose prose-sm max-w-none text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
          {listing.scope}
        </div>
      </section>

      {/* Technologies & Tags */}
      {listing.tags && listing.tags.length > 0 && (
        <section className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 p-6 sm:p-8 backdrop-blur-xl space-y-3 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isTr ? "İlgili Teknolojiler ve Beceriler" : "Relevant Tech Stack & Skills"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {listing.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-xs font-medium text-[var(--color-text-primary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Proposal Guidance for Specialists */}
      <section
        aria-label={isTr ? "Teklif Rehberi" : "Proposal Guide"}
        className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-blue-500/5 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              {isTr ? "Bu Projeye Teklif Verirken Nelere Dikkat Edilmeli?" : "Guidelines for Submitting a Winning Proposal"}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {isTr ? "Başarılı ve kesintisiz iş birlikleri için önerilen adımlar" : "Best practices for high-impact proposals"}
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--color-text-secondary)] leading-relaxed">
          <div className="group relative overflow-hidden p-5 rounded-2xl bg-[var(--color-surface-base)]/80 border border-[var(--color-border-subtle)] backdrop-blur-md space-y-2.5 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 font-bold text-[var(--color-text-primary)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">1</span>
              <span>{isTr ? "Birebir Gizlilik" : "Confidentiality"}</span>
            </div>
            <p>
              {isTr
                ? "Teklifiniz rakiplere tamamen kapalıdır. Fiyatınızı düşürme baskısı olmadan değerinizi yansıtın."
                : "Your offer is completely private. Represent your true value without race-to-the-bottom pressure."}
            </p>
          </div>

          <div className="group relative overflow-hidden p-5 rounded-2xl bg-[var(--color-surface-base)]/80 border border-[var(--color-border-subtle)] backdrop-blur-md space-y-2.5 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 font-bold text-[var(--color-text-primary)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">2</span>
              <span>{isTr ? "Net Zaman ve Bütçe" : "Scope & Milestones"}</span>
            </div>
            <p>
              {isTr
                ? "Teklif metninizde teknik yaklaşımınızı, tecrübenizi ve tahmini aşamaları kısaca özetleyin."
                : "Briefly articulate your architecture, relevant past work, and expected milestone phases."}
            </p>
          </div>

          <div className="group relative overflow-hidden p-5 rounded-2xl bg-[var(--color-surface-base)]/80 border border-[var(--color-border-subtle)] backdrop-blur-md space-y-2.5 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 font-bold text-[var(--color-text-primary)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">3</span>
              <span>{isTr ? "%0 Kesintisiz İş Birliği" : "0% Fee Autonomy"}</span>
            </div>
            <p>
              {isTr
                ? "Teklifiniz kabul edildiğinde doğrudan iletişim kurulur. Kazancınızdan komisyon kesilmez."
                : "Upon acceptance, connect directly with the client. Keep 100% of the agreed project fees."}
            </p>
          </div>
        </div>
      </section>

      {/* Privacy & Legal Transparency Box */}
      <aside className="relative overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/60 p-6 sm:p-8 text-xs text-[var(--color-text-tertiary)] leading-relaxed flex items-start gap-4 backdrop-blur-xl shadow-sm">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="mt-0.5">
          {isTr
            ? "Yürürlükteki mevzuatın izin verdiği azami ölçüde, bu platform üzerinden verilen teklifler AES-256-GCM ile şifrelenir ve yalnızca ilan sahibi tarafından incelenir. Platform ödeme garantisi, emanet veya aracılık hizmeti vermez; tüm ticari müzakere doğrudan taraflar arasındadır."
            : "To the maximum extent permitted by applicable law, proposals submitted on this platform are encrypted via AES-256-GCM and viewed solely by the project owner. The platform does not hold escrow or process payments."}
        </p>
      </aside>
    </main>
  );
}

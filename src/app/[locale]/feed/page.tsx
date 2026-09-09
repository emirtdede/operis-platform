import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { Search, Filter, PlusCircle, Clock, ShieldCheck } from "lucide-react";
import { FeedService, FeedListingItem } from "@/src/modules/listings/feed/service";
import { CategoryService } from "@/src/modules/categories/service";
import { ListingCard } from "@/src/components/listings/listing-card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Button } from "@/src/components/ui/button";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr
    ? "Canlı Proje Akışı — 7 Günlük İlanlar"
    : "Live Project Feed — 7-Day Listings";
  const description = isTr
    ? "7 günlük güncel teknoloji projelerini ve yazılım ilanlarını keşfedin, doğrudan teklif verin."
    : "Discover active 7-day software engineering and technology projects and submit direct proposals.";

  return {
    title,
    description,
    alternates: {
      canonical: isTr ? "/tr/akis" : "/en/feed",
      languages: {
        tr: "/tr/akis",
        en: "/en/feed",
      },
    },
    openGraph: {
      title,
      description,
      url: isTr ? "/tr/akis" : "/en/feed",
      siteName: "Operis",
      locale: isTr ? "tr_TR" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; category?: string; q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const isTr = locale === "tr";
  const mode = sp.mode === "all" ? "all" : "following";
  const selectedCategory = sp.category;
  const searchQuery = sp.q;
  const feedPath = isTr ? "/tr/akis" : "/en/feed";

  // Fetch categories for filter panel
  const categories = await CategoryService.getAllCategories(isTr ? "tr" : "en").catch(() => []);

  // Fetch feed listings
  const feedResult: { items: FeedListingItem[]; hasFollowedCategories?: boolean } =
    await FeedService.getFeedListings({
      mode: mode as "following" | "all",
      categorySlugs: selectedCategory ? [selectedCategory] : undefined,
      search: searchQuery,
      locale: isTr ? "tr" : "en",
    }).catch(() => ({ items: [], hasFollowedCategories: true }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: isTr ? "Proje Akışı" : "Project Feed",
        description: isTr
          ? "7 günlük güncel teknoloji projelerini ve yazılım ilanlarını keşfedin."
          : "Discover active 7-day software engineering and technology projects.",
        url: `https://operis.pro${feedPath}`,
        inLanguage: locale,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: feedResult.items.length,
          itemListElement: feedResult.items.map((item, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: `https://operis.pro${isTr ? `/tr/ilanlar/${item.slug}` : `/en/listings/${item.slug}`}`,
            name: item.title,
          })),
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
            name: isTr ? "Proje Akışı" : "Project Feed",
            item: `https://operis.pro${feedPath}`,
          },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Expansive Header */}
      <header className="relative flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[var(--color-border-subtle)]">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            {isTr ? "Proje Akışı" : "Project Activity Feed"}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {isTr
              ? "Yalnızca son 168 saat içinde yayınlanmış veya yenilenmiş güncel yazılım projeleri."
              : "Strictly active projects published or reactivated within the last 168 hours."}
          </p>
        </div>

        {/* Floating Glass Search Console */}
        <form
          method="GET"
          action={feedPath}
          className="flex items-center gap-2 max-w-md w-full bg-[var(--color-surface-base)]/80 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--color-border-subtle)] shadow-sm"
          role="search"
        >
          <input type="hidden" name="mode" value={mode} />
          {selectedCategory && (
            <input type="hidden" name="category" value={selectedCategory} />
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={searchQuery ?? ""}
              maxLength={100}
              aria-label={isTr ? "İlan arama" : "Search listings"}
              placeholder={isTr ? "İlan başlığı veya teknoloji ara..." : "Search title or tech stack..."}
              className="w-full rounded-xl bg-transparent pl-9 pr-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            {isTr ? "Ara" : "Search"}
          </Button>
        </form>
      </header>

      {/* Mode Switcher Tabs */}
      <nav aria-label={isTr ? "Akış Sekmeleri" : "Feed Tabs"} className="flex flex-wrap items-center gap-3">
        <Link
          href={`${feedPath}?mode=following${
            selectedCategory ? `&category=${selectedCategory}` : ""
          }${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
          className={`rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
            mode === "following"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
              : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/60 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
          }`}
        >
          {isTr ? "Takip Ettiğim Kategoriler" : "Following Categories"}
        </Link>

        <Link
          href={`${feedPath}?mode=all${
            selectedCategory ? `&category=${selectedCategory}` : ""
          }${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
          className={`rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
            mode === "all"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
              : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/60 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
          }`}
        >
          {isTr ? "Tüm Projeler" : "All Projects"}
        </Link>
      </nav>

      {/* 7-Day Live Radar Guidance Banner */}
      <section
        aria-label={isTr ? "Akış Tazelik Bilgisi" : "Feed Freshness Info"}
        className="rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
          <span>
            {isTr
              ? "Tüm projeler 168 saatlik canlılık döngüsündedir. Yalnızca aktif ve güncel yazılım işlerine teklif verirsiniz."
              : "All projects operate within a strict 168-hour freshness radar. Connect strictly with active software work."}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-emerald-400 shrink-0">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "%0 Komisyon & Şifreli Teklif" : "0% Commission & Encrypted"}</span>
        </div>
      </section>

      {/* Horizontal Category Filter Pills */}
      <section aria-label={isTr ? "Kategori Filtreleri" : "Category Filters"} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />
            <span>{isTr ? "Kategoriler" : "Categories"}</span>
          </div>
          {selectedCategory && (
            <Link
              href={`${feedPath}?mode=${mode}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
              className="text-xs font-medium text-cyan-500 hover:text-cyan-400 transition-colors"
            >
              {isTr ? "Filtreyi Temizle" : "Clear Filter"}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`${feedPath}?mode=${mode}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
            className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
              !selectedCategory
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20 font-semibold"
                : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {isTr ? "Tüm Alanlar" : "All Fields"}
          </Link>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <Link
                key={cat.id}
                href={`${feedPath}?mode=${mode}&category=${cat.slug}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20 font-semibold"
                    : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Main Stream Area */}
      <section className="space-y-6">
        <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)] border-b border-[var(--color-border-subtle)] pb-3">
          <span>
            {isTr
              ? `${feedResult.items.length} canlı proje listelendi`
              : `${feedResult.items.length} active projects live`}
          </span>
          <Link
            href={getLocalizedRoute("newListing", locale)}
            className="inline-flex items-center gap-1.5 font-medium text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>{isTr ? "Yeni İlan Yayınla" : "Publish Project"}</span>
          </Link>
        </div>

        {feedResult.items.length === 0 ? (
          <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/50 p-12 backdrop-blur-xl">
            <EmptyState
              title={
                mode === "following" && !feedResult.hasFollowedCategories
                  ? isTr
                    ? "Henüz Kategori Takip Etmiyorsunuz"
                    : "No Categories Followed Yet"
                  : isTr
                  ? "Eşleşen Canlı İlan Bulunamadı"
                  : "No Matching Live Listings"
              }
              description={
                mode === "following" && !feedResult.hasFollowedCategories
                  ? isTr
                    ? "İlginizi çeken teknoloji kategorilerini takip ederek özelleştirilmiş proje akışınızı oluşturun."
                    : "Follow technology categories you specialize in to build your personalized feed."
                  : isTr
                  ? "Arama ve filtre kriterlerinize uygun aktif ilan bulunamadı. Filtreleri temizleyebilir veya tüm akışı inceleyebilirsiniz."
                  : "No active projects match your filters. You can clear filters or view all listings."
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  {mode === "following" && !feedResult.hasFollowedCategories ? (
                    <Link href={getLocalizedRoute("categories", locale)}>
                      <Button variant="shimmer" size="sm">
                        {isTr ? "Kategorileri Keşfet ve Takip Et" : "Discover Categories"}
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link href={`${feedPath}?mode=all`}>
                        <Button variant="secondary" size="sm">
                          {isTr ? "Tüm İlanları Göster" : "View All Listings"}
                        </Button>
                      </Link>
                      <Link href={getLocalizedRoute("newListing", locale)}>
                        <Button variant="shimmer" size="sm">
                          {isTr ? "Yeni İlan Oluştur" : "Create New Listing"}
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {feedResult.items.map((item) => (
              <ListingCard
                key={item.id}
                id={item.id}
                slug={item.slug}
                title={item.title}
                summary={item.summary}
                categoryName={item.categoryName}
                budgetMode={item.budgetMode}
                budgetCurrency={item.budgetCurrency}
                budgetMin={item.budgetMin}
                budgetMax={item.budgetMax}
                timelineMode={item.timelineMode}
                targetDate={item.targetDate}
                timelineValue={item.timelineValue}
                timelineUnit={item.timelineUnit}
                ownerHandle={item.ownerHandle}
                ownerDisplayName={item.ownerDisplayName}
                firstPublishedAt={item.firstPublishedAt}
                lastActivatedAt={item.lastActivatedAt}
                activeUntil={item.activeUntil}
                activationSeq={item.activationSeq}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

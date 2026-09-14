import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ShieldCheck, Lock } from "lucide-react";
import { getSession } from "@/src/modules/auth/session";
import { CategoryService } from "@/src/modules/categories/service";
import { CategoryListInteractive } from "@/src/components/categories/category-list-interactive";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr
    ? "Freelance Sektörler & Uzmanlık Kategorileri | Operis"
    : "Freelance Sectors & Expertise Categories | Operis";
  const description = isTr
    ? "Yazılım, tasarım, pazarlama, yapay zeka, video, finans ve hukuk alanlarındaki kategorileri keşfedin, takip edin ve doğrudan projelere ulaşın."
    : "Discover and follow categories across software engineering, design, marketing, AI, video, finance, and legal to customize your direct project feed.";

  return {
    title,
    description,
    alternates: {
      canonical: isTr ? "/tr/kategoriler" : "/en/categories",
      languages: {
        tr: "/tr/kategoriler",
        en: "/en/categories",
      },
    },
    openGraph: {
      title,
      description,
      url: isTr ? "/tr/kategoriler" : "/en/categories",
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

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isTr = locale === "tr";
  const session = await getSession();
  const categories = await CategoryService.getAllCategories(
    isTr ? "tr" : "en",
    session?.userId
  ).catch(() => []);
  const initialFollowedIds = categories.filter((c) => c.isFollowed).map((c) => c.id);

  const categoriesUrl = isTr
    ? "https://operis.pro/tr/kategoriler"
    : "https://operis.pro/en/categories";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: isTr ? "Teknoloji Kategorileri" : "Technology Categories",
        description: isTr
          ? "Platform bünyesindeki tüm teknoloji ve yazılım uzmanlık kategorileri dizini."
          : "Complete directory of technology and software specialization categories.",
        url: categoriesUrl,
        inLanguage: locale,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: categories.map((cat, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: cat.name,
            url: isTr
              ? `https://operis.pro/tr/akis?category=${cat.slug}`
              : `https://operis.pro/en/feed?category=${cat.slug}`,
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
            name: isTr ? "Teknoloji Kategorileri" : "Categories",
            item: categoriesUrl,
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

      {/* Header */}
      <header className="border-b border-[var(--color-border-subtle)] pb-8 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
          {isTr ? "Sektörler ve Uzmanlık Kategorileri" : "Sectors & Expertise Categories"}
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
          {isTr
            ? "Yazılım, tasarım, pazarlama, yapay zeka, finans ve hukuk gibi 10 ana sektördeki kategorileri takip ederek proje akışınızı kişiselleştirin. Takip tercihleriniz tamamen gizlidir."
            : "Follow categories across 10 major industry sectors to customize your direct project feed. Your follow choices are strictly private."}
        </p>
      </header>

      {/* Privacy & Follow Guidance Banner */}
      <section
        aria-label={isTr ? "Kategori Rehberi" : "Category Guide"}
        className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--color-text-primary)] block">
              {isTr
                ? "Gizli Takip ve Doğrudan Akış Entegrasyonu"
                : "Private Following & Direct Feed Integration"}
            </span>
            <p>
              {isTr
                ? "Bir kategoriyi takip ettiğinizde o alandaki tüm yeni ve yenilenen ilanlar 'Takip Ettiklerim' akışınıza eklenir. Takip tercihleriniz tamamen gizlidir."
                : "Following a category adds fresh listings directly to your personalized 'Following' feed. Your follow choices are never publicly visible."}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 self-end sm:self-center">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>{isTr ? "Tamamen Gizli" : "100% Private"}</span>
        </div>
      </section>

      {/* Interactive Category List */}
      <section aria-label={isTr ? "Kategori Listesi" : "Category List"}>
        <CategoryListInteractive
          categories={categories}
          initialFollowedIds={initialFollowedIds}
          locale={locale}
          hasSession={Boolean(session?.userId)}
        />
      </section>
    </main>
  );
}

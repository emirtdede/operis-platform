import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
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
    ? "Yazılım, tasarım, pazarlama, yapay zeka, video, finans ve hukuk alanlarındaki kategorileri keşfedin, takip edin ve doğrudan ilanlara ulaşın."
    : "Discover and follow categories across software engineering, design, marketing, AI, video, finance, and legal to customize your direct listings feed.";

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

export default async function CategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ sector?: string }>;
}) {
  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialSector = resolvedSearchParams?.sector || "all";
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
      <header className="space-y-3 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
            {isTr ? "Sektörler ve Uzmanlık Kategorileri" : "Sectors & Expertise Categories"}
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold self-start sm:self-auto shrink-0 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isTr ? "Uçtan Uca Gizli Takip" : "100% Private Follow"}</span>
          </div>
        </div>
        <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
          {isTr
            ? "10 ana sektördeki 106 uzmanlık alanını takip ederek doğrudan ilan akışınızı kişiselleştirin. Takip tercihleriniz profilinizde asla herkese açık paylaşılmaz."
            : "Explore and follow specializations across 10 major industry sectors to personalize your direct feed. Your choices remain strictly confidential."}
        </p>
      </header>

      {/* Interactive Category List */}
      <section aria-label={isTr ? "Kategori Listesi" : "Category List"}>
        <CategoryListInteractive
          categories={categories}
          initialFollowedIds={initialFollowedIds}
          locale={locale}
          hasSession={Boolean(session?.userId)}
          initialSector={initialSector}
        />
      </section>
    </main>
  );
}

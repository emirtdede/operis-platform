import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  Code,
  Server,
  Layers,
  Smartphone,
  Cloud,
  Cpu,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SpotlightCard } from "@/src/components/ui/spotlight-card";
import { InteractiveArchitectureShowcase } from "@/src/components/diagrams/interactive-architecture-showcase";
import { HowItWorksSection } from "@/src/components/onboarding/how-it-works-section";
import { FaqAccordion } from "@/src/components/onboarding/faq-accordion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr
    ? "Doğrudan & Komisyonsuz Yazılım Projeleri | Operis"
    : "Direct & Zero-Fee Tech Projects | Operis";

  const description = isTr
    ? "Türkiye ve küresel teknoloji profesyonelleri için doğrudan ve güvenli serbest çalışma platformu. Komisyon yok, aracı yok, %100 doğrudan iş birliği."
    : "Direct, transparent freelance matching for software engineers and technology professionals. Zero commission, zero escrow, 100% direct collaboration.";

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        tr: "/tr",
        en: "/en",
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}`,
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

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isTr = locale === "tr";

  const categories = [
    {
      slug: "frontend-ui",
      name: isTr ? "Ön Yüz (Frontend) Geliştirme" : "Frontend Development",
      description: isTr
        ? "React, Next.js, Vue, TypeScript ve modern web arayüzleri."
        : "React, Next.js, Vue, TypeScript, and modern web interfaces.",
      icon: Code,
      tags: ["React", "Next.js", "TypeScript", "Tailwind"],
      accent: "from-blue-500/20 to-cyan-500/20",
    },
    {
      slug: "backend-api",
      name: isTr ? "Arka Yüz (Backend) Geliştirme" : "Backend Development",
      description: isTr
        ? "Node.js, Go, Python, PostgreSQL ve mikroservis mimarileri."
        : "Node.js, Go, Python, PostgreSQL, and microservices.",
      icon: Server,
      tags: ["Node.js", "Go", "PostgreSQL", "GraphQL"],
      accent: "from-indigo-500/20 to-blue-500/20",
    },
    {
      slug: "web-development",
      name: isTr ? "Full Stack Geliştirme" : "Full Stack Development",
      description: isTr
        ? "Uçtan uca web ve SaaS uygulaması geliştirme projeleri."
        : "End-to-end web applications and SaaS development.",
      icon: Layers,
      tags: ["Full Stack", "SaaS", "Next.js", "System Design"],
      accent: "from-violet-500/20 to-indigo-500/20",
    },
    {
      slug: "mobile-development",
      name: isTr ? "Mobil Uygulama Geliştirme" : "Mobile App Development",
      description: isTr
        ? "React Native, Flutter, Swift ve Kotlin mobil çözümleri."
        : "React Native, Flutter, Swift, and Kotlin mobile apps.",
      icon: Smartphone,
      tags: ["React Native", "Flutter", "iOS", "Android"],
      accent: "from-cyan-500/20 to-teal-500/20",
    },
    {
      slug: "devops-cloud",
      name: isTr ? "DevOps ve Bulut Altyapısı" : "DevOps & Cloud Infrastructure",
      description: isTr
        ? "Docker, Kubernetes, AWS, GCP, CI/CD ve dağıtık sistemler."
        : "Docker, Kubernetes, AWS, GCP, CI/CD, and distributed systems.",
      icon: Cloud,
      tags: ["Kubernetes", "AWS", "Docker", "CI/CD"],
      accent: "from-sky-500/20 to-blue-500/20",
    },
    {
      slug: "ai-ml",
      name: isTr ? "Yapay Zeka ve Makine Öğrenimi" : "AI & Machine Learning",
      description: isTr
        ? "LLM entegrasyonları, NLP, bilgisayarlı görü ve veri modelleri."
        : "LLM integration, NLP, computer vision, and machine learning models.",
      icon: Cpu,
      tags: ["LLM", "Python", "PyTorch", "OpenAI"],
      accent: "from-purple-500/20 to-pink-500/20",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `https://operis.pro/${locale}/#website`,
        url: `https://operis.pro/${locale}`,
        name: "Operis",
        description: isTr
          ? "Teknoloji ve Yazılım Serbest Çalışan Platformu"
          : "Modern Tech & Software Convergent Talent Platform",
        inLanguage: locale,
      },
      {
        "@type": "Organization",
        "@id": "https://operis.pro/#organization",
        name: "Operis Teknoloji Anonim Şirketi",
        url: "https://operis.pro",
        logo: "https://operis.pro/operis.svg",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+90-212-555-0100",
          contactType: "customer service",
          availableLanguage: ["Turkish", "English"],
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
        ],
      },
    ],
  };

  return (
    <main className="flex flex-col w-full overflow-hidden">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Expansive Hero Section */}
      <section className="relative flex flex-col justify-center items-center min-h-[calc(100dvh-4rem)] w-full px-4 sm:px-6 lg:px-8 text-center py-6 sm:py-8 snap-start scroll-mt-16">
        <div className="mx-auto max-w-6xl w-full space-y-6 sm:space-y-8">
          {/* Display Typography with Masked Gradients */}
          <div className="space-y-4 sm:space-y-6">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--color-text-primary)] max-w-5xl mx-auto leading-[1.1]">
              {isTr ? (
                <>
                  Yazılım Projelerinde{" "}
                  <span className="text-gradient-accent">Aracısız, Doğrudan</span> ve Güvenli İş
                  Birliği
                </>
              ) : (
                <>
                  Direct, Transparent & <span className="text-gradient-accent">Zero-Escrow</span>{" "}
                  Tech Matching
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto leading-relaxed">
              {isTr
                ? "Aracı komisyonu yok. Halka açık teklif savaşları yok. 7 günlük canlılık radarı ve AES-256-GCM ile şifrelenmiş birebir tekliflerle üst düzey yazılım profesyonelleriyle doğrudan eşleşin."
                : "Zero commission cuts. Zero public bidding wars. Direct peer-to-peer collaboration protected by strict 7-day freshness guarantees and encrypted 1-to-1 proposals."}
            </p>
          </div>

          {/* Living Reactive CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
            <Link href={isTr ? "/tr/akis" : "/en/feed"} className="w-full sm:w-auto">
              <Button variant="shimmer" size="lg" className="w-full sm:w-auto px-8 py-4 text-base">
                <span>{isTr ? "İlanları Keşfet" : "Browse Projects"}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link
              href={isTr ? "/tr/ilanlar/yeni" : "/en/listings/new"}
              className="w-full sm:w-auto"
            >
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto px-8 py-4 text-base"
              >
                {isTr ? "Ücretsiz İlan Yayınla" : "Post a Project"}
              </Button>
            </Link>
          </div>

          {/* Key Metrics / Value Propositions Strip */}
          <div className="pt-6 border-t border-[var(--color-border-subtle)]/60 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-center">
            <div className="p-3 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold text-blue-500 font-display">%0</div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {isTr ? "Komisyon Kesintisi" : "Platform Escrow Fee"}
              </div>
            </div>
            <div className="p-3 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold text-cyan-400 font-display">
                {isTr ? "1 Hafta" : "1 Week"}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {isTr ? "Maksimum İlan Canlılığı" : "Freshness Lifecycle"}
              </div>
            </div>
            <div className="p-3 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold text-indigo-400 font-display">Gizli</div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {isTr ? "Birebir Şifreli Teklif" : "Encrypted Offers"}
              </div>
            </div>
            <div className="p-3 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold text-emerald-400 font-display">%100</div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {isTr ? "Doğrudan İletişim" : "Direct Relationship"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive SVG Architecture Showcase */}
      <section className="relative flex flex-col justify-center items-center min-h-[calc(100dvh-4rem)] w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 snap-start scroll-mt-16">
        <div className="mx-auto max-w-7xl w-full space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isTr ? "Temel Avantajlar" : "Key Advantages"}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {isTr ? "Operis'i Farklı Kılan 3 Temel Prensip" : "3 Core Principles Powering Operis"}
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">
              {isTr
                ? "Aracısız, komisyonsuz ve tekliflerinizi rakiplerden koruyan güvenli ve bağımsız bir çalışma ekosistemi."
                : "Direct, zero-commission, and privacy-first collaboration designed for modern tech teams and independent engineers."}
            </p>
          </div>

          <InteractiveArchitectureShowcase isTr={isTr} />
        </div>
      </section>

      {/* 3. Dynamic Tech Category Matrix */}
      <section className="relative flex flex-col justify-center items-center min-h-[calc(100dvh-4rem)] w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 snap-start scroll-mt-16">
        <div className="mx-auto max-w-7xl w-full space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                <Code className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isTr ? "Teknoloji Dizinleri" : "Engineering Fields"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] mt-1">
                {isTr ? "Uzmanlık Alanlarına Göre Keşfedin" : "Explore by Specialization"}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {isTr
                  ? "İlgi duyduğunuz kategorideki güncel projeleri inceleyin veya doğrudan teklif verin."
                  : "Follow specialized categories to match with relevant, high-impact software projects."}
              </p>
            </div>
            <Link
              href={isTr ? "/tr/kategoriler" : "/en/categories"}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors"
            >
              <span>{isTr ? "Tüm Kategorileri Gör" : "View All Categories"}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.slice(0, 6).map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  href={isTr ? `/tr/akis?category=${cat.slug}` : `/en/feed?category=${cat.slug}`}
                  className="group block"
                >
                  <SpotlightCard className="h-full p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-blue-500/40">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-500 group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <ArrowRight
                        className="h-4 w-4 text-[var(--color-text-tertiary)] group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                        aria-hidden="true"
                      />
                    </div>

                    <h3 className="font-bold text-base text-[var(--color-text-primary)] group-hover:text-blue-400 transition-colors mb-2">
                      {cat.name}
                    </h3>

                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-4">
                      {cat.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--color-border-subtle)]/50">
                      {cat.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-[var(--color-surface-hover)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </SpotlightCard>
                </Link>
              );
            })}
          </div>

          {/* Clean "Explore All 21+ Categories" Callout Banner */}
          <div className="mt-8 rounded-2xl border border-[var(--color-border-subtle)] bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                {isTr
                  ? "Tüm 21+ Teknoloji ve Mühendislik Disiplini"
                  : "Explore All 21+ Technology Disciplines"}
              </h4>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {isTr
                  ? "Yapay Zeka, Bulut Bilişim, Siber Güvenlik, Donanım, Blokzincir ve daha fazlasını inceleyin."
                  : "Discover AI, Cloud Computing, Cybersecurity, Hardware, Blockchain, and more."}
              </p>
            </div>
            <Link
              href={isTr ? "/tr/kategoriler" : "/en/categories"}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-all shrink-0"
            >
              <span>{isTr ? "Kategorileri Keşfet" : "Explore Categories"}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Zero Escrow & Direct Guarantee Bento */}
      <section className="relative flex flex-col justify-center items-center min-h-[calc(100dvh-4rem)] w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 snap-start scroll-mt-16">
        <div className="mx-auto max-w-7xl w-full">
          <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 p-8 sm:p-12 backdrop-blur-xl space-y-8">
            <div className="max-w-3xl space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {isTr
                  ? "Neden Klasik Freelance Platformları Yerine Bu Platform?"
                  : "Why Modern Tech Teams Prefer Direct Matching?"}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {isTr
                  ? "Geleneksel siteler kullanıcıları bir emanet havuzuna hapseder, yüksek komisyonlar keser ve iletişimi sansürler. Biz bu modeli ortadan kaldırdık."
                  : "Traditional sites trap parties in restrictive escrow locks and demand heavy commission cuts. We built a direct discovery venue instead."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group relative overflow-hidden flex items-start gap-4 p-5 rounded-3xl bg-[var(--color-surface-base)]/60 border border-[var(--color-border-subtle)] backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[var(--color-text-primary)]">
                    {isTr ? "Sıfır Komisyon" : "0% Escrow Fee"}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {isTr
                      ? "İş veren ile yazılımcı arasındaki ödeme trafiğine karışılmaz; kazancın tamamı sizde kalır."
                      : "No payment intermediary cuts. 100% of the negotiated budget goes to the engineer."}
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden flex items-start gap-4 p-5 rounded-3xl bg-[var(--color-surface-base)]/60 border border-[var(--color-border-subtle)] backdrop-blur-xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[var(--color-text-primary)]">
                    {isTr ? "Fiyat Kırma Savaşlarına Son" : "No Public Price Wars"}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {isTr
                      ? "Teklifler gizlidir; rakipler fiyatınızı göremez ve emeğinizin değeri korunur."
                      : "Private blind offers prevent destructive race-to-the-bottom undercut bidding."}
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden flex items-start gap-4 p-5 rounded-3xl bg-[var(--color-surface-base)]/60 border border-[var(--color-border-subtle)] backdrop-blur-xl transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[var(--color-text-primary)]">
                    {isTr ? "Doğrudan Sözleşme Özgürlüğü" : "Direct Commercial Autonomy"}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {isTr
                      ? "Eşleşme sağlandıktan sonra istediğiniz sözleşme ve ödeme yöntemiyle doğrudan çalışın."
                      : "Choose any payment milestone, legal contract, or invoicing mechanism directly."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Interactive Dual-Role Onboarding (How It Works) */}
      <HowItWorksSection locale={locale} />

      {/* 6. Frequently Asked Questions (FAQ) */}
      <FaqAccordion locale={locale} />

      {/* 7. Legal & Final Closing CTA */}
      <section className="relative flex flex-col justify-center items-center min-h-[calc(100dvh-4rem)] w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 snap-start scroll-mt-16">
        <div className="mx-auto max-w-5xl w-full space-y-8">
          {/* Final High-Impact CTA Card */}
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-[var(--color-surface-base)]/80 to-indigo-950/30 p-8 sm:p-12 text-center space-y-6 backdrop-blur-xl shadow-2xl shadow-blue-500/10">
            <div
              className="pointer-events-none absolute -top-32 -right-32 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
              aria-hidden="true"
            />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
              {isTr ? "Yazılım Projenizi Bugün Başlatın" : "Launch Your Tech Project Today"}
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
              {isTr
                ? "Aracı komisyonu olmadan, doğrudan ve şifrelenmiş tekliflerle en iyi yazılım uzmanlarıyla hemen eşleşin."
                : "Zero commission cuts. Connect directly with top software engineers through secure encrypted offers."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href={isTr ? "/tr/akis" : "/en/feed"} className="w-full sm:w-auto">
                <Button
                  variant="shimmer"
                  size="lg"
                  className="w-full sm:w-auto px-8 py-4 text-base"
                >
                  <span>{isTr ? "İlanları Keşfet" : "Browse Projects"}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
              <Link
                href={isTr ? "/tr/ilanlar/yeni" : "/en/listings/new"}
                className="w-full sm:w-auto"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto px-8 py-4 text-base"
                >
                  {isTr ? "Ücretsiz İlan Yayınla" : "Post a Project"}
                </Button>
              </Link>
            </div>
          </div>

          {/* Platform Operation Notice */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/60 p-6 sm:p-8 text-xs text-[var(--color-text-tertiary)] leading-relaxed space-y-2 backdrop-blur-xl shadow-sm">
            <div
              className="pointer-events-none absolute -top-24 -left-24 w-52 h-52 rounded-full bg-blue-500/5 blur-3xl"
              aria-hidden="true"
            />
            <p className="font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">
              {isTr ? "Platform İşleyiş Duyurusu & Şeffaflık" : "Platform Operation Notice"}
            </p>
            <p>
              {isTr
                ? "Yürürlükteki mevzuatın izin verdiği azami ölçüde, bu platform yalnızca bir keşif ve eşleştirme ortamıdır. Platform üzerinde ödeme alınmaz, emanet (escrow) sistemi işletilmez, kullanıcılar adına fatura düzenlenmez ve taraflar arasındaki ticari veya sözleşmesel uyuşmazlıklarda hakemlik yapılmaz."
                : "To the maximum extent permitted by applicable law, this platform operates strictly as a discovery and matching venue. The platform does not process payments, hold escrow funds, issue client invoices, or resolve commercial or contractual disputes between parties."}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

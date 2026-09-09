import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { locales, Locale } from "@/src/lib/i18n/config";
import { ThemeProvider } from "@/src/components/layout/theme-provider";
import { Header } from "@/src/components/layout/header";
import { Footer } from "@/src/components/layout/footer";
import { getSession } from "@/src/modules/auth/session";
import { ProfileService } from "@/src/modules/profiles/service";
import "@/src/styles/tokens.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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
      default: title,
      template: `%s | Operis`,
    },
    description,
    metadataBase: new URL("https://operis.pro"),
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
      type: "website",
      locale: locale === "tr" ? "tr_TR" : "en_US",
    },
  };
}

export default async function RootLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages =
    locale === "en"
      ? (await import("@/messages/en.json")).default
      : (await import("@/messages/tr.json")).default;

  const session = await getSession();
  let initialProfile = null;
  if (session?.userId) {
    try {
      const p = await ProfileService.getProfileByUserId(session.userId);
      if (p) {
        initialProfile = {
          displayName: p.displayName,
          handle: p.handle,
        };
      }
    } catch {
      initialProfile = null;
    }
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider defaultTheme="light">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-semibold transition-all"
        >
          {locale === "tr" ? "Ana içeriğe atla" : "Skip to main content"}
        </a>
        <div className="flex min-h-screen flex-col">
          <Header initialSession={session} initialProfile={initialProfile} />
          <div id="main-content" className="flex-1">
            {children}
          </div>
          <Footer />
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}

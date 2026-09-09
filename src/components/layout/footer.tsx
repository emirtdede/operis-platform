"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Locale } from "@/src/lib/i18n/config";
import { getLocalizedRoute, getLocalizedLegalPath } from "@/src/lib/i18n/routes";
import { BrandLogo } from "./brand-logo";
import { FooterQuickSettings } from "./footer-quick-settings";

export function Footer() {
  const t = useTranslations("footer");
  const legal = useTranslations("legal");
  const common = useTranslations("common");
  const params = useParams();
  const locale = ((params?.locale as string) || "tr") as Locale;
  const isTr = locale === "tr";
  const pathname = usePathname();
  const isHomePage = pathname === `/${locale}` || pathname === `/${locale}/` || pathname === "/";
  const currentYear = new Date().getFullYear();

  const platformLinks = [
    {
      href: getLocalizedRoute("feed", locale),
      label: isTr ? "Proje Akışı" : "Project Feed",
    },
    {
      href: getLocalizedRoute("listings", locale),
      label: isTr ? "İlanları Keşfet" : "Browse Listings",
    },
    {
      href: getLocalizedRoute("categories", locale),
      label: isTr ? "Teknoloji Kategorileri" : "Tech Categories",
    },
    {
      href: getLocalizedRoute("newListing", locale),
      label: isTr ? "Proje İlanı Yayınla" : "Post a Project",
    },
    {
      href: getLocalizedRoute("help", locale),
      label: isTr ? "Yardım & SSS" : "Help & FAQ",
    },
  ];

  const architectureLinks = [
    {
      href: getLocalizedRoute("about", locale),
      label: isTr ? "Hakkımızda & Manifesto" : "About & Manifesto",
    },
    {
      href: getLocalizedRoute("contact", locale),
      label: isTr ? "İletişim & Destek" : "Contact & Support",
    },
    {
      href: isTr ? "/tr/akis?category=fullstack-development" : "/en/feed?category=fullstack-development",
      label: isTr ? "%0 Komisyon Modeli" : "0% Escrow Cut Model",
    },
    {
      href: isTr ? "/tr/akis" : "/en/feed",
      label: isTr ? "AES-256 Şifreli Teklifler" : "AES-256 Blind Offers",
    },
    {
      href: isTr ? "/tr/akis" : "/en/feed",
      label: isTr ? "1 Haftalık Canlılık Radarı" : "1-Week Freshness Radar",
    },
    {
      href: getLocalizedRoute("report", locale),
      label: isTr ? "Kötüye Kullanım Bildir" : "Report Abuse",
    },
  ];

  const legalLinks = [
    { href: getLocalizedLegalPath("terms", locale), label: legal("terms.title") },
    { href: getLocalizedLegalPath("privacy", locale), label: legal("privacy.title") },
    { href: getLocalizedLegalPath("matching-disclaimer", locale), label: legal("matching.title") },
    { href: getLocalizedLegalPath("acceptable-use", locale), label: legal("acceptableUse.title") },
    { href: getLocalizedLegalPath("cookies", locale), label: legal("cookies.title") },
    { href: getLocalizedLegalPath("contact", locale), label: legal("contact.title") },
  ];

  return (
    <footer
      className={`relative border-t border-[var(--color-border-subtle)]/80 bg-[var(--color-surface-base)]/75 backdrop-blur-2xl text-[var(--color-text-secondary)] transition-all snap-start scroll-mt-16 overflow-hidden ${
        isHomePage ? "min-h-[calc(100dvh-4rem)] flex flex-col justify-center" : ""
      }`}
    >
      {/* Top Ambient Glow Line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent" />
      
      {/* Subtle Background Radial Glow */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-gradient-to-t from-blue-500/10 via-indigo-500/5 to-transparent blur-3xl rounded-full" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-10 sm:py-14 space-y-10 sm:space-y-12 relative z-10">
        {/* Balanced 4 Equal Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogo size="md" showText={true} />
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {isTr
                ? "Yazılım mühendisleri ve teknoloji ekipleri için doğrudan, şeffaf ve %100 komisyonsuz bağımsız eşleştirme ağı."
                : "Direct, transparent, zero-commission software discovery network connecting verified engineers with modern teams."}
            </p>
          </div>

          {/* Col 2: Platform Navigation */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              {isTr ? "Platform & Keşfet" : "Platform"}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {platformLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-[var(--color-text-primary)] hover:translate-x-0.5 transition-all text-[var(--color-text-secondary)] inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Architecture & Security */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              {isTr ? "Mimari & Güvenlik" : "Architecture"}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {architectureLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="hover:text-[var(--color-text-primary)] hover:translate-x-0.5 transition-all text-[var(--color-text-secondary)] inline-block"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Legal & Transparency */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              {isTr ? "Yasal & Şeffaflık" : "Legal & Trust"}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-[var(--color-text-primary)] hover:translate-x-0.5 transition-all inline-block text-[var(--color-text-secondary)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Clean Sub-Footer Bar Without Duplicated Legal Links */}
        <div className="border-t border-[var(--color-border-subtle)] pt-6 flex items-center justify-between gap-4 text-xs text-[var(--color-text-tertiary)]">
          <p>
            © {currentYear} {common("appName")}. {t("rights")}
          </p>

          {/* Frameless Icon-Only Quick Settings */}
          <FooterQuickSettings />
        </div>
      </div>

      {/* Massive Modern Operis Watermark Logo at Base */}
      <div className="relative w-full flex justify-center items-end overflow-hidden pointer-events-none select-none -mt-6 sm:-mt-8">
        <div
          className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-center"
          style={{
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.12) 80%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.12) 80%, transparent 100%)",
          }}
        >
          <svg
            viewBox="0 0 500 120"
            width="100%"
            height="auto"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full max-h-44 sm:max-h-60 md:max-h-72 lg:max-h-84 object-contain text-[var(--color-text-primary)] opacity-15 dark:opacity-20 transition-opacity duration-300"
            aria-hidden="true"
          >
            <g>
              <g transform="translate(8, 22) scale(0.62)">
                <path
                  d="M 25.50 124.50 A 70 70 0 0 1 124.50 25.50"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 36.11 113.89 A 55 55 0 0 1 113.89 36.11"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 46.72 103.28 A 40 40 0 0 1 103.28 46.72"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M 113.89 36.11 A 55 55 0 0 1 36.11 113.89"
                  stroke="currentColor"
                  strokeWidth="40"
                  strokeLinecap="butt"
                  fill="none"
                />
              </g>
              <text
                x="100"
                y="100"
                fill="currentColor"
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: "104px",
                  letterSpacing: "0.08em",
                }}
              >
                PERIS
              </text>
            </g>
          </svg>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { href: getLocalizedLegalPath("terms", locale), label: legal("terms.title") },
    { href: getLocalizedLegalPath("privacy", locale), label: legal("privacy.title") },
    { href: getLocalizedLegalPath("matching-disclaimer", locale), label: legal("matching.title") },
    { href: getLocalizedLegalPath("acceptable-use", locale), label: legal("acceptableUse.title") },
    { href: getLocalizedLegalPath("cookies", locale), label: legal("cookies.title") },
    { href: getLocalizedLegalPath("contact", locale), label: legal("contact.title") },
  ];

  return (
    <footer className="relative border-t border-[var(--color-border-subtle)]/80 bg-[var(--color-surface-base)]/75 backdrop-blur-xl text-[var(--color-text-secondary)] transition-all">
      {/* Top Ambient Glow Line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <BrandLogo size="md" showText={true} />
            <p className="text-sm max-w-md text-[var(--color-text-secondary)] leading-relaxed">
              {t("tagline")}
            </p>
            <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/70 p-4 text-xs leading-relaxed text-[var(--color-text-tertiary)] max-w-lg backdrop-blur-sm">
              {t("disclaimer")}
            </div>
          </div>

          {/* Navigation Col */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-3">
              {common("appName")}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={getLocalizedRoute("feed", locale)}
                  className="hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {locale === "tr" ? "Proje Akışı" : "Project Feed"}
                </Link>
              </li>
              <li>
                <Link
                  href={getLocalizedRoute("listings", locale)}
                  className="hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {locale === "tr" ? "İlanları Keşfet" : "Browse Listings"}
                </Link>
              </li>
              <li>
                <Link
                  href={getLocalizedRoute("categories", locale)}
                  className="hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {locale === "tr" ? "Teknoloji Kategorileri" : "Technology Categories"}
                </Link>
              </li>
              <li>
                <Link
                  href={getLocalizedRoute("newListing", locale)}
                  className="hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {locale === "tr" ? "Proje İlanı Yayınla" : "Post a Project"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Col */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)] mb-3">
              {locale === "tr" ? "Yasal & Şeffaflık" : "Legal & Compliance"}
            </h3>
            <ul className="space-y-2 text-sm">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--color-border-subtle)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-tertiary)]">
          <p>
            © {currentYear} {common("appName")}. {t("rights")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href={getLocalizedLegalPath("privacy", locale)}
              className="hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {legal("privacy.title")}
            </Link>
            <Link
              href={getLocalizedLegalPath("terms", locale)}
              className="hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {legal("terms.title")}
            </Link>
            <Link
              href={getLocalizedLegalPath("contact", locale)}
              className="hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {legal("contact.title")}
            </Link>

            <div className="h-4 w-px bg-[var(--color-border-subtle)] hidden sm:block" />

            {/* Frameless Icon-Only Quick Settings */}
            <FooterQuickSettings />
          </div>
        </div>
      </div>
    </footer>
  );
}

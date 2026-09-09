"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LogIn, UserPlus } from "lucide-react";
import { Locale } from "@/src/lib/i18n/config";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";
import { BrandLogo } from "./brand-logo";
import { Button } from "../ui/button";

export function Header() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const params = useParams();
  const locale = ((params?.locale as string) || "tr") as Locale;
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: getLocalizedRoute("feed", locale), label: t("feed") },
    { href: getLocalizedRoute("listings", locale), label: t("browse") },
    { href: getLocalizedRoute("categories", locale), label: t("categories") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--color-border-subtle)]/80 bg-[var(--color-surface-base)]/75 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <div className="flex items-center shrink-0">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label={common("appName")}
          >
            <BrandLogo size="md" showText={true} />
          </Link>
        </div>

        {/* Center: Main Navigation (Centered) */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex flex-1 items-center justify-center gap-1"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] shadow-sm font-semibold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Premium Auth Buttons */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <Link href={getLocalizedRoute("login", locale)}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-xl px-4 border border-transparent hover:border-[var(--color-border-subtle)] hover:shadow-sm transition-all"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              {t("login")}
            </Button>
          </Link>

          <Link href={getLocalizedRoute("register", locale)}>
            <Button
              variant="primary"
              size="sm"
              className="gap-2 rounded-xl px-5 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("register")}
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/95 backdrop-blur-2xl px-4 pt-3 pb-6 md:hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3.5 py-2.5 text-base font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-4">
              <Link
                href={getLocalizedRoute("register", locale)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="primary" className="w-full gap-2">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {t("register")}
                </Button>
              </Link>
              <Link
                href={getLocalizedRoute("login", locale)}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="outline" className="w-full gap-2">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {t("login")}
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

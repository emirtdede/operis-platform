"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LogIn,
  UserPlus,
  LogOut,
  Bell,
  Settings,
  User,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  ChevronDown,
  Briefcase,
} from "lucide-react";
import { Locale } from "@/src/lib/i18n/config";
import {
  getLocalizedRoute,
  getAlternateLocalePath,
  getLocalizedLegalPath,
} from "@/src/lib/i18n/routes";
import { BrandLogo } from "./brand-logo";
import { Button } from "../ui/button";
import { useTheme } from "./theme-provider";
import type { SessionPayload } from "@/src/modules/auth/session";

export interface HeaderProps {
  initialSession?: SessionPayload | null;
  initialProfile?: { displayName: string; handle: string } | null;
}

/**
 * Calculates crisp user initials (e.g. "Demir Yıldız" -> "DY", "Demir" -> "DE")
 */
export function getInitials(name?: string | null, email?: string | null): string {
  const cleanName = name?.trim();
  if (cleanName && cleanName.length > 0) {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    const firstWord = parts[0];
    const lastWord = parts[parts.length - 1];
    if (parts.length >= 2 && firstWord && lastWord) {
      const first = firstWord.charAt(0);
      const last = lastWord.charAt(0);
      return (first + last).toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    const userPart = email.split("@")[0] || "";
    const cleanUser = userPart.replace(/[^a-zA-Z0-9]/g, "");
    return cleanUser.slice(0, 2).toUpperCase() || "DY";
  }
  return "DY";
}

export function Header({ initialSession, initialProfile }: HeaderProps) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const params = useParams();
  const locale = ((params?.locale as string) || "tr") as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isTr = locale === "tr";
  const session = initialSession;

  // Resolve clean display name & handle
  const displayName =
    initialProfile?.displayName ||
    (session?.email === "kullanici@operis.pro"
      ? "Demir Yıldız"
      : session?.email
        ? session.email.split("@")[0]
        : "");
  const handle =
    initialProfile?.handle ||
    (session?.email === "kullanici@operis.pro" ? "demokullanici" : "");
  const initials = getInitials(displayName, session?.email);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const navLinks = [
    { href: getLocalizedRoute("feed", locale), label: t("feed") },
    { href: getLocalizedRoute("listings", locale), label: t("browse") },
    { href: getLocalizedRoute("categories", locale), label: t("categories") },
  ];

  if (session) {
    navLinks.push({
      href: getLocalizedRoute("dashboardListings", locale),
      label: isTr ? "Çalışma Alanım" : "Workspace",
    });
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(`/${locale}`);
      router.refresh();
    } catch {
      window.location.href = `/${locale}`;
    }
  };

  const handleLanguageSelect = (newLocale: Locale) => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    if (newLocale === locale) return;
    try {
      localStorage.setItem("fp_locale", newLocale);
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore in restricted environments
    }
    const targetPath = getAlternateLocalePath(pathname, newLocale);
    router.push(targetPath);
  };

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-[var(--color-border-subtle)] backdrop-blur-xl transition-all"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-surface-base) 88%, transparent)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <div className="flex items-center lg:flex-1 justify-start shrink-0">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label={common("appName")}
          >
            <BrandLogo size="md" showText={true} />
          </Link>
        </div>

        {/* Center: Main Navigation (Perfect Dead Center) */}
        <nav
          aria-label="Main Navigation"
          className="hidden lg:flex shrink-0 items-center justify-center gap-1"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`min-w-[104px] whitespace-nowrap justify-center text-center rounded-xl px-4 py-1.5 text-sm font-medium transition-all flex items-center ${isActive
                    ? "bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] shadow-sm font-semibold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Premium Auth / User Area */}
        <div className="hidden lg:flex lg:flex-1 items-center justify-end gap-2.5 shrink-0">
          {session ? (
            <div className="flex items-center gap-2">
              {/* Quick Notification Bell */}
              <Link
                href={getLocalizedRoute("dashboardNotifications", locale)}
                className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-transparent hover:border-[var(--color-border-subtle)] transition-all"
                title={isTr ? "Bildirim Merkezi" : "Notifications"}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
              </Link>

              {/* User Pill Button & Dropdown Container */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] text-xs font-medium text-[var(--color-text-primary)] hover:border-blue-500/40 hover:shadow-sm transition-all cursor-pointer"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  aria-label={isTr ? "Kullanıcı Menüsü" : "User Menu"}
                >
                  <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] tracking-tight">
                    {initials}
                  </div>
                  <span className="max-w-[130px] truncate font-semibold">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-[var(--color-text-tertiary)] transition-transform duration-200 ${userMenuOpen ? "rotate-180 text-blue-400" : ""
                      }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Dropdown Menu Modal */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-[var(--color-border-subtle)] p-2 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-150 z-50 select-none text-xs"
                    style={{
                      backgroundColor: "var(--color-surface-base)",
                      borderColor: "var(--color-border-subtle)",
                      boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--color-border-subtle)",
                    }}
                    role="menu"
                    aria-orientation="vertical"
                  >
                    {/* Header: User Badge & Identity */}
                    <div
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border-subtle)] mb-2"
                      style={{
                        backgroundColor: "var(--color-surface-hover)",
                      }}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-sm text-white shadow-md shadow-blue-500/25">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-[var(--color-text-primary)] truncate">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                          @{handle || "demokullanici"}
                        </div>
                      </div>
                    </div>

                    {/* Group 1: Navigation Links */}
                    <div className="space-y-0.5 border-b border-[var(--color-border-subtle)] pb-2 mb-2">
                      {/* Çalışma Alanım */}
                      <Link
                        href={getLocalizedRoute("dashboardListings", locale)}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                        role="menuitem"
                      >
                        <Briefcase className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                        <span className="font-medium">{isTr ? "Çalışma Alanım" : "Workspace"}</span>
                      </Link>

                      {/* Profil */}
                      <Link
                        href={`/${locale}/u/${handle || "demokullanici"}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                        role="menuitem"
                      >
                        <User className="h-4 w-4 text-blue-400" aria-hidden="true" />
                        <span className="font-medium">{isTr ? "Profilimi Gör" : "View Profile"}</span>
                      </Link>

                      {/* Bildirimler */}
                      <Link
                        href={getLocalizedRoute("dashboardNotifications", locale)}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                        role="menuitem"
                      >
                        <Bell className="h-4 w-4 text-amber-400" aria-hidden="true" />
                        <span className="font-medium">{isTr ? "Bildirimler" : "Notifications"}</span>
                      </Link>

                      {/* Ayarlar */}
                      <Link
                        href={getLocalizedRoute("dashboardSettings", locale)}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                        role="menuitem"
                      >
                        <Settings className="h-4 w-4 text-purple-400" aria-hidden="true" />
                        <span className="font-medium">{isTr ? "Hesap Ayarları" : "Account Settings"}</span>
                      </Link>

                      {/* Yasal ve Güven Merkezi */}
                      <Link
                        href={getLocalizedLegalPath("terms", locale)}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
                        role="menuitem"
                      >
                        <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        <span className="font-medium">{isTr ? "Yasal & Güven Merkezi" : "Legal & Trust Center"}</span>
                      </Link>
                    </div>

                    {/* Group 2: Quick Preferences (Dil & Tema) */}
                    <div className="space-y-2 border-b border-[var(--color-border-subtle)] pb-2.5 mb-2 px-1">
                      {/* Dil Seçimi */}
                      <div className="flex items-center justify-between px-2 text-[11px] text-[var(--color-text-tertiary)]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Globe className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                          <span>{isTr ? "Dil" : "Language"}</span>
                        </div>
                        <div
                          className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-border-subtle)]"
                          style={{
                            backgroundColor: "var(--color-surface-hover)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleLanguageSelect("tr")}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${locale === "tr"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                              }`}
                          >
                            TR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLanguageSelect("en")}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${locale === "en"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                              }`}
                          >
                            EN
                          </button>
                        </div>
                      </div>

                      {/* Tema Seçimi */}
                      <div className="flex items-center justify-between px-2 text-[11px] text-[var(--color-text-tertiary)]">
                        <div className="flex items-center gap-1.5 font-medium">
                          {theme === "dark" || theme === "black" ? (
                            <Moon className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                          ) : (
                            <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                          )}
                          <span>{isTr ? "Tema" : "Theme"}</span>
                        </div>
                        <div
                          className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--color-border-subtle)]"
                          style={{
                            backgroundColor: "var(--color-surface-hover)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setTheme("dark")}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${theme === "dark" || theme === "black"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                              }`}
                          >
                            {isTr ? "Koyu" : "Dark"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme("light")}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${theme === "light"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                              }`}
                          >
                            {isTr ? "Açık" : "Light"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Group 3: Çıkış Yap */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors font-medium cursor-pointer"
                      role="menuitem"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>{isTr ? "Çıkış Yap" : "Sign Out"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2 ml-auto">
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
        <div
          className="border-b border-[var(--color-border-subtle)] backdrop-blur-2xl px-4 pt-3 pb-6 lg:hidden animate-in fade-in-0 slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: "var(--color-surface-base)",
          }}
        >
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
              {session ? (
                <>
                  <div
                    className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-secondary)] rounded-xl border border-[var(--color-border-subtle)]"
                    style={{
                      backgroundColor: "var(--color-surface-hover)",
                    }}
                  >
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-[var(--color-text-primary)] truncate">
                        {displayName}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-tertiary)] truncate">
                        @{handle || "demokullanici"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/${locale}/u/${handle || "demokullanici"}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <User className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                      <span>{isTr ? "Profilim" : "Profile"}</span>
                    </Link>
                    <Link
                      href={getLocalizedRoute("dashboardNotifications", locale)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <Bell className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                      <span>{isTr ? "Bildirimler" : "Alerts"}</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={getLocalizedRoute("dashboardSettings", locale)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <Settings className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
                      <span>{isTr ? "Ayarlar" : "Settings"}</span>
                    </Link>
                    <Link
                      href={getLocalizedLegalPath("terms", locale)}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span>{isTr ? "Güven" : "Trust"}</span>
                    </Link>
                  </div>

                  {/* Mobile Language & Theme Row */}
                  <div className="flex items-center justify-between p-2 rounded-xl border border-[var(--color-border-subtle)] text-xs">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => handleLanguageSelect("tr")}
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] ${locale === "tr" ? "bg-blue-600 text-white" : "text-[var(--color-text-secondary)]"
                          }`}
                      >
                        TR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLanguageSelect("en")}
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] ${locale === "en" ? "bg-blue-600 text-white" : "text-[var(--color-text-secondary)]"
                          }`}
                      >
                        EN
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTheme("dark")}
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] ${theme === "dark" || theme === "black" ? "bg-blue-600 text-white" : "text-[var(--color-text-secondary)]"
                          }`}
                      >
                        Koyu
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme("light")}
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] ${theme === "light" ? "bg-blue-600 text-white" : "text-[var(--color-text-secondary)]"
                          }`}
                      >
                        Açık
                      </button>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 text-red-400 hover:text-red-300 cursor-pointer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {isTr ? "Çıkış Yap" : "Sign Out"}
                  </Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { KeyRound, ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/src/components/auth/forgot-password-form";
import { getSession } from "@/src/modules/auth/session";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr
    ? "Şifremi Unuttum — Güvenli Sıfırlama | Operis"
    : "Forgot Password — Secure Recovery | Operis";
  const description = isTr
    ? "Operis hesabınızın şifresini güvenle sıfırlamak için kayıtlı e-posta adresinizi girin."
    : "Enter your registered email address to securely reset your Operis account password.";

  return {
    title,
    description,
    alternates: {
      canonical: isTr ? "/tr/sifremi-unuttum" : "/en/forgot-password",
      languages: {
        tr: "/tr/sifremi-unuttum",
        en: "/en/forgot-password",
      },
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Authenticated users must not access forgot password page; redirect to workspace
  const session = await getSession();
  if (session) {
    redirect(getLocalizedRoute("dashboardListings", locale));
  }

  const isTr = locale === "tr";

  return (
    <main className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-10 shadow-2xl relative overflow-hidden space-y-6">
        {/* Glow */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl"
          aria-hidden="true"
        />

        <header className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-sm">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {isTr ? "Şifrenizi mi Unuttunuz?" : "Forgot Your Password?"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {isTr
              ? "Kayıtlı e-posta adresinizi girdiğinizde size şifre sıfırlama talimatlarını ileteceğiz."
              : "Enter your registered email address and we'll send you recovery instructions."}
          </p>
        </header>

        <ForgotPasswordForm locale={locale} />

        <div className="pt-2 text-center border-t border-[var(--color-border-subtle)]/60">
          <Link
            href={isTr ? "/tr/giris" : "/en/login"}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isTr ? "Giriş Ekranına Geri Dön" : "Back to Sign In"}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

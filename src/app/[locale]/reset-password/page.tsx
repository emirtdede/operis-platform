import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { LockKeyhole, ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/src/components/auth/reset-password-form";
import { getSession } from "@/src/modules/auth/session";
import { getLocalizedRoute } from "@/src/lib/i18n/routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  const title = isTr ? "Yeni Şifre Belirleyin — Operis" : "Set New Password — Operis";
  const description = isTr
    ? "Hesabınız için yeni ve güvenli bir şifre belirleyin."
    : "Set a new and secure password for your Operis account.";

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const sParams = searchParams ? await searchParams : {};
  setRequestLocale(locale);

  // If no reset token is provided and user is authenticated, redirect to workspace
  const session = await getSession();
  if (session && !sParams.token) {
    redirect(getLocalizedRoute("dashboardListings", locale));
  }
  const isTr = locale === "tr";

  return (
    <main className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-10 shadow-2xl relative overflow-hidden space-y-6">
        <header className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-sm">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {isTr ? "Yeni Şifrenizi Belirleyin" : "Create New Password"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {isTr
              ? "En az 12 karakter, bir büyük harf ve bir rakam içeren güçlü bir şifre seçiniz."
              : "Choose a strong password containing at least 12 characters, one uppercase letter, and one number."}
          </p>
        </header>

        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-xs text-[var(--color-text-tertiary)]">
              Yükleniyor...
            </div>
          }
        >
          <ResetPasswordForm locale={locale} />
        </Suspense>

        <div className="pt-2 text-center border-t border-[var(--color-border-subtle)]/60">
          <Link
            href={isTr ? "/tr/giris" : "/en/login"}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isTr ? "Giriş Ekranına Dön" : "Back to Sign In"}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

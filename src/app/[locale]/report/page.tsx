import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { ReportForm } from "@/src/components/reports/report-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: isTr ? "İhlal & Kötüye Kullanım Bildirimi | Operis" : "Submit Abuse Report | Operis",
    description: isTr
      ? "Şüpheli ilanları, dolandırıcılık girişimlerini veya kural ihlallerini Operis güvenlik ekibine bildirin."
      : "Report scam listings, abuse, or policy violations directly to Operis security moderators.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ type?: string; target?: string }>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  setRequestLocale(locale);
  const isTr = locale === "tr";

  return (
    <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-10 shadow-2xl relative overflow-hidden space-y-6">
        <header className="space-y-3 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 shadow-sm">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {isTr ? "Kural İhlali veya Şikayet Bildir" : "Report a Policy Violation"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {isTr
              ? "Operis topluluğunun güvenliğini tehdit eden sahte ilanları, spam veya taciz vakalarını doğrudan moderatörlerimize iletebilirsiniz."
              : "Help protect the Operis community by reporting suspicious projects, scam attempts, or abusive behavior."}
          </p>
        </header>

        <ReportForm
          locale={locale}
          defaultTargetType={sp.type || "listing"}
          defaultTargetIdentifier={sp.target || ""}
        />

        <div className="pt-2 text-center border-t border-[var(--color-border-subtle)]/60">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isTr ? "Ana Sayfaya Dön" : "Return to Home"}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

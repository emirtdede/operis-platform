import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Shield, ArrowLeft } from "lucide-react";
import { getSession } from "@/src/modules/auth/session";
import { getDb, schema } from "@/src/lib/db";
import { eq } from "drizzle-orm";
import { SecuritySettingsView } from "@/src/components/security/security-settings-view";
import { DashboardTabs } from "@/src/components/dashboard/dashboard-tabs";
import { DEFAULT_USER } from "@/src/modules/auth/demo-user";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: isTr ? "Güvenlik & 2FA Ayarları | Operis" : "Security & 2FA Settings | Operis",
    description: isTr
      ? "Hesap şifrenizi güncelleyin ve iki aşamalı doğrulamayı (2FA) yönetin."
      : "Manage account password, two-factor authentication, and security audit.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardSecurityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTr = locale === "tr";

  const session = await getSession();
  if (!session?.userId) {
    redirect(isTr ? "/tr/giris" : "/en/login");
  }

  let twoFactorEnabled = false;
  try {
    const db = getDb();
    const [userRow] = await db
      .select({ twoFactorEnabled: schema.users.twoFactorEnabled })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);
    if (userRow) {
      twoFactorEnabled = Boolean(userRow.twoFactorEnabled);
    } else if (session.userId === DEFAULT_USER.id) {
      twoFactorEnabled = Boolean(DEFAULT_USER.twoFactorEnabled);
    }
  } catch {
    if (session.userId === DEFAULT_USER.id) {
      twoFactorEnabled = Boolean(DEFAULT_USER.twoFactorEnabled);
    } else {
      twoFactorEnabled = false;
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Link
              href={isTr ? "/tr/panel/ayarlar" : "/en/dashboard/settings"}
              className="hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isTr ? "Ayarlara Dön" : "Back to Settings"}</span>
            </Link>
            <span>/</span>
            <span>{isTr ? "Güvenlik" : "Security"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-blue-400" aria-hidden="true" />
            <span>{isTr ? "Güvenlik & Oturum Ayarları" : "Security & Authentication"}</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Şifrenizi yenileyin, iki aşamalı doğrulamayı (2FA) yapılandırın ve oturum güvenliğinizi kontrol edin."
              : "Update your password, configure 2FA TOTP authentication, and verify active security status."}
          </p>
        </div>
      </header>

      <DashboardTabs locale={locale} />

      {/* Security View */}
      <SecuritySettingsView locale={locale} twoFactorEnabled={twoFactorEnabled} />
    </main>
  );
}

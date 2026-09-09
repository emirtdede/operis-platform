import type { Metadata } from "next";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { ShieldAlert, Home, LogIn, Compass } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ErrorCard } from "@/src/components/ui/error-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: isTr ? "403 — Yetkisiz Erişim | Operis" : "403 — Access Denied | Operis",
    description: isTr
      ? "Bu sayfayı görüntülemek için yetkiniz bulunmuyor."
      : "You do not have permission to access this resource.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function UnauthorizedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isTr = locale === "tr";

  return (
    <main
      role="main"
      className="min-h-[75vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
    >
      <ErrorCard
        code="403"
        badgeText="403 ACCESS DENIED"
        badgeColor="rose"
        statusLabel="Operis Security: Access Restricted"
        subtitle={isTr ? "Erişim Reddedildi / Forbidden" : "Forbidden / Access Denied"}
        title={isTr ? "Bu Alana Erişim İzniniz Bulunmuyor" : "You Don't Have Access to This Page"}
        description={
          isTr
            ? "Görüntülemeye çalıştığınız çalışma alanı, panel veya yönetim sayfası yalnızca yetkili kullanıcılar ve proje muhatapları tarafından incelenebilir."
            : "The page or workspace you requested is strictly restricted to authorized project participants."
        }
        icon={<ShieldAlert className="h-8 w-8" aria-hidden="true" />}
      >
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-[var(--color-border-subtle)]/60">
          <Link href={isTr ? "/tr/giris" : "/en/login"}>
            <Button type="button" variant="primary" size="sm" className="gap-2">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? "Farklı Hesapla Giriş Yap" : "Sign In"}</span>
            </Button>
          </Link>

          <Link href={`/${locale}`}>
            <Button type="button" variant="secondary" size="sm" className="gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? "Ana Sayfa" : "Home"}</span>
            </Button>
          </Link>

          <Link href={isTr ? "/tr/ilanlar" : "/en/listings"}>
            <Button type="button" variant="outline" size="sm" className="gap-2">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>{isTr ? "İlanları Keşfet" : "Explore Listings"}</span>
            </Button>
          </Link>
        </div>
      </ErrorCard>
    </main>
  );
}

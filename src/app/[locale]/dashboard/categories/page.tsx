import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { FolderTree, ArrowLeft, Plus } from "lucide-react";
import { getSession } from "@/src/modules/auth/session";
import { CategoryService } from "@/src/modules/categories/service";
import { FollowedCategoriesView } from "@/src/components/dashboard/followed-categories-view";
import { DashboardTabs } from "@/src/components/dashboard/dashboard-tabs";
import { Button } from "@/src/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isTr = locale === "tr";

  return {
    title: isTr ? "Takip Ettiğim Kategoriler | Operis" : "Followed Categories | Operis",
    description: isTr
      ? "Takip ettiğiniz teknoloji kategorileri ve canlı proje bildirimleri."
      : "Manage your followed technology categories and project feed preferences.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function DashboardCategoriesPage({
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

  const allCategories = await CategoryService.getAllCategories(
    locale === "tr" ? "tr" : "en",
    session.userId
  );
  const followed = allCategories.filter((c) => c.isFollowed);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
            <Link
              href={isTr ? "/tr/panel/ilanlarim" : "/en/dashboard/listings"}
              className="hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isTr ? "Çalışma Alanım" : "Workspace"}</span>
            </Link>
            <span>/</span>
            <span>{isTr ? "Kategorilerim" : "Categories"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2.5">
            <FolderTree className="h-6 w-6 text-blue-400" aria-hidden="true" />
            <span>{isTr ? "Takip Ettiğim Kategoriler" : "Followed Categories"}</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isTr
              ? "Uzmanlık alanlarınıza uygun projeleri doğrudan akışınızda görün ve bildirimler alın."
              : "Keep track of projects matching your tech stack with tailored notifications."}
          </p>
        </div>

        <Link href={isTr ? "/tr/kategoriler" : "/en/categories"}>
          <Button variant="primary" size="sm" className="gap-1.5 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isTr ? "Daha Fazla Kategori Ekle" : "Browse All Categories"}</span>
          </Button>
        </Link>
      </header>

      <DashboardTabs locale={locale} />

      {/* Categories Grid */}
      <FollowedCategoriesView categories={followed} locale={locale} />
    </main>
  );
}

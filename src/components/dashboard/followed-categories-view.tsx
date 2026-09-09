"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderTree, BookmarkCheck, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { EmptyState } from "../ui/empty-state";
import { CategoryDto } from "@/src/modules/categories/service";

export interface FollowedCategoriesViewProps {
  categories: CategoryDto[];
  locale: string;
}

export function FollowedCategoriesView({ categories, locale }: FollowedCategoriesViewProps) {
  const isTr = locale === "tr";
  const [items, setItems] = useState<CategoryDto[]>(categories);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (cat: CategoryDto) => {
    setLoadingId(cat.id);
    try {
      const res = await fetch("/api/categories/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: cat.id,
          follow: false,
        }),
      });

      if (res.ok) {
        setItems((prev) => prev.filter((c) => c.id !== cat.id));
      }
    } catch {
      // Fallback
    } finally {
      setLoadingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-8 sm:p-12 text-center shadow-sm">
        <EmptyState
          title={isTr ? "Henüz Bir Kategori Takip Etmiyorsunuz" : "No Followed Categories Yet"}
          description={
            isTr
              ? "İlgi duyduğunuz teknoloji kategorilerini takip ederek yeni açılan ilanlardan anında haberdar olabilirsiniz."
              : "Follow tech categories to get notified of newly published projects on our radar."
          }
          action={
            <Link href={isTr ? "/tr/kategoriler" : "/en/categories"}>
              <Button variant="primary" size="md" className="gap-2">
                <FolderTree className="h-4 w-4" aria-hidden="true" />
                <span>{isTr ? "Kategorileri İncele & Takip Et" : "Explore Categories"}</span>
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((cat) => (
        <div
          key={cat.id}
          className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-sm hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                {cat.key}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <BookmarkCheck className="h-3 w-3" aria-hidden="true" />
                <span>{isTr ? "Takipte" : "Followed"}</span>
              </span>
            </div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{cat.name}</h3>
            {cat.description && (
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                {cat.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-subtle)]/60">
            <Link
              href={isTr ? `/tr/akis?category=${cat.key}` : `/en/feed?category=${cat.key}`}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1 hover:underline"
            >
              <span>{isTr ? "Projeleri Gör" : "View Projects"}</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggle(cat)}
              disabled={loadingId === cat.id}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-red-400 cursor-pointer h-7 px-2"
            >
              {isTr ? "Takipten Çık" : "Unfollow"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

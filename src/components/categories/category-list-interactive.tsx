"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Plus,
  BookmarkCheck,
  Search,
  X,
  Globe,
  Smartphone,
  Monitor,
  Server,
  Layout,
  Cpu,
  Database,
  Cloud,
  ShieldCheck,
  CheckCircle2,
  Palette,
  Workflow,
  HardDrive,
  Gamepad2,
  Network,
  Wrench,
  Radio,
  Blocks,
  Compass,
  Code2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { SpotlightCard } from "../ui/spotlight-card";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "web-development": Globe,
  "mobile-development": Smartphone,
  "desktop-development": Monitor,
  "backend-api": Server,
  "frontend-ui": Layout,
  "ai-ml": Cpu,
  "data-engineering": Database,
  "devops-cloud": Cloud,
  "cybersecurity": ShieldCheck,
  "qa-testing": CheckCircle2,
  "ui-ux-design": Palette,
  "automation-integrations": Workflow,
  "database": HardDrive,
  "game-development": Gamepad2,
  "it-systems-network": Network,
  "computer-hardware": Wrench,
  "embedded-iot": Radio,
  "blockchain": Blocks,
  "technical-consulting": Compass,
  "other-technology": Code2,
};

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  isFollowed?: boolean;
}

export interface CategoryListInteractiveProps {
  categories: CategoryItem[];
  initialFollowedIds: string[];
  locale: string;
}

export function CategoryListInteractive({
  categories,
  initialFollowedIds,
  locale,
}: CategoryListInteractiveProps) {
  const isTr = locale === "tr";
  const [searchQuery, setSearchQuery] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    new Set(initialFollowedIds)
  );
  const [isLoading, setIsLoading] = useState(false);

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );


  const handleToggle = async (categoryId: string) => {
    const isFollowed = followedIds.has(categoryId);
    const newSet = new Set(followedIds);
    if (isFollowed) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    setFollowedIds(newSet);

    try {
      await fetch("/api/categories/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          action: isFollowed ? "unfollow" : "follow",
        }),
      });
    } catch {
      // Revert on error
      setFollowedIds(followedIds);
    }
  };

  const handleFollowAll = async () => {
    setIsLoading(true);
    const allIds = new Set(categories.map((c) => c.id));
    setFollowedIds(allIds);

    try {
      await fetch("/api/categories/follow-all", { method: "POST" });
    } catch {
      setFollowedIds(followedIds);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollowAll = async () => {
    setIsLoading(true);
    setFollowedIds(new Set());

    try {
      await fetch("/api/categories/unfollow-all", { method: "POST" });
    } catch {
      setFollowedIds(followedIds);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Glass Action Control Panel with Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-5 backdrop-blur-xl shadow-sm">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isTr ? "Kategori ara (örn. Frontend, Yapay Zeka)..." : "Filter categories (e.g. Frontend, Cloud)..."}
            aria-label={isTr ? "Kategori filtrele" : "Filter categories"}
            className="w-full h-10 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border-subtle)] pl-10 pr-9 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-base)] transition-colors"
              aria-label={isTr ? "Aramayı temizle" : "Clear search"}
              title={isTr ? "Aramayı temizle" : "Clear search"}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Status Count & Batch Actions */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3.5">
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <BookmarkCheck className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-bold text-[var(--color-text-primary)]">
                {followedIds.size}
              </strong>{" "}
              {isTr ? "takip ediliyor" : "actively followed"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleFollowAll}
              disabled={isLoading}
            >
              {isTr ? "Tümünü Takip Et" : "Follow All"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnfollowAll}
              disabled={isLoading}
            >
              {isTr ? "Tümünü Bırak" : "Unfollow All"}
            </Button>
          </div>
        </div>
      </div>

      {/* Empty Filter State */}
      {filteredCategories.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/60 p-12 text-center space-y-3 backdrop-blur-xl shadow-sm">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {isTr ? "Aramanızla eşleşen kategori bulunamadı." : "No categories matched your search criteria."}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isTr ? "Farklı bir anahtar kelime deneyebilir veya aramayı temizleyebilirsiniz." : "Try a different query or clear your search."}
          </p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
              {isTr ? "Aramayı Temizle" : "Clear Search"}
            </Button>
          </div>
        </div>
      ) : (
        /* Grid of Dynamic Category Spotlight Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat) => {
            const isFollowed = followedIds.has(cat.id);
            const Icon = CATEGORY_ICONS[cat.slug] || Code2;
            return (
              <SpotlightCard
                key={cat.id}
                className="flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-105 transition-all">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] bg-[var(--color-surface-hover)] px-2 py-0.5 rounded-md">
                      /{cat.slug}
                    </span>
                  </div>

                  <div>
                    <Link
                      href={isTr ? `/tr/akis?category=${cat.slug}` : `/en/feed?category=${cat.slug}`}
                      className="font-bold text-base text-[var(--color-text-primary)] hover:text-blue-400 transition-colors block"
                    >
                      {cat.name}
                    </Link>
                    {cat.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed pt-1.5 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-[var(--color-border-subtle)]/60">
                  <Link
                    href={isTr ? `/tr/akis?category=${cat.slug}` : `/en/feed?category=${cat.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    <span>{isTr ? "Projeleri Gör" : "View Projects"}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>

                  <Button
                    variant={isFollowed ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => handleToggle(cat.id)}
                    className="gap-1.5"
                  >
                    {isFollowed ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                        <span>{isTr ? "Takipte" : "Following"}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{isTr ? "Takip Et" : "Follow"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Filter,
  X,
  ChevronRight,
  Search,
  Sparkles,
  Code2,
  Cpu,
  Cloud,
  Palette,
  Check,
  LayoutGrid,
} from "lucide-react";
import type { CategoryDto } from "@/src/modules/categories/service";

// Grouping the 21 seed categories into 4 coherent technical disciplines
const DISCIPLINE_GROUPS = [
  {
    key: "software",
    icon: Code2,
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    label: { tr: "Yazılım & Uygulama", en: "Software & Applications" },
    slugs: [
      "web-development",
      "mobile-development",
      "desktop-development",
      "backend-api",
      "frontend-ui",
    ],
  },
  {
    key: "data_ai",
    icon: Cpu,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    label: { tr: "Yapay Zeka & Veri", en: "AI & Data Engineering" },
    slugs: ["ai-ml", "data-engineering", "database", "automation-integrations"],
  },
  {
    key: "infra_sec",
    icon: Cloud,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    label: { tr: "Bulut, DevOps & Güvenlik", en: "Cloud, DevOps & Security" },
    slugs: ["devops-cloud", "cybersecurity", "qa-testing", "it-systems-network"],
  },
  {
    key: "design_specialty",
    icon: Palette,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    label: { tr: "Tasarım, Donanım & Niş", en: "Design, Hardware & Niche" },
    slugs: [
      "ui-ux-design",
      "game-development",
      "blockchain",
      "embedded-iot",
      "computer-hardware",
      "technical-consulting",
      "other-technology",
    ],
  },
];

// Top 7 most popular categories for the quick horizontal scroll rail
const FEATURED_RAIL_SLUGS = [
  "web-development",
  "mobile-development",
  "backend-api",
  "frontend-ui",
  "ai-ml",
  "devops-cloud",
  "ui-ux-design",
];

export interface CategoryFilterBarProps {
  categories: CategoryDto[];
  selectedCategory?: string;
  basePath: string;
  searchQuery?: string;
  extraQuery?: Record<string, string>;
  locale: string;
  resultCount?: number;
}

export function CategoryFilterBar({
  categories,
  selectedCategory,
  basePath,
  searchQuery,
  extraQuery = {},
  locale,
  resultCount,
}: CategoryFilterBarProps) {
  const isTr = locale === "tr";
  const [modalOpen, setModalOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper to build URLs preserving extra query params and search query
  const buildHref = (catSlug?: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    Object.entries(extraQuery).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    if (catSlug) {
      params.set("category", catSlug);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const selectedCatObj = useMemo(
    () => categories.find((c) => c.slug === selectedCategory),
    [categories, selectedCategory]
  );

  // Featured categories for the primary horizontal rail
  const railCategories = useMemo(() => {
    return FEATURED_RAIL_SLUGS.map((slug) =>
      categories.find((c) => c.slug === slug)
    ).filter((c): c is CategoryDto => Boolean(c));
  }, [categories]);

  // Categories filtered inside the popover/modal
  const filteredModalCategories = useMemo(() => {
    if (!searchFilter.trim()) return categories;
    const q = searchFilter.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchFilter]);

  // Close modal on Escape or outside click
  useEffect(() => {
    if (!modalOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setModalOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    setTimeout(() => searchInputRef.current?.focus(), 50);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  return (
    <div className="space-y-2.5">
      {/* Top Header Bar: Title, Active Chip & "All Categories" Action */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider text-[11px]">
            <Filter className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            <span>{isTr ? "Kategori Filtresi" : "Category Filter"}</span>
          </div>

          {/* Active Category Chip */}
          {selectedCatObj && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-semibold text-blue-400 animate-in fade-in zoom-in-95 duration-200">
              <span>{selectedCatObj.name}</span>
              <Link
                href={buildHref(undefined)}
                className="rounded-full hover:bg-blue-500/20 p-0.5 text-blue-300 hover:text-white transition-colors"
                aria-label={isTr ? "Filtreyi Kaldır" : "Remove Filter"}
                title={isTr ? "Filtreyi Kaldır" : "Remove Filter"}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
          )}

          {typeof resultCount === "number" && (
            <span className="text-[11px] text-[var(--color-text-tertiary)] hidden sm:inline">
              ({resultCount} {isTr ? "ilan" : "listings"})
            </span>
          )}
        </div>

        {/* Modal / Drawer Trigger */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] hover:border-blue-500/40 hover:text-blue-400 transition-all cursor-pointer shadow-xs"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
          <span>
            {isTr
              ? `Tüm Kategoriler (${categories.length})`
              : `All Categories (${categories.length})`}
          </span>
          <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        </button>
      </div>

      {/* Horizontal Scroll Rail (Single Clean Row) */}
      <div className="relative group">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* "All" button */}
          <Link
            href={buildHref(undefined)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium shrink-0 transition-all cursor-pointer ${
              !selectedCategory
                ? "bg-blue-600 text-white shadow-xs font-semibold"
                : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {isTr ? "Tüm Alanlar" : "All Fields"}
          </Link>

          {/* Featured Top Categories */}
          {railCategories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <Link
                key={cat.id}
                href={buildHref(cat.slug)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {cat.name}
              </Link>
            );
          })}

          {/* "More..." button on rail */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-base)]/40 px-3 py-1.5 text-xs font-medium text-blue-400 hover:border-blue-500 hover:bg-blue-500/10 shrink-0 transition-all cursor-pointer inline-flex items-center gap-1"
          >
            <span>+{categories.length - railCategories.length} {isTr ? "daha..." : "more..."}</span>
          </button>
        </div>
      </div>

      {/* Categorized Popover / Modal with Live Search */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] p-5 pb-4">
              <div className="space-y-0.5">
                <h2
                  id="category-modal-title"
                  className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  <span>{isTr ? "Tüm Teknoloji Kategorileri" : "All Tech Categories"}</span>
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {isTr
                    ? "İhtiyacınıza uygun uzmanlık disiplinini seçin."
                    : "Select a specialized discipline to filter projects."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                aria-label={isTr ? "Kapat" : "Close"}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Live Search Input */}
            <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)]/30">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={
                    isTr
                      ? "Kategori adı veya anahtar kelime yazın..."
                      : "Search by category name or keyword..."
                  }
                  className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] pl-10 pr-9 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-blue-500 focus:outline-none transition-all"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Grouped Categories */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {searchFilter.trim() ? (
                /* Search Results Flat Grid */
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
                    {isTr
                      ? `${filteredModalCategories.length} sonuç bulundu`
                      : `${filteredModalCategories.length} results found`}
                  </div>
                  {filteredModalCategories.length === 0 ? (
                    <div className="p-8 text-center text-[var(--color-text-secondary)]">
                      {isTr
                        ? "Aramanızla eşleşen kategori bulunamadı."
                        : "No matching categories found."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {filteredModalCategories.map((cat) => {
                        const isSelected = selectedCategory === cat.slug;
                        return (
                          <Link
                            key={cat.id}
                            href={buildHref(cat.slug)}
                            onClick={() => setModalOpen(false)}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? "border-blue-500/60 bg-blue-500/10 text-blue-400 font-semibold shadow-xs"
                                : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 hover:border-blue-500/30 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                            }`}
                          >
                            <div className="space-y-0.5 pr-2">
                              <div className="font-semibold text-xs">{cat.name}</div>
                              {cat.description && (
                                <div className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1">
                                  {cat.description}
                                </div>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-blue-400 shrink-0" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* 4 Structured Discipline Groups */
                DISCIPLINE_GROUPS.map((group) => {
                  const Icon = group.icon;
                  const groupCats = group.slugs
                    .map((slug) => categories.find((c) => c.slug === slug))
                    .filter((c): c is CategoryDto => Boolean(c));

                  return (
                    <div key={group.key} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-lg border ${group.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </div>
                        <h3 className="font-bold text-xs text-[var(--color-text-primary)] uppercase tracking-wider">
                          {isTr ? group.label.tr : group.label.en}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groupCats.map((cat) => {
                          const isSelected = selectedCategory === cat.slug;
                          return (
                            <Link
                              key={cat.id}
                              href={buildHref(cat.slug)}
                              onClick={() => setModalOpen(false)}
                              className={`flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "border-blue-500/60 bg-blue-500/10 text-blue-400 font-semibold shadow-xs"
                                  : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/70 hover:border-blue-500/30 hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]"
                              }`}
                            >
                              <div className="truncate pr-2">
                                <span className="font-medium text-xs">{cat.name}</span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer: Reset & Close */}
            <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] p-4 bg-[var(--color-surface-hover)]/40 text-xs">
              <Link
                href={buildHref(undefined)}
                onClick={() => setModalOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-red-400 transition-colors"
              >
                {isTr ? "Filtreyi Sıfırla (Tümü)" : "Reset Filter (All)"}
              </Link>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-500 transition-all cursor-pointer"
              >
                {isTr ? "Kapat" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

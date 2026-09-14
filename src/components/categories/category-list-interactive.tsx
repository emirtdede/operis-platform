"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Plus,
  BookmarkCheck,
  Search,
  X,
  ChevronDown,
  Filter,
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
  TrendingUp,
  Video,
  PenTool,
  Briefcase,
  Scale,
  Box,
  Headphones,
  Bot,
  Sparkles,
  BarChart3,
  Layers,
  Share2,
  Feather,
  Package,
  Presentation,
  Megaphone,
  Mail,
  ShoppingBag,
  Film,
  Clapperboard,
  Mic,
  FileCode,
  FileText,
  FileSignature,
  Building,
  Home,
  CheckSquare,
  Coins,
  Calculator,
  Receipt,
  LogIn,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { SpotlightCard } from "../ui/spotlight-card";
import { SEED_SECTORS } from "@/db/seeds/categories";

const SECTOR_ICONS: Record<string, LucideIcon> = {
  "sector-software-it": Code2,
  "sector-ai-data": Cpu,
  "sector-design-creative": Palette,
  "sector-marketing-growth": TrendingUp,
  "sector-video-audio": Video,
  "sector-writing-translation": PenTool,
  "sector-business-finance": Briefcase,
  "sector-legal-compliance": Scale,
  "sector-engineering-3d": Box,
  "sector-operations-support": Headphones,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Sektör 1: Yazılım & BT
  "web-development": Globe,
  "frontend-ui": Layout,
  "backend-api": Server,
  "mobile-development": Smartphone,
  "desktop-development": Monitor,
  "devops-cloud": Cloud,
  database: HardDrive,
  cybersecurity: ShieldCheck,
  "qa-testing": CheckCircle2,
  blockchain: Blocks,
  "embedded-iot": Radio,
  "it-systems-network": Network,
  "computer-hardware": Wrench,
  "other-technology": Code2,

  // Sektör 2: AI & Veri
  "ai-ml": Cpu,
  "data-engineering": Database,
  "automation-integrations": Workflow,
  "ai-agents-workflows": Bot,
  "prompt-engineering": Sparkles,
  "business-intelligence": BarChart3,

  // Sektör 3: Tasarım
  "ui-ux-design": Palette,
  "brand-identity-logo": Feather,
  "design-systems": Layers,
  "social-media-design": Share2,
  "illustration-vector": Palette,
  "print-packaging-design": Package,
  "presentation-deck-design": Presentation,

  // Sektör 4: Pazarlama & Büyüme
  "search-engine-optimization": TrendingUp,
  "paid-search-sem": Megaphone,
  "paid-social-meta": Share2,
  "social-media-management": Megaphone,
  "email-marketing-automation": Mail,
  "ecommerce-growth-store": ShoppingBag,

  // Sektör 5: Video & Ses
  "short-form-video": Film,
  "long-form-youtube": Video,
  "motion-graphics-2d-3d": Clapperboard,
  "voice-over-dubbing": Mic,
  "podcast-audio-editing": Mic,

  // Sektör 6: Yazı & Çeviri
  "technical-writing": FileCode,
  "copywriting-sales": FileText,
  "seo-blog-writing": PenTool,
  "translation-localization": Globe,
  "proofreading-editing": CheckSquare,

  // Sektör 7: Finans & Danışmanlık
  "technical-consulting": Compass,
  "financial-modeling": Calculator,
  "accounting-bookkeeping": Receipt,
  "tax-consulting": Coins,
  "startup-strategy-bizdev": Briefcase,
  "project-management-agile": Workflow,

  // Sektör 8: Hukuk & Mevzuat
  "contract-drafting-review": FileSignature,
  "kvkk-gdpr-privacy": ShieldCheck,
  "trademark-ip-patent": Scale,
  "ecommerce-consumer-law": ShoppingBag,

  // Sektör 9: Mühendislik & 3D
  "game-development": Gamepad2,
  "architectural-design-bim": Building,
  "interior-design-rendering": Home,
  "3d-product-modeling": Box,

  // Sektör 10: Operasyon & Destek
  "executive-virtual-assistant": Headphones,
  "customer-support-crm": Headphones,
  "data-entry-web-research": Search,

  // Granular Alt Kategoriler
  "fullstack-development": Code2,
  "ecommerce-development": ShoppingBag,
  "cms-nocode-development": Layout,
  "api-microservices": Server,
  "penetration-testing-security": ShieldCheck,
  "cloud-infrastructure-aws-gcp": Cloud,
  "llm-app-development": Bot,
  "computer-vision-ai": Cpu,
  "nlp-speech-voice": Mic,
  "data-scraping-extraction": HardDrive,
  "web-ui-design": Layout,
  "mobile-app-ui-ux": Smartphone,
  "icon-typography-design": PenTool,
  "character-concept-art": Palette,
  "technical-seo-audit": Search,
  "tiktok-video-ads": Film,
  "b2b-growth-linkedin": TrendingUp,
  "content-marketing-strategy": Feather,
  "video-color-grading": Clapperboard,
  "product-3d-animation": Box,
  "subtitles-transcription": FileText,
  "sound-design-sfx": Headphones,
  "software-i18n-localization": Globe,
  "academic-medical-translation": FileCode,
  "whitepaper-ebook-writing": FileText,
  "ghostwriting-thought-leadership": PenTool,
  "market-research-analysis": BarChart3,
  "pitch-deck-financials": Presentation,
  "operations-process-optimization": Workflow,
  "freelance-client-agreements": FileSignature,
  "nda-confidentiality-drafting": ShieldCheck,
  "terms-privacy-saas": FileCode,
  "unity-game-development": Gamepad2,
  "unreal-engine-development": Gamepad2,
  "mobile-casual-game-dev": Smartphone,
  "game-2d-pixel-art": Palette,
  "game-3d-assets-characters": Box,
  "game-level-mechanics-design": Compass,
  "game-audio-music": Headphones,
  "architectural-exterior-rendering": Building,
  "3d-printing-stl-modeling": Box,
  "ecommerce-store-operations": ShoppingBag,
  "lead-data-enrichment": Search,
  "transcription-audio-to-text": Mic,
};

export interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  sectorKey?: string;
  description?: string | null;
  isFollowed?: boolean;
}

export interface CategoryListInteractiveProps {
  categories: CategoryItem[];
  initialFollowedIds: string[];
  locale: string;
  hasSession?: boolean;
  initialSector?: string;
}

export function CategoryListInteractive({
  categories,
  initialFollowedIds,
  locale,
  hasSession = false,
  initialSector = "all",
}: CategoryListInteractiveProps) {
  const isTr = locale === "tr";
  const [selectedSector, setSelectedSector] = useState<string>(initialSector);
  const [searchQuery, setSearchQuery] = useState("");
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set(initialFollowedIds));
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthNotice, setShowAuthNotice] = useState(false);

  const filteredCategories = categories.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      c.slug.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    const matchesSector = selectedSector === "all" || c.sectorKey === selectedSector;
    return matchesSearch && matchesSector;
  });

  const loginUrl = `${isTr ? "/tr/giris" : "/en/login"}?returnUrl=${encodeURIComponent(isTr ? "/tr/kategoriler" : "/en/categories")}`;

  const handleToggle = async (categoryId: string) => {
    if (!hasSession) {
      setShowAuthNotice(true);
      return;
    }

    const isFollowed = followedIds.has(categoryId);
    const newSet = new Set(followedIds);
    if (isFollowed) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    setFollowedIds(newSet);

    try {
      const res = await fetch("/api/categories/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          action: isFollowed ? "unfollow" : "follow",
        }),
      });
      if (!res.ok) {
        setFollowedIds(followedIds);
        if (res.status === 401) {
          setShowAuthNotice(true);
        }
      }
    } catch {
      // Revert on error
      setFollowedIds(followedIds);
    }
  };

  const handleFollowAll = async () => {
    if (!hasSession) {
      setShowAuthNotice(true);
      return;
    }

    setIsLoading(true);
    const allIds = new Set(categories.map((c) => c.id));
    setFollowedIds(allIds);

    try {
      const res = await fetch("/api/categories/follow-all", { method: "POST" });
      if (!res.ok) {
        setFollowedIds(followedIds);
        if (res.status === 401) {
          setShowAuthNotice(true);
        }
      }
    } catch {
      setFollowedIds(followedIds);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollowAll = async () => {
    if (!hasSession) {
      setShowAuthNotice(true);
      return;
    }

    setIsLoading(true);
    setFollowedIds(new Set());

    try {
      const res = await fetch("/api/categories/unfollow-all", { method: "POST" });
      if (!res.ok) {
        setFollowedIds(followedIds);
        if (res.status === 401) {
          setShowAuthNotice(true);
        }
      }
    } catch {
      setFollowedIds(followedIds);
    } finally {
      setIsLoading(false);
    }
  };

  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const [sectorSearchQuery, setSectorSearchQuery] = useState("");
  const sectorDropdownRef = useRef<HTMLDivElement>(null);
  const sectorInputRef = useRef<HTMLInputElement>(null);

  // Close sector dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target as Node)) {
        setIsSectorDropdownOpen(false);
      }
    }
    if (isSectorDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSectorDropdownOpen]);

  // Close sector dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsSectorDropdownOpen(false);
      }
    }
    if (isSectorDropdownOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSectorDropdownOpen]);

  const selectedSectorObj = useMemo(() => {
    if (selectedSector === "all") return null;
    return SEED_SECTORS.find((s) => s.key === selectedSector) || null;
  }, [selectedSector]);

  const currentSectorLabel = selectedSectorObj
    ? isTr
      ? selectedSectorObj.translations.tr.name
      : selectedSectorObj.translations.en.name
    : isTr
      ? "Tüm Sektörler"
      : "All Sectors";

  const currentSectorCount =
    selectedSector === "all"
      ? categories.length
      : categories.filter((c) => c.sectorKey === selectedSector).length;

  const ActiveSectorIcon = selectedSectorObj
    ? SECTOR_ICONS[selectedSectorObj.key] || Briefcase
    : Layers;

  const sectorOptions = useMemo(() => {
    const list = [
      {
        key: "all",
        name: isTr ? "Tüm Sektörler" : "All Sectors",
        count: categories.length,
        icon: Layers,
        subText: isTr
          ? "Tüm resmi sektörler ve 104 uzmanlık"
          : "All 10 sectors & 104 specializations",
        allKeywords: "all tüm hepsi",
      },
      ...SEED_SECTORS.map((sec) => {
        const name = isTr ? sec.translations.tr.name : sec.translations.en.name;
        const subCats = categories.filter((c) => c.sectorKey === sec.key);
        const subText = subCats
          .slice(0, 3)
          .map((c) => c.name)
          .join(", ");
        const allKeywords =
          `${name} ${subCats.map((c) => `${c.name} ${c.slug}`).join(" ")}`.toLowerCase();

        return {
          key: sec.key,
          name,
          count: subCats.length,
          icon: SECTOR_ICONS[sec.key] || Briefcase,
          subText,
          allKeywords,
        };
      }),
    ];

    const q = sectorSearchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter((item) => item.allKeywords.includes(q));
  }, [categories, isTr, sectorSearchQuery]);

  return (
    <div className="space-y-8">
      {/* Top Glass Action Control Panel with Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/80 p-5 backdrop-blur-xl shadow-sm">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isTr
                ? "Kategori ara (örn. Frontend, Unity, Yapay Zeka)..."
                : "Filter categories (e.g. Frontend, Unity, Cloud)..."
            }
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
            <Button variant="secondary" size="sm" onClick={handleFollowAll} disabled={isLoading}>
              {isTr ? "Tümünü Takip Et" : "Follow All"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleUnfollowAll} disabled={isLoading}>
              {isTr ? "Tümünü Bırak" : "Unfollow All"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Searchable Sector Dropdown Combobox Menu (Replaces horizontal pill scrollbar) */}
      <div
        className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/50 backdrop-blur-md transition-all ${
          isSectorDropdownOpen ? "z-50 ring-1 ring-blue-500/20" : "z-20"
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            <span>{isTr ? "Sektör:" : "Sector:"}</span>
          </span>

          {/* Interactive Combobox Trigger Button */}
          <div className="relative z-50 w-full sm:w-80 md:w-96" ref={sectorDropdownRef}>
            <div
              className={`w-full h-11 px-3.5 rounded-2xl bg-[var(--color-surface-hover)] border transition-all flex items-center gap-2.5 shadow-xs ${
                isSectorDropdownOpen
                  ? "border-blue-500 ring-2 ring-blue-500/20 bg-[var(--color-surface-base)]"
                  : "border-[var(--color-border-subtle)] hover:border-blue-500/40"
              }`}
            >
              <div className="h-7 w-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <ActiveSectorIcon className="h-4 w-4" aria-hidden="true" />
              </div>

              <input
                type="text"
                ref={sectorInputRef}
                value={isSectorDropdownOpen ? sectorSearchQuery : currentSectorLabel}
                onChange={(e) => {
                  setSectorSearchQuery(e.target.value);
                  if (!isSectorDropdownOpen) setIsSectorDropdownOpen(true);
                }}
                onFocus={() => {
                  setIsSectorDropdownOpen(true);
                }}
                placeholder={isTr ? "Sektör ara veya yazın..." : "Search or type sector..."}
                aria-label={isTr ? "Sektör filtresi" : "Sector filter"}
                className="flex-1 min-w-0 bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none font-medium truncate"
              />

              {isSectorDropdownOpen && sectorSearchQuery ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSectorSearchQuery("");
                  }}
                  className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-base)]"
                  aria-label={isTr ? "Temizle" : "Clear"}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[var(--color-surface-base)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] shrink-0">
                  {currentSectorCount}
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsSectorDropdownOpen((prev) => !prev);
                  if (!isSectorDropdownOpen) {
                    setTimeout(() => sectorInputRef.current?.focus(), 50);
                  }
                }}
                className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                aria-label={isTr ? "Menüyü Aç" : "Toggle Menu"}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isSectorDropdownOpen ? "rotate-180 text-blue-400" : ""
                  }`}
                />
              </button>
            </div>

            {/* Dropdown Menu (Shows 10 items in viewport, scrollable) */}
            {isSectorDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full min-w-[320px] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/98 backdrop-blur-2xl shadow-2xl p-1.5 z-[100] animate-in fade-in zoom-in-95 duration-150">
                <div className="max-h-[415px] overflow-y-auto space-y-1 p-0.5 scrollbar-thin">
                  {sectorOptions.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <p className="text-xs text-[var(--color-text-tertiary)]">
                        {isTr
                          ? "Aramanızla eşleşen sektör bulunamadı."
                          : "No matching sector found."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSectorSearchQuery("")}
                        className="text-xs text-blue-400 hover:underline cursor-pointer"
                      >
                        {isTr ? "Aramayı temizle" : "Clear search"}
                      </button>
                    </div>
                  ) : (
                    sectorOptions.map((item) => {
                      const Icon = item.icon;
                      const isSelected = selectedSector === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setSelectedSector(item.key);
                            setIsSectorDropdownOpen(false);
                            setSectorSearchQuery("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                            isSelected
                              ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold"
                              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div
                              className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{item.name}</p>
                              {item.subText && (
                                <p className="text-[10px] text-[var(--color-text-tertiary)] truncate opacity-80">
                                  {item.subText}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                isSelected
                                  ? "bg-blue-500/20 text-blue-300"
                                  : "bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]"
                              }`}
                            >
                              {item.count}
                            </span>
                            {isSelected && (
                              <Check className="h-4 w-4 text-blue-400" aria-hidden="true" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Sector Reset Chip */}
          {selectedSector !== "all" && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-in fade-in zoom-in-95">
              <span>{currentSectorLabel}</span>
              <button
                type="button"
                onClick={() => setSelectedSector("all")}
                className="p-0.5 rounded-full hover:bg-blue-500/20 text-blue-300 hover:text-white transition-colors cursor-pointer"
                aria-label={isTr ? "Sektör filtresini kaldır" : "Remove sector filter"}
                title={isTr ? "Sektör filtresini kaldır" : "Remove sector filter"}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Counter readout */}
        <div className="text-xs text-[var(--color-text-tertiary)] shrink-0 self-end sm:self-center">
          <span className="font-bold text-[var(--color-text-primary)]">
            {filteredCategories.length}
          </span>{" "}
          {isTr ? "uzmanlık listeleniyor" : "specializations listed"}
        </div>
      </div>

      {/* Empty Filter State */}
      {filteredCategories.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)]/60 p-12 text-center space-y-3 backdrop-blur-xl shadow-sm">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {isTr
              ? "Aramanızla eşleşen kategori bulunamadı."
              : "No categories matched your search criteria."}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isTr
              ? "Farklı bir anahtar kelime deneyebilir veya aramayı temizleyebilirsiniz."
              : "Try a different query or clear your search."}
          </p>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
              {isTr ? "Aramayı Temizle" : "Clear Search"}
            </Button>
          </div>
        </div>
      ) : (
        /* Grid of Dynamic Category Spotlight Cards */
        <div className="relative z-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((cat) => {
            const isFollowed = followedIds.has(cat.id);
            const Icon = CATEGORY_ICONS[cat.slug] || Code2;
            return (
              <SpotlightCard
                key={cat.id}
                className="h-full p-6 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-105 transition-all shrink-0">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-[11px] text-[var(--color-text-tertiary)] bg-[var(--color-surface-hover)] px-2 py-0.5 rounded-md shrink-0">
                      /{cat.slug}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1">
                    <div className="min-h-[2.75rem] flex items-center">
                      <Link
                        href={
                          isTr ? `/tr/akis?category=${cat.slug}` : `/en/feed?category=${cat.slug}`
                        }
                        className="font-bold text-base text-[var(--color-text-primary)] hover:text-blue-400 transition-colors line-clamp-2 leading-snug"
                        title={cat.name}
                      >
                        {cat.name}
                      </Link>
                    </div>
                    <div className="pt-1.5 min-h-[2.5rem] flex items-start">
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                        {cat.description || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-[var(--color-border-subtle)]/60 shrink-0">
                  <Link
                    href={isTr ? `/tr/akis?category=${cat.slug}` : `/en/feed?category=${cat.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    <span>{isTr ? "Projeler" : "Projects"}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>

                  <Button
                    variant={isFollowed ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => handleToggle(cat.id)}
                    className="gap-1.5 shrink-0"
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

      {/* Floating Auth Notification for Guests */}
      {showAuthNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] p-4 rounded-2xl bg-[var(--color-surface-base)]/95 backdrop-blur-xl border border-blue-500/40 shadow-2xl shadow-blue-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <LogIn className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                {isTr ? "Giriş Yapmanız Gerekiyor" : "Authentication Required"}
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
                {isTr
                  ? "Kategorileri takip etmek ve özel akış oluşturmak için lütfen giriş yapın."
                  : "Please sign in to follow categories and personalize your project feed."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Link
              href={loginUrl}
              className="inline-flex items-center justify-center h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isTr ? "Giriş Yap" : "Sign In"}
            </Link>
            <button
              type="button"
              onClick={() => setShowAuthNotice(false)}
              className="h-8 w-8 rounded-xl flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              aria-label={isTr ? "Kapat" : "Dismiss"}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
